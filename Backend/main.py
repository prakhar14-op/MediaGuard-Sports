from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import glob
import sys
import numpy as np
import threading
import re

sys.path.insert(0, os.path.dirname(__file__))

from agents.archivist import tool_ingest_video, vector_db
from agents.spider import crawl
from agents.sentinel import scan_thumbnail
from agents.adjudicator import adjudicate, batch_adjudicate
from agents.enforcer import issue_dmca
from agents.broker import deploy_contract

app = FastAPI(title="MediaGuard ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OFFICIAL_DIR = os.path.join(os.path.dirname(__file__), "assets", "official")
os.makedirs(OFFICIAL_DIR, exist_ok=True)

# ── Write YouTube cookies to disk at startup ──────────────────────────────────
# Render env vars support long values — we decode once at startup so every
# yt-dlp call can use the same file path without re-decoding each time.
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
        lines = decoded.count("\n")
        print(f"[Ingest] Cookies written to {COOKIES_PATH} ({lines} lines)")
    except Exception as e:
        print(f"[Ingest] Failed to decode YOUTUBE_COOKIES_B64: {e}")

_setup_cookies()

# In-memory job store for async ingest tracking
_ingest_jobs: dict = {}


class IngestRequest(BaseModel):
    official_video_url: str
    job_id: str
    video_title: str = ""  # optional — used by Spider for search queries when URL has no metadata


class HuntRequest(BaseModel):
    official_video_url: str
    official_title: str = ""  # optional — used when URL is not YouTube


class ScanRequest(BaseModel):
    thumbnail_url:  str
    account_handle: str = ""
    platform:       str = "Unknown"
    title:          str = ""
    url:            str = ""
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
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enforcer failed: {e}")


class BrokerRequest(BaseModel):
    target_account:   str
    platform:         str
    video_title:      str
    video_url:        str = ""
    justification:    str = ""
    view_count:       int = 0
    risk_score:       int = 30


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
        )
        return {"success": True, "verdict": verdict}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adjudicator failed: {e}")


@app.post("/adjudicate/batch")
def adjudicate_batch(payload: BatchAdjudicateRequest):
    results = batch_adjudicate(payload.incidents)
    return {"success": True, "results": results, "total": len(results)}


@app.post("/scan")
def scan_suspect(payload: ScanRequest):
    result = scan_thumbnail(payload.thumbnail_url)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"success": True, **result}


@app.post("/scan/batch")
def batch_scan(payload: BatchScanRequest):
    results = []
    for node in payload.threat_nodes:
        thumbnail_url = node.get("thumbnail_url", "")
        if not thumbnail_url:
            continue
        result = scan_thumbnail(thumbnail_url)
        results.append({"node": node, "scan": result})
    return {"success": True, "results": results, "total": len(results)}


@app.get("/")
def health():
    return {"status": "MediaGuard ML API online", "vault_size": vector_db.ntotal}


@app.get("/debug/cookies")
def debug_cookies():
    """Check if YouTube cookies are loaded correctly."""
    exists = os.path.exists(COOKIES_PATH)
    size   = os.path.getsize(COOKIES_PATH) if exists else 0
    env_set = bool(os.getenv("YOUTUBE_COOKIES_B64", "").strip())
    return {
        "cookies_file_exists": exists,
        "cookies_file_size_bytes": size,
        "env_var_set": env_set,
        "cookies_path": COOKIES_PATH,
    }


@app.get("/vault/status")
def vault_status():
    return {"vault_size": vector_db.ntotal, "status": "ready" if vector_db.ntotal > 0 else "empty"}


@app.post("/ingest")
def ingest_asset(payload: IngestRequest, background_tasks: BackgroundTasks):
    """
    Returns immediately with job_id.
    The actual download + embedding runs in a background thread.
    Poll /ingest/status/{job_id} to check progress.
    """
    job_id = payload.job_id
    url    = payload.official_video_url
    provided_title = payload.video_title.strip()

    # Mark job as started
    _ingest_jobs[job_id] = {"status": "downloading", "message": "Downloading via yt-dlp…"}

    def _run():
        import yt_dlp
        import urllib.request
        try:
            # ── Detect direct video file URL vs platform URL ──────────────────
            is_direct = any(url.lower().split("?")[0].endswith(ext) for ext in
                           ('.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v'))
            is_direct = is_direct or any(host in url for host in [
                'drive.google.com/uc', 'dl.dropboxusercontent.com',
                'storage.googleapis.com', 'amazonaws.com', 'cloudfront.net',
            ])

            if is_direct:
                # ── Direct download — handle Google Drive confirmation page ───
                local_path = os.path.join(OFFICIAL_DIR, f"{job_id}.mp4")
                print(f"[Ingest] Direct URL — downloading")
                _ingest_jobs[job_id]["message"] = "Downloading video file..."

                # Google Drive: convert share URL to direct download URL
                gdrive_match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
                if gdrive_match or 'drive.google.com' in url:
                    file_id = gdrive_match.group(1) if gdrive_match else re.search(r'id=([a-zA-Z0-9_-]+)', url).group(1)
                    direct_url = f"https://drive.google.com/uc?export=download&confirm=t&id={file_id}"
                    print(f"[Ingest] Google Drive file_id={file_id} → {direct_url}")
                else:
                    direct_url = url

                # Use requests with session to handle redirects properly
                import requests as req_lib
                session = req_lib.Session()
                resp = session.get(direct_url, stream=True, timeout=300,
                                   headers={"User-Agent": "Mozilla/5.0"})
                resp.raise_for_status()

                # Check we got actual video content, not HTML
                content_type = resp.headers.get("Content-Type", "")
                if "text/html" in content_type:
                    raise ValueError(f"Got HTML instead of video — Drive link may require sign-in or 'Anyone with link' sharing. Content-Type: {content_type}")

                with open(local_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            f.write(chunk)

                file_size = os.path.getsize(local_path)
                print(f"[Ingest] Downloaded {file_size} bytes to {local_path}")

                if file_size < 100_000:
                    raise ValueError(f"Downloaded file too small ({file_size} bytes) — likely not a video. Make sure Drive sharing is set to 'Anyone with the link'.")

                # Use filename as title, strip extension
                title = url.split("/")[-1].split("?")[0].rsplit(".", 1)[0] or "Official Video"

            else:
                # ── Platform URL — use yt-dlp ─────────────────────────────────
                ydl_opts = {
                    "outtmpl":     os.path.join(OFFICIAL_DIR, f"{job_id}.%(ext)s"),
                    "format":      "best",
                    "quiet":       False,
                    "no_warnings": False,
                }
                if os.path.exists(COOKIES_PATH):
                    ydl_opts["cookiefile"] = COOKIES_PATH
                    print(f"[Ingest] Using cookies from {COOKIES_PATH}")
                else:
                    print("[Ingest] No cookies — attempting unauthenticated download")

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info  = ydl.extract_info(url, download=True)
                    title = info.get("title", "Unknown")

                # Find downloaded file and normalise extension
                matches = glob.glob(os.path.join(OFFICIAL_DIR, f"{job_id}.*"))
                if not matches:
                    _ingest_jobs[job_id] = {"status": "failed", "message": "Downloaded file not found"}
                    return
                local_path = matches[0]
                ext = os.path.splitext(local_path)[1].lower()
                if ext not in (".mp4", ".webm", ".mkv", ".avi", ".mov"):
                    new_path = os.path.splitext(local_path)[0] + ".mp4"
                    os.rename(local_path, new_path)
                    local_path = new_path

            _ingest_jobs[job_id] = {"status": "processing", "message": "Embedding frames…"}

            result = tool_ingest_video(local_path)
            if "[ERROR]" in result:
                _ingest_jobs[job_id] = {"status": "failed", "message": result}
                return

            frame_count = 0
            try:
                frame_count = int(result.split("Extracted ")[1].split(" frames")[0])
            except Exception:
                pass

            _ingest_jobs[job_id] = {
                "status":      "complete",
                "title":       provided_title or title,
                "local_path":  local_path,
                "frame_count": frame_count,
                "vault_size":  vector_db.ntotal,
                "tx_hash":     "0x" + np.random.bytes(32).hex(),
                "message":     result,
            }
        except Exception as e:
            _ingest_jobs[job_id] = {"status": "failed", "message": str(e)}

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    return {"success": True, "job_id": job_id, "status": "downloading",
            "message": "Ingest started. Poll /ingest/status/{job_id} for progress."}


@app.get("/ingest/status/{job_id}")
def ingest_status(job_id: str):
    """Poll this endpoint to check ingest progress."""
    job = _ingest_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"success": True, "job_id": job_id, **job}


@app.post("/hunt")
def trigger_hunt(payload: HuntRequest):
    result = crawl(payload.official_video_url, official_title=payload.official_title)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return {"success": True, "data": result}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
