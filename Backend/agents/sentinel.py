import sys
import os
import re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import faiss
import requests
import imagehash
from PIL import Image
from io import BytesIO

from agents.archivist import vector_db, metadata_store, embed_image_for_sentinel

# ─── Similarity thresholds (MobileNetV3-Large, 960-dim, L2-normalised) ────────
# After L2 normalisation, FAISS inner product = cosine similarity (range -1 to 1).
#
# MobileNetV3 raw feature cosine similarity for visual content:
#   ~0.95+ = near-identical frames (same video, minor re-encode)
#   ~0.85-0.95 = very similar (same scene, slight crop/color change)
#   ~0.75-0.85 = similar content (same sport/event, different angle)
#   <0.75 = different content
#
# We use a 2-layer detection:
#   Layer 1 (MobileNetV3 cosine): fast approximate match
#   Layer 2 (pHash): pixel-level cross-check for confirmed matches
#
# Thresholds are intentionally conservative (flag more, let Adjudicator filter):
MATCH_THRESHOLD   = 0.88   # high confidence visual match → confirmed piracy
SUSPECT_THRESHOLD = 0.75   # moderate similarity → flag for adjudication

# Confidence score mapping: cosine similarity → 0-100 scale
# We remap so that 0.75 = 75% confidence, 0.88 = 88%, etc.
# This is intuitive and consistent with the Adjudicator's threshold (55%)


def _fetch_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")


def _thumbnail_variants(thumbnail_url: str) -> list:
    """
    Return a list of image URLs to try for a given thumbnail URL.
    For YouTube, try maxresdefault → hqdefault → mqdefault → original.
    Higher-res thumbnails contain actual footage frames, improving match accuracy.
    """
    yt_match = re.search(r'/vi/([a-zA-Z0-9_-]+)/', thumbnail_url)
    if yt_match:
        vid_id = yt_match.group(1)
        return [
            f"https://i.ytimg.com/vi/{vid_id}/maxresdefault.jpg",
            f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
            f"https://i.ytimg.com/vi/{vid_id}/mqdefault.jpg",
            thumbnail_url,
        ]
    return [thumbnail_url]


def _cosine_to_confidence(similarity: float) -> float:
    """Map cosine similarity to a 0-100 confidence score."""
    return round(max(0.0, min(100.0, similarity * 100)), 2)


def _severity_from_confidence(confidence: float) -> str:
    if confidence >= 88:
        return "CRITICAL"
    if confidence >= 75:
        return "WARNING"
    return "INFO"


def scan_thumbnail(thumbnail_url: str) -> dict:
    """
    Scan a suspect thumbnail against the FAISS vault using MobileNetV3 embeddings.
    Tries multiple thumbnail resolutions and keeps the best match score.
    Falls back to pHash cross-check for high-similarity candidates.
    """
    if vector_db.ntotal == 0:
        return {"error": "FAISS vault is empty. Ingest an official video first."}

    urls = _thumbnail_variants(thumbnail_url)
    k    = min(3, vector_db.ntotal)

    best_similarity = -1.0
    best_sims       = None
    best_idxs       = None
    best_pil        = None

    for url in urls:
        try:
            img = _fetch_image(url)
            emb = embed_image_for_sentinel(img)
            sims, idxs = vector_db.search(emb, k=k)
            score = float(sims[0][0])
            if score > best_similarity:
                best_similarity = score
                best_sims       = sims
                best_idxs       = idxs
                best_pil        = img
        except Exception:
            continue

    if best_pil is None or best_sims is None:
        return {"error": f"Could not fetch or scan thumbnail: {thumbnail_url}"}

    best_confidence = _cosine_to_confidence(best_similarity)

    top_matches = []
    for sim, idx in zip(best_sims[0], best_idxs[0]):
        if idx == -1:
            continue
        meta = metadata_store.get(str(idx), {})
        top_matches.append({
            "vault_index":   int(idx),
            "similarity":    float(round(float(sim), 4)),
            "l2_distance":   float(round(1.0 - float(sim), 4)),
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
            suspect_hash = imagehash.phash(best_pil)
            best_idx     = top_matches[0]["vault_index"]
            vault_meta   = metadata_store.get(str(best_idx), {})
            video_path   = vault_meta.get("video_path", "")
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
        "l2_distance":      float(round(1.0 - best_similarity, 4)),
        "severity":         _severity_from_confidence(best_confidence),
        "phash_match":      bool(phash_match),
        "phash_score":      int(phash_score),
        "top_matches":      top_matches,
        "thumbnail_url":    thumbnail_url,
    }


def tool_scan_thumbnail(thumbnail_url: str) -> str:
    """Fetches a suspect thumbnail, runs MobileNetV3 + pHash dual detection against the FAISS vault."""
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

    if result["confidence_score"] >= 75:
        return f"[SUSPECT] Partial match. Confidence: {result['confidence_score']}% — flagged for review."

    return f"[CLEAN] No match. Confidence: {result['confidence_score']}%"
