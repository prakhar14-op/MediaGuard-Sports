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
