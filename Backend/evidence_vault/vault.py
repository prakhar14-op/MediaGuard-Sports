"""Evidence Vault and Chain-of-Custody utilities

This module provides a lightweight evidence vault implementation that
records artifacts (raw video, frames, embeddings, metadata, DMCA, audit logs,
platform chain) into a per-evidence directory and appends an immutable
chain-of-custody entry to a newline-delimited JSON file.

Design goals:
- Minimal dependencies (stdlib only).
- Append-only `evidence_chain.jsonl` to provide an auditable chain.
- Per-evidence folder under `vault/evidence/{evidence_id}`.
- Simple sync helper to copy evidence to a remote investigator directory.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
VAULT_DIR = ROOT / "vault" / "evidence"
CHAIN_FILE = ROOT / "vault" / "evidence_chain.jsonl"


def _ensure_dirs() -> None:
    VAULT_DIR.mkdir(parents=True, exist_ok=True)
    CHAIN_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not CHAIN_FILE.exists():
        CHAIN_FILE.write_text("")


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _read_last_chain_hash() -> str:
    if not CHAIN_FILE.exists() or CHAIN_FILE.stat().st_size == 0:
        return ""
    with CHAIN_FILE.open("rb") as f:
        try:
            f.seek(-2, os.SEEK_END)
        except OSError:
            f.seek(0)
        while f.tell() > 0:
            chunk = f.read(1)
            if chunk == b"\n":
                break
            f.seek(-2, os.SEEK_CUR)
        last = f.readline().decode().strip()
    if not last:
        return ""
    try:
        obj = json.loads(last)
        return obj.get("entry_hash", "")
    except Exception:
        return ""


def _hash_entry(entry: Dict) -> str:
    canonical = json.dumps(entry, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def create_evidence(
    artifacts: Dict[str, str],
    metadata: Optional[Dict] = None,
    reviewer: Optional[str] = None,
    evidence_id: Optional[str] = None,
) -> Tuple[str, Dict]:
    _ensure_dirs()
    eid = evidence_id or uuid.uuid4().hex
    dest = VAULT_DIR / eid
    dest.mkdir(parents=True, exist_ok=True)

    stored_files: List[Dict] = []
    for kind, src in (artifacts or {}).items():
        try:
            srcp = Path(src)
            if not srcp.exists():
                continue
            dest_name = f"{kind}_{srcp.name}"
            tgt = dest / dest_name
            if srcp.is_dir():
                tgt = dest / f"{kind}_{srcp.name}"
                if tgt.exists():
                    shutil.rmtree(tgt)
                shutil.copytree(srcp, tgt)
                files = [p for p in tgt.rglob("**/*") if p.is_file()]
                for p in files:
                    stored_files.append({
                        "kind": kind,
                        "path": str(p.relative_to(dest)),
                        "sha256": _sha256_file(p),
                    })
            else:
                shutil.copy2(srcp, tgt)
                stored_files.append({
                    "kind": kind,
                    "path": str(tgt.relative_to(dest)),
                    "sha256": _sha256_file(tgt),
                })
        except Exception as e:
            stored_files.append({"kind": kind, "error": str(e)})

    timestamp = int(time.time())
    prev_hash = _read_last_chain_hash()

    entry = {
        "evidence_id": eid,
        "timestamp": timestamp,
        "reviewer": reviewer or "",
        "metadata": metadata or {},
        "artifacts": stored_files,
        "prev_hash": prev_hash,
    }
    entry_hash = _hash_entry(entry)
    entry["entry_hash"] = entry_hash

    with CHAIN_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    try:
        with (dest / "metadata.json").open("w", encoding="utf-8") as mf:
            json.dump({"evidence_id": eid, "timestamp": timestamp, "metadata": metadata or {}, "reviewer": reviewer or "", "artifacts": stored_files}, mf, ensure_ascii=False, indent=2)
    except Exception:
        pass

    return eid, entry


def list_evidence() -> List[str]:
    _ensure_dirs()
    return [p.name for p in sorted(VAULT_DIR.iterdir()) if p.is_dir()]


def evidence_path(evidence_id: str) -> Path:
    return VAULT_DIR / evidence_id


def sync_evidence(evidence_id: str, target_dir: str) -> Path:
    src = evidence_path(evidence_id)
    if not src.exists():
        raise FileNotFoundError(f"Evidence {evidence_id} not found")
    tgt = Path(target_dir) / evidence_id
    if tgt.exists():
        shutil.rmtree(tgt)
    shutil.copytree(src, tgt)
    return tgt


def read_chain(limit: Optional[int] = None) -> List[Dict]:
    _ensure_dirs()
    entries: List[Dict] = []
    with CHAIN_FILE.open("r", encoding="utf-8") as f:
        for ln in f:
            ln = ln.strip()
            if not ln:
                continue
            try:
                entries.append(json.loads(ln))
            except Exception:
                continue
    if limit:
        return entries[-limit:]
    return entries


def verify_chain() -> Tuple[bool, List[str]]:
    entries = read_chain()
    problems: List[str] = []
    prev_hash = ""
    for idx, e in enumerate(entries):
        eh = e.get("entry_hash", "")
        copy = dict(e)
        copy.pop("entry_hash", None)
        calc = _hash_entry(copy)
        if calc != eh:
            problems.append(f"Entry {idx} hash mismatch: expected {eh} computed {calc}")
        if e.get("prev_hash", "") != prev_hash:
            problems.append(f"Entry {idx} prev_hash mismatch: expected {prev_hash} got {e.get('prev_hash','')}")
        prev_hash = eh
    return (len(problems) == 0, problems)


if __name__ == "__main__":
    print("Evidence Vault utilities. Use from your application.")
