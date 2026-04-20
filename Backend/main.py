from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json
import os
import glob
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from agents.archivist import tool_ingest_video, vector_db
from agents.spider import tool_crawl_web, spider_agent
from agents.sentinel import scan_thumbnail
from agents.adjudicator import adjudicate, batch_adjudicate
from agents.enforcer import issue_dmca
from agents.broker import deploy_contract
from crewai import Task, Crew

app = FastAPI(title="MediaGuard ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OFFICIAL_DIR = os.path.join(os.path.dirname(__file__), "assets", "official")
PAYLOAD_PATH = os.path.join(os.path.dirname(__file__), "assets", "suspects", "spider_payload.json")
os.makedirs(OFFICIAL_DIR, exist_ok=True)


class IngestRequest(BaseModel):
    official_video_url: str
    job_id: str


class HuntRequest(BaseModel):
    official_video_url: str


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


@app.get("/vault/status")
def vault_status():
    return {"vault_size": vector_db.ntotal, "status": "ready" if vector_db.ntotal > 0 else "empty"}


@app.post("/ingest")
def ingest_asset(payload: IngestRequest):
    import yt_dlp

    url    = payload.official_video_url
    job_id = payload.job_id

    ydl_opts = {
        "outtmpl": os.path.join(OFFICIAL_DIR, f"{job_id}.%(ext)s"),
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "quiet": True,
        "merge_output_format": "mp4",
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info  = ydl.extract_info(url, download=True)
            title = info.get("title", "Unknown")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {e}")

    # Glob for the actual downloaded file — extension may differ from info dict
    matches = glob.glob(os.path.join(OFFICIAL_DIR, f"{job_id}.*"))
    if not matches:
        raise HTTPException(status_code=500, detail="Downloaded file not found on disk")

    local_path = matches[0]

    # Call the Archivist tool directly (not via CrewAI agent — no LLM needed here)
    result = tool_ingest_video.func(local_path)

    if "[ERROR]" in result:
        raise HTTPException(status_code=500, detail=result)

    frame_count = 0
    try:
        frame_count = int(result.split("Extracted ")[1].split(" frames")[0])
    except Exception:
        pass

    return {
        "success":     True,
        "title":       title,
        "local_path":  local_path,
        "frame_count": frame_count,
        "vault_size":  vector_db.ntotal,
        "tx_hash":     "0x" + np.random.bytes(32).hex(),
        "message":     result,
    }


@app.post("/hunt")
def trigger_hunt(payload: HuntRequest):
    import yt_dlp

    try:
        with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
            info  = ydl.extract_info(payload.official_video_url, download=False)
            title = info.get("title", "Unknown Video")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Title extraction failed: {e}")

    task = Task(
        description=f"Crawl for infringements of '{title}'. Assign them to country centroids.",
        expected_output="A JSON map payload with dynamic coordinates.",
        agent=spider_agent,
    )
    Crew(agents=[spider_agent], tasks=[task]).kickoff()

    if not os.path.exists(PAYLOAD_PATH):
        raise HTTPException(status_code=500, detail="Spider payload not generated")

    with open(PAYLOAD_PATH, "r") as f:
        data = json.load(f)

    return {"success": True, "data": data}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
