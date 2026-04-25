import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import faiss
import requests
import imagehash
from PIL import Image
from io import BytesIO
from crewai.tools import tool
from crewai import Agent

from agents.archivist import vector_db, metadata_store, embed_image_for_sentinel

MATCH_THRESHOLD   = 0.55
SUSPECT_THRESHOLD = 0.75


def _fetch_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")


def _l2_to_confidence(distance: float) -> float:
    return round(max(0.0, (1.0 - distance / 2.0)) * 100, 2)


def _severity_from_confidence(confidence: float) -> str:
    if confidence >= 85:
        return "CRITICAL"
    if confidence >= 60:
        return "WARNING"
    return "INFO"


def scan_thumbnail(thumbnail_url: str) -> dict:
    if vector_db.ntotal == 0:
        return {"error": "FAISS vault is empty. Run the Archivist first."}

    try:
        pil_image = _fetch_image(thumbnail_url)
    except Exception as e:
        return {"error": f"Could not fetch thumbnail: {e}"}

    embedding = embed_image_for_sentinel(pil_image)

    # Clamp k so we never request more neighbours than vectors in the vault
    k = min(3, vector_db.ntotal)
    distances, indices = vector_db.search(embedding, k=k)

    best_distance   = float(distances[0][0])
    best_confidence = _l2_to_confidence(best_distance)

    top_matches = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        meta = metadata_store.get(str(idx), {})
        top_matches.append({
            "vault_index":   int(idx),
            "l2_distance":   float(round(float(dist), 4)),
            "confidence":    float(_l2_to_confidence(float(dist))),
            "source_video":  meta.get("video_path", "unknown"),
            "timestamp_sec": int(meta.get("timestamp_sec", 0)),
        })

    # Layer 2 — pHash cross-check (only runs when CLIP already suspects a match)
    phash_match = False
    phash_score = 0
    if best_distance < SUSPECT_THRESHOLD:
        try:
            import cv2
            suspect_hash = imagehash.phash(pil_image)
            vault_meta   = metadata_store.get("0", {})
            video_path   = vault_meta.get("video_path", "")
            if video_path and os.path.exists(video_path):
                cap = cv2.VideoCapture(video_path)
                ret, frame = cap.read()
                cap.release()
                if ret:
                    vault_pil   = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    vault_hash  = imagehash.phash(vault_pil)
                    hash_diff   = suspect_hash - vault_hash
                    phash_score = max(0, 100 - (hash_diff * 4))
                    phash_match = hash_diff < 15
        except Exception:
            pass

    return {
        "match_confirmed":  bool(best_distance < MATCH_THRESHOLD),
        "confidence_score": float(best_confidence),
        "l2_distance":      float(round(best_distance, 4)),
        "severity":         _severity_from_confidence(best_confidence),
        "phash_match":      bool(phash_match),
        "phash_score":      int(phash_score),
        "top_matches":      top_matches,
        "thumbnail_url":    thumbnail_url,
    }


@tool("Scan Suspect Thumbnail")
def tool_scan_thumbnail(thumbnail_url: str) -> str:
    """Fetches a suspect thumbnail, runs CLIP + pHash dual detection against the FAISS vault."""
    result = scan_thumbnail(thumbnail_url)

    if "error" in result:
        return f"[ERROR] {result['error']}"

    if result["match_confirmed"]:
        top = result["top_matches"][0] if result["top_matches"] else {}
        return (
            f"[CRITICAL ANOMALY DETECTED] "
            f"Confidence: {result['confidence_score']}% | "
            f"L2: {result['l2_distance']} | "
            f"pHash: {result['phash_match']} | "
            f"Matched vault frame at {top.get('timestamp_sec', '?')}s."
        )

    if result["confidence_score"] >= 60:
        return f"[SUSPECT] Partial match. Confidence: {result['confidence_score']}% — flagged for review."

    return f"[CLEAN] No match. Confidence: {result['confidence_score']}%"


sentinel_agent = Agent(
    role="The Sentinel",
    goal="Scan suspect thumbnails using CLIP + pHash dual-layer detection against the FAISS vault.",
    backstory="A relentless digital radar that never sleeps. Finds stolen frames in milliseconds.",
    verbose=True,
    allow_delegation=False,
    tools=[tool_scan_thumbnail],
    llm=None,
)
