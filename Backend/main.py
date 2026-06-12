from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
import os
import glob
import sys
import json
import numpy as np
import threading
import re

sys.path.insert(0, os.path.dirname(__file__))

from agents.archivist import tool_ingest_video, vector_db
from agents.spider import crawl
from agents.sentinel import scan_thumbnail, scan_suspect, MATCH_THRESHOLD, SUSPECT_THRESHOLD
from agents.adjudicator import adjudicate, batch_adjudicate
from agents.enforcer import issue_dmca
from agents.broker import deploy_contract
from agents.watchdog import start_watchdog, stop_watchdog, get_watchdog_status, get_scan_history, trigger_immediate_scan, pause_watchdog, resume_watchdog
from evidence_vault import create_evidence
import tempfile
import pathlib

app = FastAPI(title="MediaGuard ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── L1 FIX: Pre-warm CLIP on startup ─────────────────────────────────────────
def _prewarm_clip():
    try:
        from agents.archivist import _load_clip, _onnx_enabled
        if _onnx_enabled:
            print("[Startup] CLIP ONNX already loaded — no pre-warm needed")
            return
        _load_clip()
        print("[Startup] CLIP pre-warm complete")
    except Exception as e:
        print(f"[Startup] CLIP pre-warm failed (non-fatal): {e}")

threading.Thread(target=_prewarm_clip, daemon=True).start()

# ── Watchdog — Continuous Monitoring (Dropbox-like sync) ──────────────────────
# Start watchdog background thread — scans all vault assets periodically.
# Disabled by setting WATCHDOG_ENABLED=false in .env
start_watchdog()

OFFICIAL_DIR = os.path.join(os.path.dirname(__file__), "assets", "official")
os.makedirs(OFFICIAL_DIR, exist_ok=True)

# ── YouTube cookies setup ─────────────────────────────────────────────────────
COOKIES_PATH = os.path.join(os.path.dirname(__file__), "yt_cookies.txt")

def _setup_cookies():
    import base64
    cookies_b64 = os.getenv("YOUTUBE_COOKIES_B64", "").strip()
    if not cookies_b64:
        print("[Ingest] YOUTUBE_COOKIES_B64 not set — YouTube downloads may fail on cloud IPs")
        return
    try:
        decoded = base64.b64decode(cookies_b64).decode("utf-8")
        with open(COOKIES_PATH, "w", encoding="utf-8") as f:
            f.write(decoded)
        print(f"[Ingest] Cookies written ({decoded.count(chr(10))} lines)")
    except Exception as e:
        print(f"[Ingest] Failed to decode YOUTUBE_COOKIES_B64: {e}")

_setup_cookies()

# ── Persistent job store ──────────────────────────────────────────────────────
# File-backed so jobs survive server restarts / process crashes.
# Use tempfile.gettempdir() to get OS-appropriate temp dir (works on Windows/Linux/Mac).
import tempfile
_JOBS_DIR = os.path.join(tempfile.gettempdir(), "mediaguard_jobs")
os.makedirs(_JOBS_DIR, exist_ok=True)

def _job_path(job_id: str) -> str:
    return os.path.join(_JOBS_DIR, f"{job_id}.json")

def _read_job(job_id: str) -> dict | None:
    p = _job_path(job_id)
    if not os.path.exists(p):
        return None
    try:
        with open(p, "r") as f:
            return json.load(f)
    except Exception:
        return None

def _write_job(job_id: str, data: dict):
    p = _job_path(job_id)
    tmp = p + ".tmp"
    try:
        with open(tmp, "w") as f:
            json.dump(data, f)
        os.replace(tmp, p)
    except Exception as e:
        print(f"[Jobs] Failed to write job {job_id}: {e}")


# ─── Request models ───────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    official_video_url: str
    job_id: str
    video_title: str = ""

class HuntRequest(BaseModel):
    official_video_url: str
    official_title: str = ""

class ScanRequest(BaseModel):
    thumbnail_url:  str
    account_handle: str = ""
    platform:       str = "Unknown"
    title:          str = ""
    url:            str = ""   # suspect video URL — used by audio layer
    country:        str = ""

class BatchScanRequest(BaseModel):
    threat_nodes: list

class AdjudicateRequest(BaseModel):
    sentinel_report:  str
    platform:         str
    account_handle:   str
    video_title:      str
    description:      str = ""
    country:          str = ""
    confidence_score: float = 100.0
    text_ocr:         dict = None

class BatchAdjudicateRequest(BaseModel):
    incidents: list

class EnforceRequest(BaseModel):
    target_account:   str
    platform:         str
    video_title:      str
    video_url:        str = ""
    confidence_score: float = 100.0
    classification:   str = "SEVERE PIRACY"
    justification:    str = ""
    integrity_hash:   str = ""
    offence_number:   int = 1

class BrokerRequest(BaseModel):
    target_account:   str
    platform:         str
    video_title:      str
    video_url:        str = ""
    justification:    str = ""
    view_count:       int = 0
    risk_score:       int = 30


# ─── Health & debug ───────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "MediaGuard ML API online", "vault_size": vector_db.ntotal}

@app.get("/health")
def health():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "vault_size": vector_db.ntotal,
        "vault_status": "ready" if vector_db.ntotal > 0 else "empty"
    }

@app.get("/vault/status")
def vault_status():
    from agents.archivist import temporal_store
    total_sigs = sum(len(v) for v in temporal_store.values())
    try:
        from agents.audio_fingerprint import get_audio_vault_status
        audio_status = get_audio_vault_status()
    except Exception:
        audio_status = {"fingerprints_stored": 0, "audio_vectors": 0}
    return {
        "vault_size":              vector_db.ntotal,
        "status":                  "ready" if vector_db.ntotal > 0 else "empty",
        "temporal_signatures":     total_sigs,
        "videos_ingested":         len(temporal_store),
        "audio_fingerprints":      audio_status["fingerprints_stored"],
        "audio_mel_vectors":       audio_status["audio_vectors"],
    }

@app.get("/debug/cookies")
def debug_cookies():
    """Check if YouTube cookies are loaded correctly."""
    exists  = os.path.exists(COOKIES_PATH)
    size    = os.path.getsize(COOKIES_PATH) if exists else 0
    env_set = bool(os.getenv("YOUTUBE_COOKIES_B64", "").strip())
    return {"cookies_file_exists": exists, "cookies_file_size_bytes": size,
            "env_var_set": env_set, "cookies_path": COOKIES_PATH}

@app.get("/debug/sentinel")
def debug_sentinel(thumbnail_url: str):
    """Scan a thumbnail and return raw CLIP similarity scores — useful for threshold tuning."""
    if vector_db.ntotal == 0:
        return {"error": "Vault is empty — ingest a video first", "vault_size": 0}
    result = scan_thumbnail(thumbnail_url)
    return {
        "vault_size":  vector_db.ntotal,
        "thresholds":  {"match": MATCH_THRESHOLD, "suspect": SUSPECT_THRESHOLD},
        **result,
    }


@app.get("/forensics/status")
def forensics_status():
    """Check forensics agent status — model loaded, heuristic or neural mode."""
    try:
        from agents.forensics import get_forensics_status
        return get_forensics_status()
    except Exception as e:
        return {"error": str(e), "model_ready": False}


class ForensicsRequest(BaseModel):
    thumbnail_url: str


@app.post("/forensics/analyze")
def forensics_analyze(payload: ForensicsRequest):
    """
    Analyze a thumbnail for platform sharing chain.
    Returns: detected chain, first leak platform, leak risk, JPEG quality.
    """
    try:
        from agents.forensics import analyze_thumbnail_url
        result = analyze_thumbnail_url(payload.thumbnail_url)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forensics failed: {e}")


# ─── Leak Source Detection ────────────────────────────────────────────────────

class LeakAnalysisRequest(BaseModel):
    thumbnail_url:   str  = ""
    video_url:       str  = ""        # suspect video URL — used to fetch thumbnail if not provided
    incident_id:     str  = ""        # optional — to attach result to evidence vault
    account_handle:  str  = ""
    platform:        str  = ""

@app.post("/leak/analyze")
def leak_analyze(payload: LeakAnalysisRequest):
    """
    Full leak source analysis for a suspect video.

    Reconstructs the platform sharing chain:
      Original Source → Platform A (first leak) → Platform B → ... → Current Upload

    Returns:
    - leak_chain: ordered list of platforms content passed through
    - first_leak_platform: where the content FIRST appeared after the official source
    - leak_risk: "critical" / "high" / "medium" / "low"
    - confidence: 0-1 confidence in the chain reconstruction
    - jpeg_quality: JPEG compression quality (platform fingerprint)
    - platform_scores: per-platform likelihood scores
    - leak_summary: human-readable summary for the dashboard

    This answers the key question: "How did this pirated content get distributed?"
    """
    try:
        from agents.forensics import analyze_thumbnail_url, analyze_image_chain
        from PIL import Image
        import io
        import requests as _req

        thumbnail_url = payload.thumbnail_url

        # If no thumbnail provided, try to extract from video URL via yt-dlp
        if not thumbnail_url and payload.video_url:
            try:
                import yt_dlp
                with yt_dlp.YoutubeDL({"quiet": True, "noplaylist": True}) as ydl:
                    info = ydl.extract_info(payload.video_url, download=False)
                    thumbnail_url = info.get("thumbnail", "")
            except Exception as e:
                print(f"[LeakAnalyze] Could not extract thumbnail from video URL: {e}")

        if not thumbnail_url:
            raise HTTPException(status_code=400, detail="No thumbnail_url or video_url provided")

        # Run forensics analysis
        result = analyze_thumbnail_url(thumbnail_url)

        # Build human-readable leak summary
        chain     = result.get("chain", [])
        first_plat = result.get("first_platform") or (chain[0] if chain else "Unknown")
        leak_risk  = result.get("leak_risk", "low")
        confidence = result.get("confidence", 0.0)

        if chain and len(chain) >= 2:
            chain_str = " → ".join(chain)
            leak_summary = (
                f"Content traced through {len(chain)}-platform chain: {chain_str}. "
                f"First leak detected on {first_plat}. "
                f"Leak risk: {leak_risk.upper()}."
            )
        elif chain and len(chain) == 1:
            leak_summary = (
                f"Content appears to have leaked directly via {first_plat}. "
                f"Single-platform distribution detected. Leak risk: {leak_risk.upper()}."
            )
        else:
            leak_summary = (
                "Could not reconstruct a clear leak chain from this content. "
                "Platform fingerprint is ambiguous or content is original."
            )

        # Platform-specific leak guidance
        leak_guidance = {
            "Telegram": "Telegram channels are a primary piracy distribution hub. Content is often screenshotted or re-encoded from here.",
            "WhatsApp": "WhatsApp group leaks indicate insider/subscriber distribution. Often the primary leak vector for live events.",
            "Twitter":  "Twitter/X re-posts spread content rapidly. Often secondary redistribution after initial Telegram/WhatsApp leak.",
            "Facebook": "Facebook groups/pages often host re-encoded content. Lower quality but high reach.",
            "Instagram": "Instagram Reels/Stories are often secondary uploads after TikTok or YouTube.",
            "YouTube":  "YouTube re-uploads are typically the final distribution platform after multi-chain sharing.",
        }

        first_guidance = leak_guidance.get(first_plat, f"{first_plat} is a known content redistribution platform.")

        # Attach to evidence vault if incident_id provided
        if payload.incident_id:
            try:
                from agents.evidence_vault import store_json_artifact, record_custody_event
                store_json_artifact(
                    payload.incident_id,
                    "leak_analysis.json",
                    {"result": result, "summary": leak_summary, "guidance": first_guidance},
                )
                record_custody_event(
                    payload.incident_id, "CLASSIFIED", "leak_analyzer",
                    metadata={
                        "first_leak_platform": first_plat,
                        "chain":               chain,
                        "leak_risk":           leak_risk,
                        "confidence":          confidence,
                    }
                )
            except Exception as e:
                print(f"[LeakAnalyze] Evidence vault attachment failed (non-fatal): {e}")

        return {
            "success":             True,
            "thumbnail_url":       thumbnail_url,
            "leak_chain":          chain,
            "first_leak_platform": first_plat,
            "leak_risk":           leak_risk,
            "confidence":          confidence,
            "jpeg_quality":        result.get("jpeg_quality", 0),
            "platform_scores":     result.get("platform_scores", {}),
            "method":              result.get("method", "heuristic"),
            "leak_summary":        leak_summary,
            "first_platform_guidance": first_guidance,
            "chain_length":        len(chain),
            "account_handle":      payload.account_handle,
            "platform":            payload.platform,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Leak analysis failed: {e}")


@app.post("/leak/batch")
def leak_batch(payload: BatchScanRequest):
    """
    Run leak analysis on multiple suspect nodes in parallel.
    Used by swarm to enrich all detected incidents with leak chain data.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    def _analyze_one(node):
        try:
            from agents.forensics import analyze_thumbnail_url
            thumb = node.get("thumbnail_url", "")
            if not thumb:
                return {"node": node, "leak": None}
            result = analyze_thumbnail_url(thumb)
            return {"node": node, "leak": result}
        except Exception as e:
            return {"node": node, "leak": None, "error": str(e)}

    nodes   = payload.threat_nodes
    results = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(_analyze_one, n): n for n in nodes}
        for future in as_completed(futures):
            results.append(future.result())

    return {"success": True, "results": results, "total": len(results)}


# ─── Agent endpoints ──────────────────────────────────────────────────────────

@app.post("/enforce")
def enforce_incident(payload: EnforceRequest):
    try:
        result = issue_dmca(
            target_account   = payload.target_account,
            platform         = payload.platform,
            video_title      = payload.video_title,
            video_url        = payload.video_url,
            confidence_score = payload.confidence_score,
            classification   = payload.classification,
            justification    = payload.justification,
            integrity_hash   = payload.integrity_hash,
            offence_number   = payload.offence_number,
        )
        # Record enforcement draft as evidence
        try:
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json", dir=OFFICIAL_DIR)
            meta = {"payload": payload.dict(), "result": result}
            tmp.write(json.dumps(meta, ensure_ascii=False).encode("utf-8"))
            tmp.close()
            _record_evidence_async({"metadata": tmp.name}, metadata=meta)
        except Exception as ee:
            print(f"[Evidence] enforce record failed: {ee}")
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enforcer failed: {e}")


def _record_evidence_async(artifacts: dict, metadata: dict, reviewer: str = "automated_agent"):
    def _job():
        try:
            create_evidence(artifacts=artifacts, metadata=metadata, reviewer=reviewer)
        except Exception as e:
            print(f"[Evidence] failed to record: {e}")
    t = threading.Thread(target=_job, daemon=True)
    t.start()

@app.post("/broker")
def broker_incident(payload: BrokerRequest):
    try:
        result = deploy_contract(
            target_account = payload.target_account,
            platform       = payload.platform,
            video_title    = payload.video_title,
            video_url      = payload.video_url,
            justification  = payload.justification,
            view_count     = payload.view_count,
            risk_score     = payload.risk_score,
        )
        # Record evidence (metadata only) asynchronously
        try:
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json", dir=OFFICIAL_DIR)
            meta = {"payload": payload.dict(), "result": result}
            tmp.write(json.dumps(meta, ensure_ascii=False).encode("utf-8"))
            tmp.close()
            _record_evidence_async({"metadata": tmp.name}, metadata=meta)
        except Exception as ee:
            print(f"[Evidence] broker record failed: {ee}")
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Broker failed: {e}")

@app.post("/adjudicate")
def adjudicate_incident(payload: AdjudicateRequest):
    try:
        verdict = adjudicate(
            sentinel_report  = payload.sentinel_report,
            platform         = payload.platform,
            account_handle   = payload.account_handle,
            video_title      = payload.video_title,
            description      = payload.description,
            country          = payload.country,
            confidence_score = payload.confidence_score,
            text_ocr         = payload.text_ocr,
        )
        # Record adjudicator decision
        try:
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json", dir=OFFICIAL_DIR)
            meta = {"payload": payload.dict(), "verdict": verdict}
            tmp.write(json.dumps(meta, ensure_ascii=False).encode("utf-8"))
            tmp.close()
            _record_evidence_async({"metadata": tmp.name}, metadata=meta)
        except Exception as ee:
            print(f"[Evidence] adjudicate record failed: {ee}")
        return {"success": True, "verdict": verdict}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adjudicator failed: {e}")


    # Note: recording of adjudications can be done by callers; keep lightweight here.

@app.post("/adjudicate/batch")
def adjudicate_batch(payload: BatchAdjudicateRequest):
    results = batch_adjudicate(payload.incidents)
    return {"success": True, "results": results, "total": len(results)}

@app.post("/scan")
def scan_suspect_endpoint(payload: ScanRequest):
    """
    Full pipeline scan — downloads suspect clip, extracts frames, runs all 5 layers.
    Platform agnostic: works for YouTube, TikTok, Vimeo, Dailymotion, etc.
    """
    result = scan_thumbnail(
        payload.thumbnail_url,
        suspect_video_url = payload.url,
        batch_mode        = False,   # full video download for single scans
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    try:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json", dir=OFFICIAL_DIR)
        meta = {"payload": payload.dict(), "result": result}
        tmp.write(json.dumps(meta, ensure_ascii=False).encode("utf-8"))
        tmp.close()
        _record_evidence_async({"metadata": tmp.name}, metadata=meta)
    except Exception as ee:
        print(f"[Evidence] scan record failed: {ee}")
    return {"success": True, **result}

@app.post("/scan/batch")
def batch_scan(payload: BatchScanRequest):
    """
    Batch scan — parallel thumbnail scans for 20+ suspects.

    Strategy: thumbnail-only in batch mode (too slow to download 20+ videos).
    For suspects that are confirmed matches after batch, the swarm
    can trigger full video scans individually.

    Nodes without thumbnail_url are included — they get thumbnail_url=""
    and the scanner will try to extract it from the video URL.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    nodes = payload.threat_nodes  # include ALL nodes, not just those with thumbnails

    def _scan_one(node):
        result = scan_thumbnail(
            node.get("thumbnail_url", ""),
            suspect_video_url = node.get("url", ""),
            batch_mode        = True,   # thumbnail-only in batch
        )
        return {"node": node, "scan": result}

    results = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(_scan_one, node): node for node in nodes}
        for future in as_completed(futures):
            try:
                results.append(future.result())
            except Exception as e:
                node = futures[future]
                results.append({"node": node, "scan": {"error": str(e)}})

    return {"success": True, "results": results, "total": len(results)}


class FullScanRequest(BaseModel):
    url:            str          # suspect video URL
    thumbnail_url:  str  = ""
    platform:       str  = ""
    account_handle: str  = ""


@app.post("/scan/full")
def full_scan(payload: FullScanRequest):
    """
    Full video pipeline scan for a single confirmed/high-priority suspect.
    Downloads the video, extracts scene frames, runs all 5 detection layers.
    Use this after batch scan identifies high-confidence suspects.
    Takes 30-90s depending on video platform and length.
    """
    result = scan_suspect(
        suspect_video_url = payload.url,
        thumbnail_url     = payload.thumbnail_url,
        platform          = payload.platform,
        batch_mode        = False,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"success": True, **result}

@app.post("/ingest")
def ingest_asset(payload: IngestRequest, background_tasks: BackgroundTasks):
    """
    Returns immediately. Download + embedding runs in a background thread.
    Poll GET /ingest/status/{job_id} for progress.
    """
    job_id         = payload.job_id
    url            = payload.official_video_url
    provided_title = payload.video_title.strip()

    _write_job(job_id, {"status": "downloading", "message": "Starting download…"})

    def _run():
        import yt_dlp
        # Pause watchdog during ingest to avoid CPU contention
        pause_watchdog()
        try:
            # ── Detect direct file URL vs platform URL ────────────────────────
            url_clean = url.lower().split("?")[0]
            is_direct = any(url_clean.endswith(ext) for ext in
                            ('.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v'))
            is_direct = is_direct or any(host in url for host in [
                'drive.google.com/uc', 'dl.dropboxusercontent.com',
                'storage.googleapis.com', 'amazonaws.com', 'cloudfront.net',
                'dropbox.com',                  # Dropbox share links
                'onedrive.live.com',            # OneDrive
                '1drv.ms',                      # OneDrive short links
                'sharepoint.com',               # SharePoint
                'box.com',                      # Box.com
            ])

            if is_direct:
                # ── Direct download (Google Drive, Dropbox, OneDrive, CDN) ─────
                local_path = os.path.join(OFFICIAL_DIR, f"{job_id}.mp4")
                _write_job(job_id, {**(_read_job(job_id) or {}), "message": "Downloading video file directly…"})

                # ── URL normalization per cloud provider ──────────────────────
                # Google Drive: /file/d/{id} or ?id={id} → direct download URL
                gdrive_match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
                if gdrive_match:
                    file_id    = gdrive_match.group(1)
                    direct_url = f"https://drive.google.com/uc?export=download&confirm=t&id={file_id}"
                elif 'drive.google.com' in url:
                    id_match = re.search(r'id=([a-zA-Z0-9_-]+)', url)
                    if not id_match:
                        raise ValueError("Could not extract Google Drive file ID from URL")
                    file_id    = id_match.group(1)
                    direct_url = f"https://drive.google.com/uc?export=download&confirm=t&id={file_id}"

                # Dropbox: ?dl=0 → ?dl=1 (force download), www.dropbox.com → dl.dropboxusercontent.com
                elif 'dropbox.com' in url:
                    # Strip any existing dl= param cleanly, then add dl=1
                    direct_url = re.sub(r'([?&])dl=\d+', r'\1', url).rstrip('?&')
                    sep = '&' if '?' in direct_url else '?'
                    direct_url = direct_url + sep + 'dl=1'
                    direct_url = direct_url.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                    print(f"[Ingest] Dropbox URL normalized: {direct_url}")

                # OneDrive short link (1drv.ms) → follow redirect to get direct link
                elif '1drv.ms' in url or 'onedrive.live.com' in url:
                    # OneDrive needs special handling — embed/download param
                    import urllib.parse
                    if '1drv.ms' in url:
                        # Follow redirect to get the full OneDrive URL first
                        import requests as req_lib_tmp
                        redir = req_lib_tmp.get(url, allow_redirects=True, timeout=15)
                        direct_url = redir.url
                    else:
                        direct_url = url
                    # Replace /embed? with /download?
                    direct_url = direct_url.replace('/embed?', '/download?')
                    if '?' not in direct_url:
                        direct_url += '?download=1'
                    print(f"[Ingest] OneDrive URL normalized: {direct_url}")

                # Box.com: /s/{id} → /shared/static/{id}
                elif 'box.com' in url:
                    direct_url = url
                    if '/s/' in url:
                        # Box shared links need the download API
                        box_id = url.rstrip('/').split('/')[-1]
                        direct_url = f"https://app.box.com/index.php?rm=box_download_shared_file&shared_name={box_id}&file_id={box_id}"
                    print(f"[Ingest] Box URL normalized: {direct_url}")

                else:
                    direct_url = url

                import requests as req_lib
                session = req_lib.Session()
                resp = session.get(direct_url, stream=True, timeout=300,
                                   headers={"User-Agent": "Mozilla/5.0"})
                resp.raise_for_status()

                content_type = resp.headers.get("Content-Type", "")
                if "text/html" in content_type:
                    raise ValueError(
                        "Got HTML instead of video. Make sure Drive sharing is "
                        "'Anyone with the link' and the link is a direct download URL."
                    )

                with open(local_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            f.write(chunk)

                file_size = os.path.getsize(local_path)
                if file_size < 100_000:
                    raise ValueError(
                        f"Downloaded file too small ({file_size:,} bytes) — "
                        "likely not a video or download was blocked."
                    )

                title = provided_title or url.split("/")[-1].split("?")[0].rsplit(".", 1)[0] or "Official Video"

            else:
                # ── Platform URL — use yt-dlp ─────────────────────────────────
                ydl_opts = {
                    "outtmpl":     os.path.join(OFFICIAL_DIR, f"{job_id}.%(ext)s"),
                    # "best" selects the best single-file format — no merge needed
                    # This works WITHOUT JS runtime or special client configs
                    "format":      "best",
                    "quiet":       False,
                    "no_warnings": False,
                    "noplaylist":  True,
                }
                # Add ffmpeg location for any post-processing
                try:
                    from agents.audio_fingerprint import _get_ffmpeg_exe
                    _ffmpeg = _get_ffmpeg_exe()
                    if _ffmpeg:
                        ydl_opts["ffmpeg_location"] = os.path.dirname(_ffmpeg)
                except Exception:
                    pass
                if os.path.exists(COOKIES_PATH):
                    ydl_opts["cookiefile"] = COOKIES_PATH

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info  = ydl.extract_info(url, download=True)
                    # FIX: Always prefer yt-dlp extracted title over user-provided generic
                    # "Official Video X" title should never override the real video title
                    real_title = info.get("title", "")
                    if real_title and len(real_title) > 5:
                        title = real_title
                    else:
                        title = provided_title or "Unknown"

                matches = glob.glob(os.path.join(OFFICIAL_DIR, f"{job_id}.*"))
                if not matches:
                    _write_job(job_id, {"status": "failed", "message": "Downloaded file not found on disk"})
                    return

                local_path = matches[0]
                ext = os.path.splitext(local_path)[1].lower()
                if ext not in (".mp4", ".webm", ".mkv", ".avi", ".mov"):
                    new_path = os.path.splitext(local_path)[0] + ".mp4"
                    os.rename(local_path, new_path)
                    local_path = new_path

            # ── Embed frames ──────────────────────────────────────────────────
            _write_job(job_id, {"status": "processing", "message": "Extracting and embedding frames…"})

            # Call ingest without callback (archivist doesn't support it yet)
            result = tool_ingest_video(local_path)
            if "[ERROR]" in result:
                _write_job(job_id, {"status": "failed", "message": result})
                return

            frame_count = 0
            try:
                # Parse new scene-aware success message:
                # "[SUCCESS] Scene-aware ingest complete. Scenes=N, Skipped=M, ScreenFixes=K, TemporalSigs=P, VaultSize=Q."
                # Also handles legacy: "[SUCCESS] Extracted N frames. Vault size: Q."
                if "Scenes=" in result:
                    frame_count = int(result.split("Scenes=")[1].split(",")[0])
                elif "Extracted " in result:
                    frame_count = int(result.split("Extracted ")[1].split(" frames")[0])
            except Exception:
                pass

            if frame_count == 0:
                _write_job(job_id, {
                    "status":  "failed",
                    "message": "No frames extracted — video may be corrupted or too short",
                })
                return

            _write_job(job_id, {
                "status":      "complete",
                "title":       title,
                "local_path":  local_path,
                "frame_count": frame_count,
                "vault_size":  vector_db.ntotal,
                "tx_hash":     "0x" + np.random.bytes(32).hex(),
                "message":     result,
            })

        except Exception as e:
            print(f"[Ingest] Error: {e}")
            _write_job(job_id, {"status": "failed", "message": str(e)})
        finally:
            # Always resume watchdog after ingest (success or failure)
            resume_watchdog()

    threading.Thread(target=_run, daemon=True).start()

    return {"success": True, "job_id": job_id, "status": "downloading",
            "message": "Ingest started. Poll /ingest/status/{job_id} for progress."}


@app.get("/ingest/status/{job_id}")
def ingest_status(job_id: str):
    job = _read_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return {"success": True, "job_id": job_id, **job}


# ─── Hunt ─────────────────────────────────────────────────────────────────────

@app.post("/hunt")
def trigger_hunt(payload: HuntRequest):
    result = crawl(payload.official_video_url, official_title=payload.official_title)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"success": True, "data": result}


# ─── Evidence Vault ───────────────────────────────────────────────────────────

class EvidenceAccessRequest(BaseModel):
    incident_id: str
    actor: str = "investigator"
    purpose: str = "investigation"

@app.get("/evidence/{incident_id}")
def get_evidence(incident_id: str, actor: str = "api"):
    """Get evidence summary and record access in chain-of-custody."""
    try:
        from agents.evidence_vault import get_evidence_summary, record_access
        record_access(incident_id, actor)
        return {"success": True, **get_evidence_summary(incident_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/evidence/{incident_id}/custody")
def get_custody_chain(incident_id: str):
    """Get full chain-of-custody for an incident."""
    try:
        from agents.evidence_vault import get_custody_chain, verify_custody_chain
        chain  = get_custody_chain(incident_id)
        verify = verify_custody_chain(incident_id)
        return {"success": True, "chain": chain, "integrity": verify}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PackageDetectionRequest(BaseModel):
    scan_result:     dict = {}
    thumbnail_url:   str  = ""
    audio_result:    Optional[dict] = None
    forensics:       Optional[dict] = None
    text_result:     Optional[dict] = None

    class Config:
        # Allow extra fields from swarmController
        extra = "allow"


@app.post("/evidence/{incident_id}/package_detection")
def package_detection(incident_id: str, payload: PackageDetectionRequest):
    """
    Package detection artifacts into evidence vault.
    Called by swarmController.js after each sentinel scan.
    Fire-and-forget — never blocks detection pipeline.
    """
    try:
        from agents.evidence_vault import package_detection_evidence
        package_detection_evidence(
            incident_id      = incident_id,
            sentinel_result  = payload.scan_result or {},
            audio_result     = payload.audio_result,
            forensics_result = payload.forensics,
            text_result      = payload.text_result,
        )
        return {"success": True}
    except Exception as e:
        # Never raise — vault failure must not block swarm
        print(f"[EvidenceVault] package_detection failed for {incident_id}: {e}")
        return {"success": False, "error": str(e)}

@app.post("/evidence/{incident_id}/export")
def export_evidence(incident_id: str):
    """Export a complete evidence bundle as ZIP."""
    try:
        from agents.evidence_vault import export_evidence_bundle
        zip_path = export_evidence_bundle(incident_id)
        return {"success": True, "path": zip_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/evidence/{incident_id}/sync")
def sync_evidence(incident_id: str):
    """Sync evidence artifacts to GCS."""
    try:
        from agents.evidence_vault import sync_to_gcs
        result = sync_to_gcs(incident_id)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Live Stream Monitoring ───────────────────────────────────────────────────

class StreamStartRequest(BaseModel):
    stream_url:  str
    stream_id:   str = ""

@app.post("/stream/start")
def start_stream(payload: StreamStartRequest):
    """
    Start monitoring a live stream for piracy.
    Returns immediately — monitoring runs in background threads.
    Detection events are emitted via Socket.IO to the frontend.
    """
    try:
        from agents.live_stream import start_stream_monitor

        def on_detection(segment):
            """Called when piracy is detected in a segment."""
            # This runs in a background thread — we can't use FastAPI's request context
            # Just log it; the Socket.IO server is in Node.js and gets events via the
            # evidence vault. For direct emit, poll /stream/{stream_id}/results.
            print(f"[LiveStream] DETECTION: stream={segment.stream_id} "
                  f"segment={segment.segment_index} "
                  f"confidence={segment.scan_result.get('confidence_score', 0):.1f}%")

        sid = start_stream_monitor(
            stream_url = payload.stream_url,
            stream_id  = payload.stream_id or None,
            on_detection = on_detection,
        )
        return {"success": True, "stream_id": sid, "message": "Stream monitoring started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/stream/{stream_id}")
def stop_stream(stream_id: str):
    """Stop monitoring a live stream."""
    try:
        from agents.live_stream import stop_stream_monitor
        stop_stream_monitor(stream_id)
        return {"success": True, "message": f"Stream {stream_id} monitoring stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stream/active")
def list_active_streams():
    """List all currently monitored streams. Must be before /{stream_id} routes."""
    try:
        from agents.live_stream import list_active_streams
        return {"success": True, "streams": list_active_streams()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stream/{stream_id}/results")
def get_stream_results(stream_id: str):
    """Get detection results for a live stream."""
    try:
        from agents.live_stream import get_stream_results
        results = get_stream_results(stream_id)
        return {
            "success":   True,
            "stream_id": stream_id,
            "results":   results,
            "total":     len(results),
            "detections": sum(1 for r in results if r.get("match_confirmed")),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Watchdog — Continuous Monitoring API ─────────────────────────────────────

@app.get("/watchdog/status")
def watchdog_status():
    """Get watchdog continuous monitoring status."""
    return {"success": True, **get_watchdog_status()}

@app.post("/watchdog/trigger")
def watchdog_trigger(asset_title: str = "", asset_url: str = ""):
    """
    Trigger an immediate scan outside the regular schedule.
    If asset_title provided: scans that specific asset.
    If empty: triggers full sweep of all protected assets.
    """
    try:
        result = trigger_immediate_scan(asset_title, asset_url)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/watchdog/history")
def watchdog_history(limit: int = 50):
    """Get recent scan history — shows all detected piracy instances."""
    return {"success": True, "history": get_scan_history(limit), "total": len(get_scan_history(limit))}

@app.post("/watchdog/stop")
def watchdog_stop_endpoint():
    """Stop continuous monitoring (use for maintenance windows)."""
    stop_watchdog()
    return {"success": True, "message": "Watchdog stopped"}

@app.post("/watchdog/start")
def watchdog_start_endpoint():
    """Restart continuous monitoring after maintenance."""
    start_watchdog()
    return {"success": True, "message": "Watchdog started"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
