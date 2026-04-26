import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import faiss
import requests
import imagehash
from PIL import Image
from io import BytesIO

from agents.archivist import vector_db, metadata_store, embed_image_for_sentinel

# ─── Cosine similarity thresholds (after L2 normalisation, inner product = cosine) ──
# 1.0 = identical, 0.0 = completely different
# EfficientNet-B0 is much more discriminative than MobileNetV3
MATCH_THRESHOLD   = 0.82   # above this = confirmed match (piracy)
SUSPECT_THRESHOLD = 0.65   # above this = suspect (needs adjudication)


def _fetch_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")


def _cosine_to_confidence(similarity: float) -> float:
    """Convert cosine similarity (0-1) to a 0-100 confidence score."""
    return round(max(0.0, min(100.0, similarity * 100)), 2)


def _severity_from_confidence(confidence: float) -> str:
    if confidence >= 85:
        return "CRITICAL"
    if confidence >= 60:
        return "WARNING"
    return "INFO"


def scan_thumbnail(thumbnail_url: str) -> dict:
    if vector_db.ntotal == 0:
        return {"error": "FAISS vault is empty. Ingest an official video first."}

    try:
        pil_image = _fetch_image(thumbnail_url)
    except Exception as e:
        return {"error": f"Could not fetch thumbnail: {e}"}

    embedding = embed_image_for_sentinel(pil_image)

    k = min(3, vector_db.ntotal)
    similarities, indices = vector_db.search(embedding, k=k)

    best_similarity = float(similarities[0][0])
    best_confidence = _cosine_to_confidence(best_similarity)

    top_matches = []
    for sim, idx in zip(similarities[0], indices[0]):
        if idx == -1:
            continue
        meta = metadata_store.get(str(idx), {})
        top_matches.append({
            "vault_index":   int(idx),
            "similarity":    float(round(float(sim), 4)),
            "l2_distance":   float(round(1.0 - float(sim), 4)),  # compat field
            "confidence":    float(_cosine_to_confidence(float(sim))),
            "source_video":  meta.get("video_path", "unknown"),
            "timestamp_sec": int(meta.get("timestamp_sec", 0)),
        })

    # Layer 2 — pHash cross-check for high-similarity candidates
    phash_match = False
    phash_score = 0
    if best_similarity >= SUSPECT_THRESHOLD and top_matches:
        try:
            import cv2
            suspect_hash = imagehash.phash(pil_image)
            # Use the best matching vault entry, not hardcoded index 0
            best_idx     = top_matches[0]["vault_index"]
            vault_meta   = metadata_store.get(str(best_idx), {})
            video_path   = vault_meta.get("video_path", "")
            # Resolve relative path from vault dir
            if video_path and not os.path.isabs(video_path):
                video_path = os.path.join(os.path.dirname(__file__), "..", video_path)
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
        "match_confirmed":  bool(best_similarity >= MATCH_THRESHOLD),
        "confidence_score": float(best_confidence),
        "l2_distance":      float(round(1.0 - best_similarity, 4)),  # compat
        "severity":         _severity_from_confidence(best_confidence),
        "phash_match":      bool(phash_match),
        "phash_score":      int(phash_score),
        "top_matches":      top_matches,
        "thumbnail_url":    thumbnail_url,
    }


def tool_scan_thumbnail(thumbnail_url: str) -> str:
    """Fetches a suspect thumbnail, runs EfficientNet-B0 + pHash dual detection against the FAISS vault."""
    result = scan_thumbnail(thumbnail_url)

    if "error" in result:
        return f"[ERROR] {result['error']}"

    if result["match_confirmed"]:
        top = result["top_matches"][0] if result["top_matches"] else {}
        return (
            f"[CRITICAL ANOMALY DETECTED] "
            f"Confidence: {result['confidence_score']}% | "
            f"Similarity: {top.get('similarity', '?')} | "
            f"pHash: {result['phash_match']} | "
            f"Matched vault frame at {top.get('timestamp_sec', '?')}s."
        )

    if result["confidence_score"] >= 60:
        return f"[SUSPECT] Partial match. Confidence: {result['confidence_score']}% — flagged for review."

    return f"[CLEAN] No match. Confidence: {result['confidence_score']}%"
