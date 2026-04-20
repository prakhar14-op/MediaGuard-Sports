import faiss
import numpy as np
import requests
import imagehash
from PIL import Image
from io import BytesIO
from crewai.tools import tool
from crewai import Agent

from agents.archivist import vector_db, metadata_store, embed_image_for_sentinel

MATCH_THRESHOLD   = 0.55  # L2 distance — below this is a confirmed match
SUSPECT_THRESHOLD = 0.75  # above MATCH but below this = warning zone


def _fetch_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")


def _l2_to_confidence(distance: float) -> float:
    """Convert L2 distance to a 0-100 confidence score."""
    return round(max(0.0, (1.0 - distance / 2.0)) * 100, 2)


def _severity_from_confidence(confidence: float) -> str:
    if confidence >= 85:
        return "CRITICAL"
    if confidence >= 60:
        return "WARNING"
    return "INFO"


def scan_thumbnail(thumbnail_url: str) -> dict:
    """
    Core scan function — fetches thumbnail, runs CLIP + pHash dual-layer detection.
    Returns a structured result dict consumed by both the FastAPI endpoint and the tool.
    """
    if vector_db.ntotal == 0:
        return {"error": "FAISS vault is empty. Run the Archivist first."}

    try:
        pil_image = _fetch_image(thumbnail_url)
    except Exception as e:
        return {"error": f"Could not fetch thumbnail: {e}"}

    # Layer 1 — CLIP vector similarity
    embedding = embed_image_for_sentinel(pil_image)
    distances, indices = vector_db.search(embedding, k=3)  # top-3 matches

    best_distance   = float(distances[0][0])
    best_confidence = _l2_to_confidence(best_distance)

    top_matches = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        meta = metadata_store.get(str(idx), {})
        top_matches.append({
            "vault_index":    int(idx),
            "l2_distance":    round(float(dist), 4),
            "confidence":     _l2_to_confidence(float(dist)),
            "source_video":   meta.get("video_path", "unknown"),
            "timestamp_sec":  meta.get("timestamp_sec", 0),
        })

    # Layer 2 — Perceptual hash cross-check (only if CLIP flagged it)
    phash_match = False
    phash_score = 0
    if best_distance < SUSPECT_THRESHOLD:
        try:
            suspect_hash = imagehash.phash(pil_image)
            # Compare against first vault frame thumbnail if available
            vault_meta = metadata_store.get("0", {})
            if vault_meta.get("video_path"):
                import cv2
                cap = cv2.VideoCapture(vault_meta["video_path"])
                ret, frame = cap.read()
                cap.release()
                if ret:
                    vault_pil   = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    vault_hash  = imagehash.phash(vault_pil)
                    hash_diff   = suspect_hash - vault_hash  # hamming distance
                    phash_score = max(0, 100 - (hash_diff * 4))
                    phash_match = hash_diff < 15
        except Exception:
            pass

    match_confirmed = best_distance < MATCH_THRESHOLD
    severity        = _severity_from_confidence(best_confidence)

    return {
        "match_confirmed":  match_confirmed,
        "confidence_score": best_confidence,
        "l2_distance":      round(best_distance, 4),
        "severity":         severity,
        "phash_match":      phash_match,
        "phash_score":      phash_score,
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
        return (
            f"[CRITICAL ANOMALY DETECTED] "
            f"Confidence: {result['confidence_score']}% | "
            f"L2: {result['l2_distance']} | "
            f"pHash match: {result['phash_match']} | "
            f"Top match at {result['top_matches'][0]['timestamp_sec']}s in vault."
        )

    if result["confidence_score"] >= 60:
        return (
            f"[SUSPECT] Partial match detected. "
            f"Confidence: {result['confidence_score']}% — routing for manual review."
        )

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
