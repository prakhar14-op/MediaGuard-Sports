from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json
import os

# Initialize the API
app = FastAPI(title="SENTINEL Threat Intelligence API")

# Enable CORS so your React frontend can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change this to your Vercel/Netlify React URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# DATA MODELS (What the React UI sends us)
# ==========================================
class HuntRequest(BaseModel):
    official_video_url: str

# ==========================================
# API ENDPOINTS
# ==========================================
@app.get("/")
def read_root():
    return {"status": "Sentinel API is Online and Listening."}

@app.post("/api/hunt")
def trigger_threat_hunt(payload: HuntRequest):
    """
    The React UI hits this endpoint with the video URL.
    This wakes up the Spider to scrape and hunt.
    """
    target_url = payload.official_video_url
    print(f"\n[API] 🚨 NEW HUNT TRIGGERED! Target URL: {target_url}")
    
    # -------------------------------------------------------------
    # 1. WAKE UP THE SPIDER (Integration)
    # In the full version, you would import your spider_agent here 
    # and pass it the target_url. For now, we simulate the completion.
    # -------------------------------------------------------------
    print("[API] Waking up The Spider...")
    print("[API] Extracting Title and crawling the web...")
    
    # 2. Check if the Spider successfully generated the map payload
    payload_path = "assets/suspects/spider_payload.json"
    
    if os.path.exists(payload_path):
        with open(payload_path, "r") as f:
            threat_map_data = json.load(f)
            
        return {
            "status": "success",
            "message": "Hunt completed. Suspects secured.",
            "data": threat_map_data  # Sending the array back to React!
        }
    else:
        # Fallback if the Spider hasn't run yet
        return {
            "status": "partial_success",
            "message": "API received the URL, but the Spider payload is missing. Run spider.py first!",
            "data": []
        }

# ==========================================
# SERVER RUNNER
# ==========================================
if __name__ == "__main__":
    print("Starting FastAPI Server on port 8000...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)