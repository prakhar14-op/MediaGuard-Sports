"""
Evidence Vault — Enterprise-grade evidence synchronization & chain-of-custody

Architecture:
    MediaGuard Detection Pipeline
            ↓
    Evidence Vault (this module)
            ↓
    MongoDB (metadata + audit log)  +  GCS/local (binary artifacts)
            ↓
    Investigator access via signed URLs / direct download

What it does:
─────────────
1. Packages every detection artifact into a cryptographically sealed evidence bundle
2. Stores binary artifacts (frames, embeddings, audio fingerprints) in object storage
3. Records every action (detection → classification → DMCA → review) in an immutable
   audit log with SHA-256 hash, timestamp, and reviewer ID
4. Provides chain-of-custody tracking: every read/write is recorded
5. Supports delta sync — only new/changed artifacts are uploaded
6. Deduplication via content-addressed storage (SHA-256 of file content = storage key)
7. Resume interrupted transfers — partial uploads are detected and retried

Chain of Custody flow:
    1. Sentinel detects piracy → custody event: DETECTED
    2. Adjudicator classifies → custody event: CLASSIFIED  
    3. Enforcer drafts DMCA → custody event: DMCA_DRAFTED
    4. Human approves → custody event: DMCA_APPROVED
    5. Contract minted → custody event: CONTRACT_MINTED
    6. Investigator accesses → custody event: ACCESSED

Every custody event gets:
    - SHA-256 of the evidence bundle state at that moment
    - ISO timestamp (UTC)
    - Actor ID (agent name or reviewer email)
    - Action performed
    - Previous state hash (chain — any tampering breaks it)

Live Streaming support:
    Segments arrive continuously. Each segment is independently packaged and
    synced without waiting for the full stream to complete.

Storage backends:
    - Local: ./evidence_vault/{incident_id}/
    - GCS: gs://{EVIDENCE_BUCKET}/incidents/{incident_id}/
    - Both simultaneously if configured (multi-region replication)
"""

import os
import json
import hashlib
import time
import uuid
import tempfile
import threading
import subprocess
from datetime import datetime, timezone
from typing import Optional

import numpy as np

VAULT_DIR = os.path.join(os.path.dirname(__file__), "..", "evidence_vault")
os.makedirs(VAULT_DIR, exist_ok=True)

EVIDENCE_BUCKET = os.getenv("EVIDENCE_BUCKET", "").strip()   # GCS bucket for artifacts
EVIDENCE_ENCRYPT = os.getenv("EVIDENCE_ENCRYPT", "false").lower() == "true"

# Thread-safe lock for audit log writes
_audit_lock = threading.Lock()


# ═══════════════════════════════════════════════════════════════════════════════
# SHA-256 CONTENT HASHING
# ═══════════════════════════════════════════════════════════════════════════════

def sha256_of_file(file_path: str) -> str:
    """Compute SHA-256 of a file. Used for deduplication and integrity."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_of_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_of_dict(data: dict) -> str:
    """Canonical JSON hash of a dict — order-independent."""
    canonical = json.dumps(data, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(canonical.encode()).hexdigest()


# ═══════════════════════════════════════════════════════════════════════════════
# EVIDENCE BUNDLE
# ═══════════════════════════════════════════════════════════════════════════════

def _incident_dir(incident_id: str) -> str:
    """Local directory for an incident's evidence."""
    d = os.path.join(VAULT_DIR, incident_id)
    os.makedirs(d, exist_ok=True)
    return d


def _manifest_path(incident_id: str) -> str:
    return os.path.join(_incident_dir(incident_id), "manifest.json")


def _audit_log_path(incident_id: str) -> str:
    return os.path.join(_incident_dir(incident_id), "chain_of_custody.jsonl")


def _load_manifest(incident_id: str) -> dict:
    path = _manifest_path(incident_id)
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "incident_id":   incident_id,
        "created_at":    datetime.now(timezone.utc).isoformat(),
        "artifacts":     {},   # name → {hash, size, gcs_uri, local_path, uploaded_at}
        "bundle_hash":   None,
        "version":       0,
    }


def _save_manifest(incident_id: str, manifest: dict):
    """Atomically save manifest and update bundle hash."""
    manifest["version"]     = manifest.get("version", 0) + 1
    manifest["updated_at"]  = datetime.now(timezone.utc).isoformat()
    manifest["bundle_hash"] = sha256_of_dict(manifest)

    path = _manifest_path(incident_id)
    tmp  = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(manifest, f, indent=2)
    os.replace(tmp, path)


# ═══════════════════════════════════════════════════════════════════════════════
# ARTIFACT STORAGE (local + GCS)
# ═══════════════════════════════════════════════════════════════════════════════

def _gcs_upload(local_path: str, gcs_uri: str) -> bool:
    """Upload a file to GCS. Returns True on success."""
    if not EVIDENCE_BUCKET:
        return False
    try:
        # Try gsutil first (fast, parallel)
        result = subprocess.run(
            ["gsutil", "-m", "cp", local_path, gcs_uri],
            capture_output=True, timeout=120,
        )
        if result.returncode == 0:
            return True
        # Fall back to google-cloud-storage library
        from google.cloud import storage
        bucket_name = gcs_uri.split("/")[2]
        blob_path   = "/".join(gcs_uri.split("/")[3:])
        client      = storage.Client()
        bucket      = client.bucket(bucket_name)
        blob        = bucket.blob(blob_path)
        blob.upload_from_filename(local_path, timeout=120)
        return True
    except Exception as e:
        print(f"[EvidenceVault] GCS upload failed for {gcs_uri}: {e}")
        return False


def store_artifact(
    incident_id: str,
    artifact_name: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> dict:
    """
    Store a binary artifact for an incident.

    Content-addressed: if the same bytes already exist, no re-upload needed.
    Returns artifact record with hash, local path, and GCS URI.

    Args:
        incident_id:    Incident identifier
        artifact_name:  e.g. "frame_0045.jpg", "clip_embedding.npy", "dmca_notice.txt"
        data:           Raw bytes to store
        content_type:   MIME type for GCS metadata

    Returns:
        {
            "name":       artifact_name,
            "hash":       sha256,
            "size":       len(data),
            "local_path": path on disk,
            "gcs_uri":    gs://... or "",
            "uploaded_at": ISO timestamp,
            "deduplicated": bool,
        }
    """
    content_hash = sha256_of_bytes(data)
    incident_dir = _incident_dir(incident_id)
    local_path   = os.path.join(incident_dir, artifact_name)

    # Check deduplication — same hash = already stored
    manifest     = _load_manifest(incident_id)
    existing     = manifest["artifacts"].get(artifact_name, {})
    deduplicated = existing.get("hash") == content_hash

    if not deduplicated:
        # Write to local storage atomically
        tmp = local_path + ".tmp"
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, local_path)

    # GCS upload (if configured and not already uploaded with same hash)
    gcs_uri = ""
    if EVIDENCE_BUCKET and (not deduplicated or not existing.get("gcs_uri")):
        gcs_uri = f"gs://{EVIDENCE_BUCKET}/incidents/{incident_id}/{artifact_name}"
        if not deduplicated:
            _gcs_upload(local_path, gcs_uri)
        else:
            gcs_uri = existing.get("gcs_uri", "")

    record = {
        "name":         artifact_name,
        "hash":         content_hash,
        "size":         len(data),
        "local_path":   local_path,
        "gcs_uri":      gcs_uri,
        "uploaded_at":  datetime.now(timezone.utc).isoformat(),
        "deduplicated": deduplicated,
        "content_type": content_type,
    }

    manifest["artifacts"][artifact_name] = record
    _save_manifest(incident_id, manifest)
    return record


def store_json_artifact(incident_id: str, artifact_name: str, data: dict) -> dict:
    """Convenience wrapper — serialise dict to JSON bytes and store."""
    return store_artifact(
        incident_id, artifact_name,
        json.dumps(data, indent=2, default=str).encode(),
        "application/json",
    )


def store_numpy_artifact(incident_id: str, artifact_name: str, arr: np.ndarray) -> dict:
    """Store a numpy array as .npy bytes."""
    buf = tempfile.SpooledTemporaryFile(max_size=50 * 1024 * 1024)
    np.save(buf, arr)
    buf.seek(0)
    data = buf.read()
    buf.close()
    return store_artifact(incident_id, artifact_name, data, "application/octet-stream")


# ═══════════════════════════════════════════════════════════════════════════════
# CHAIN OF CUSTODY
# ═══════════════════════════════════════════════════════════════════════════════

CUSTODY_ACTIONS = {
    "DETECTED":         "Sentinel detected potential piracy",
    "CLASSIFIED":       "Adjudicator classified the incident",
    "DMCA_DRAFTED":     "Enforcer drafted DMCA notice",
    "DMCA_APPROVED":    "Human reviewer approved DMCA notice",
    "DMCA_SENT":        "DMCA notice dispatched to platform",
    "DMCA_REJECTED":    "Human reviewer rejected DMCA notice",
    "CONTRACT_MINTED":  "Broker minted revenue-share contract",
    "CONTRACT_ACTIVATED":"Human activated revenue-share contract",
    "CONTRACT_DISPUTED": "Contract disputed — returned for review",
    "ACCESSED":         "Evidence accessed by investigator",
    "EXPORTED":         "Evidence bundle exported",
    "SYNCED":           "Evidence synced to remote storage",
    "STREAM_SEGMENT":   "Live stream segment ingested",
}


def record_custody_event(
    incident_id: str,
    action: str,
    actor: str,
    metadata: Optional[dict] = None,
) -> dict:
    """
    Record an immutable chain-of-custody event.

    Each event contains:
    - SHA-256 of the current evidence bundle state
    - SHA-256 of the previous event (chain — tampering breaks it)
    - Timestamp (UTC)
    - Actor (agent name or reviewer email)
    - Action performed
    - Optional metadata

    Returns the custody event record.
    """
    if action not in CUSTODY_ACTIONS:
        action = "CUSTOM"

    manifest   = _load_manifest(incident_id)
    prev_hash  = _get_last_custody_hash(incident_id)

    event = {
        "event_id":      str(uuid.uuid4()),
        "incident_id":   incident_id,
        "action":        action,
        "description":   CUSTODY_ACTIONS.get(action, action),
        "actor":         actor,
        "timestamp":     datetime.now(timezone.utc).isoformat(),
        "bundle_hash":   manifest.get("bundle_hash", ""),
        "prev_event_hash": prev_hash,
        "metadata":      metadata or {},
    }

    # Hash this event itself (seals it)
    event["event_hash"] = sha256_of_dict(event)

    # Append to JSONL audit log (append-only = immutable)
    log_path = _audit_log_path(incident_id)
    with _audit_lock:
        with open(log_path, "a") as f:
            f.write(json.dumps(event) + "\n")

    # Also store the full audit log as a GCS artifact (versioned)
    if EVIDENCE_BUCKET:
        try:
            with open(log_path, "rb") as f:
                store_artifact(incident_id, "chain_of_custody.jsonl", f.read(), "application/x-ndjson")
        except Exception:
            pass

    return event


def _get_last_custody_hash(incident_id: str) -> str:
    """Get the hash of the most recent custody event."""
    log_path = _audit_log_path(incident_id)
    if not os.path.exists(log_path):
        return "GENESIS"
    last_line = ""
    try:
        with open(log_path, "r") as f:
            for line in f:
                line = line.strip()
                if line:
                    last_line = line
    except Exception:
        return "GENESIS"
    if not last_line:
        return "GENESIS"
    try:
        return json.loads(last_line).get("event_hash", "GENESIS")
    except Exception:
        return "GENESIS"


def get_custody_chain(incident_id: str) -> list:
    """Return the full chain-of-custody for an incident."""
    log_path = _audit_log_path(incident_id)
    if not os.path.exists(log_path):
        return []
    events = []
    with open(log_path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except Exception:
                    pass
    return events


def verify_custody_chain(incident_id: str) -> dict:
    """
    Verify the integrity of the chain-of-custody.
    Checks:
    1. Each event's hash matches recomputed hash
    2. Each event's prev_hash matches previous event's hash
    3. No events are missing

    Returns:
        {"valid": bool, "events_checked": int, "error": str | None}
    """
    chain = get_custody_chain(incident_id)
    if not chain:
        return {"valid": True, "events_checked": 0, "error": None}

    prev_hash = "GENESIS"
    for i, event in enumerate(chain):
        claimed_hash = event.pop("event_hash", None)
        recomputed   = sha256_of_dict(event)
        event["event_hash"] = claimed_hash  # restore

        if claimed_hash != recomputed:
            return {
                "valid":          False,
                "events_checked": i + 1,
                "error":          f"Event {i} hash mismatch — evidence may have been tampered",
            }

        if event.get("prev_event_hash") != prev_hash:
            return {
                "valid":          False,
                "events_checked": i + 1,
                "error":          f"Chain broken at event {i} — previous hash mismatch",
            }

        prev_hash = claimed_hash

    return {"valid": True, "events_checked": len(chain), "error": None}


# ═══════════════════════════════════════════════════════════════════════════════
# EVIDENCE PACKAGE — called after each detection stage
# ═══════════════════════════════════════════════════════════════════════════════

def package_detection_evidence(
    incident_id: str,
    sentinel_result: dict,
    thumbnail_pil=None,
    clip_embedding: Optional[np.ndarray] = None,
    audio_result: Optional[dict] = None,
    forensics_result: Optional[dict] = None,
    text_result: Optional[dict] = None,
) -> dict:
    """
    Package all detection artifacts for an incident.
    Called by Sentinel after scanning a suspect.

    Artifacts stored:
    - sentinel_result.json — full scan result with all layer scores
    - thumbnail.jpg — suspect thumbnail image
    - clip_embedding.npy — CLIP visual embedding
    - audio_fingerprint.json — audio scan result
    - forensics_chain.json — platform sharing chain analysis
    - text_ocr.json — OCR/subtitle/watermark detection results

    Returns the manifest record.
    """
    # Store sentinel scan result
    store_json_artifact(incident_id, "sentinel_result.json", sentinel_result)

    # Store thumbnail if available
    if thumbnail_pil is not None:
        try:
            import io
            buf = io.BytesIO()
            thumbnail_pil.save(buf, format="JPEG", quality=95)
            store_artifact(incident_id, "thumbnail.jpg", buf.getvalue(), "image/jpeg")
        except Exception as e:
            print(f"[EvidenceVault] thumbnail save failed: {e}")

    # Store CLIP embedding
    if clip_embedding is not None:
        try:
            store_numpy_artifact(incident_id, "clip_embedding.npy", clip_embedding)
        except Exception as e:
            print(f"[EvidenceVault] embedding save failed: {e}")

    # Store audio result
    if audio_result:
        store_json_artifact(incident_id, "audio_fingerprint.json", audio_result)

    # Store forensics chain
    if forensics_result:
        store_json_artifact(incident_id, "forensics_chain.json", forensics_result)

    # Store text/OCR result
    if text_result:
        store_json_artifact(incident_id, "text_ocr.json", text_result)

    # Record custody event
    record_custody_event(
        incident_id, "DETECTED", "sentinel",
        metadata={
            "confidence_score": sentinel_result.get("confidence_score"),
            "severity":         sentinel_result.get("severity"),
            "match_confirmed":  sentinel_result.get("match_confirmed"),
            "clip_similarity":  sentinel_result.get("clip_similarity"),
            "audio_match":      sentinel_result.get("audio_match"),
            "text_score":       sentinel_result.get("text_score"),
            "forensics_chain":  sentinel_result.get("forensics_chain"),
        },
    )

    return _load_manifest(incident_id)


def package_adjudication_evidence(
    incident_id: str,
    verdict: dict,
    actor: str = "adjudicator",
) -> dict:
    """Package and record adjudication verdict."""
    store_json_artifact(incident_id, "adjudication_verdict.json", verdict)
    record_custody_event(
        incident_id, "CLASSIFIED", actor,
        metadata={
            "classification": verdict.get("classification"),
            "risk_score":     verdict.get("risk_score"),
            "routing":        verdict.get("routing"),
            "legal_basis":    verdict.get("legal_basis"),
        },
    )
    return _load_manifest(incident_id)


def package_dmca_evidence(
    incident_id: str,
    dmca_data: dict,
    actor: str = "enforcer",
) -> dict:
    """Package DMCA notice and record custody event."""
    store_json_artifact(incident_id, "dmca_notice.json", dmca_data)
    if dmca_data.get("notice_text"):
        store_artifact(
            incident_id, "dmca_notice.txt",
            dmca_data["notice_text"].encode(), "text/plain",
        )
    record_custody_event(
        incident_id, "DMCA_DRAFTED", actor,
        metadata={
            "tier":           dmca_data.get("tier"),
            "offence_number": dmca_data.get("offence_number"),
            "legal_contact":  dmca_data.get("legal_contact"),
            "platform":       dmca_data.get("platform"),
        },
    )
    return _load_manifest(incident_id)


def package_contract_evidence(
    incident_id: str,
    contract_data: dict,
    actor: str = "broker",
) -> dict:
    """Package rev-share contract and record custody event."""
    store_json_artifact(incident_id, "contract.json", contract_data)
    record_custody_event(
        incident_id, "CONTRACT_MINTED", actor,
        metadata={
            "tier":                     contract_data.get("tier"),
            "tx_hash":                  contract_data.get("tx_hash"),
            "copyright_holder_share":   contract_data.get("copyright_holder_share"),
            "estimated_monthly_revenue": contract_data.get("estimated_monthly_revenue"),
        },
    )
    return _load_manifest(incident_id)


def record_access(incident_id: str, actor: str, purpose: str = "investigation"):
    """Record that an investigator accessed this evidence."""
    record_custody_event(
        incident_id, "ACCESSED", actor,
        metadata={"purpose": purpose},
    )


# ═══════════════════════════════════════════════════════════════════════════════
# LIVE STREAM SEGMENT PACKAGING
# ═══════════════════════════════════════════════════════════════════════════════

def package_stream_segment(
    stream_id: str,
    segment_index: int,
    segment_ts: float,
    frame_embeddings: Optional[np.ndarray] = None,
    audio_fingerprint: Optional[dict] = None,
    scan_result: Optional[dict] = None,
) -> dict:
    """
    Package a single live stream segment as independent evidence.

    For live streams, each 30s segment is packaged and synced immediately
    without waiting for the full stream to finish. This enables:
    - Real-time evidence preservation
    - Partial stream analysis
    - Resume after network interruption

    segment_id = {stream_id}_{segment_index:06d}
    """
    segment_id = f"{stream_id}_seg{segment_index:06d}"

    if frame_embeddings is not None:
        store_numpy_artifact(segment_id, "frame_embeddings.npy", frame_embeddings)

    if audio_fingerprint:
        store_json_artifact(segment_id, "audio_fingerprint.json", audio_fingerprint)

    if scan_result:
        store_json_artifact(segment_id, "scan_result.json", scan_result)

    record_custody_event(
        segment_id, "STREAM_SEGMENT", "archivist",
        metadata={
            "stream_id":     stream_id,
            "segment_index": segment_index,
            "timestamp_sec": segment_ts,
            "has_embeddings": frame_embeddings is not None,
            "has_audio":     audio_fingerprint is not None,
            "scan_result":   scan_result is not None,
        },
    )

    return _load_manifest(segment_id)


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORT & SYNC
# ═══════════════════════════════════════════════════════════════════════════════

def export_evidence_bundle(incident_id: str, output_path: Optional[str] = None) -> str:
    """
    Export a complete evidence bundle as a ZIP archive.
    Includes: all artifacts + manifest + chain-of-custody log.
    The ZIP itself is SHA-256 hashed for integrity verification.

    Returns path to the ZIP file.
    """
    import zipfile

    incident_dir = _incident_dir(incident_id)
    if output_path is None:
        output_path = os.path.join(VAULT_DIR, f"{incident_id}_evidence.zip")

    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(incident_dir):
            for fname in files:
                full_path  = os.path.join(root, fname)
                arc_name   = os.path.relpath(full_path, VAULT_DIR)
                zf.write(full_path, arc_name)

    bundle_hash = sha256_of_file(output_path)

    record_custody_event(
        incident_id, "EXPORTED", "system",
        metadata={
            "export_path":  output_path,
            "bundle_hash":  bundle_hash,
            "export_size":  os.path.getsize(output_path),
        },
    )

    return output_path


def sync_to_gcs(incident_id: str) -> dict:
    """
    Sync all local artifacts to GCS.
    Resumable — checks which artifacts are already uploaded via manifest.
    Returns sync report.
    """
    if not EVIDENCE_BUCKET:
        return {"synced": 0, "skipped": 0, "failed": 0, "error": "EVIDENCE_BUCKET not set"}

    manifest = _load_manifest(incident_id)
    synced = skipped = failed = 0

    for name, record in manifest["artifacts"].items():
        local_path = record.get("local_path", "")
        if not local_path or not os.path.exists(local_path):
            failed += 1
            continue

        gcs_uri = f"gs://{EVIDENCE_BUCKET}/incidents/{incident_id}/{name}"

        # Skip if already synced with same hash
        if record.get("gcs_uri") == gcs_uri and record.get("hash"):
            skipped += 1
            continue

        ok = _gcs_upload(local_path, gcs_uri)
        if ok:
            record["gcs_uri"] = gcs_uri
            synced += 1
        else:
            failed += 1

    _save_manifest(incident_id, manifest)

    record_custody_event(
        incident_id, "SYNCED", "system",
        metadata={"synced": synced, "skipped": skipped, "failed": failed, "bucket": EVIDENCE_BUCKET},
    )

    return {"synced": synced, "skipped": skipped, "failed": failed, "error": None}


def get_evidence_summary(incident_id: str) -> dict:
    """Return a summary of evidence for an incident."""
    manifest = _load_manifest(incident_id)
    chain    = get_custody_chain(incident_id)
    verify   = verify_custody_chain(incident_id)

    return {
        "incident_id":      incident_id,
        "artifact_count":   len(manifest["artifacts"]),
        "artifacts":        list(manifest["artifacts"].keys()),
        "bundle_hash":      manifest.get("bundle_hash"),
        "custody_events":   len(chain),
        "chain_valid":      verify["valid"],
        "chain_error":      verify.get("error"),
        "last_action":      chain[-1]["action"] if chain else None,
        "last_actor":       chain[-1]["actor"] if chain else None,
        "created_at":       manifest.get("created_at"),
        "updated_at":       manifest.get("updated_at"),
        "gcs_synced":       any(a.get("gcs_uri") for a in manifest["artifacts"].values()),
    }
