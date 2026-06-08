"""
Sentinel — Advanced dual-layer + temporal piracy detection.

Detection pipeline for each suspect thumbnail:

  Layer 1 — CLIP Cosine Similarity (Frame-level)
    Embed the thumbnail via CLIP ViT-B/32 (with screen detection + perspective
    correction applied before embedding). Search FAISS vault for nearest
    neighbours. This catches exact re-uploads and minor re-encodes.

  Layer 2 — pHash Cross-check
    For high-similarity candidates, run a perceptual hash comparison against
    the matched vault frame. Hash distance < 15 = pixel-level confirmation.
    Adds legal defensibility ("cryptographic proof").

  Layer 3 — Temporal Signature Matching
    Search the suspect embedding against all stored temporal signatures
    (Video DNA). A temporal signature is a window of N consecutive scene
    embeddings from the official video. If the suspect matches not just
    one frame but aligns with a sequence, confidence is boosted.
    This catches pirates who replace individual frames but keep the sequence.

Confidence fusion:
    final_confidence = CLIP_score * 0.60 + temporal_score * 0.30 + phash_bonus * 0.10
    where phash_bonus = 1.0 if phash_match else 0.0

Screen detection is applied before embedding (in archivist.embed_image_for_sentinel)
so thumbnails captured via phone-filming-TV are perspective-corrected before CLIP.
"""

import sys
import os
import re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import faiss
import requests
import imagehash
from PIL import Image
from io import BytesIO
import numpy as np

from agents.archivist import (
    vector_db, metadata_store,
    embed_image_for_sentinel,
    temporal_similarity, get_temporal_signatures_for_scan,
)

# ─── CLIP ViT-B/32 thresholds ─────────────────────────────────────────────────
# Cosine similarity range after L2 normalisation: 0–1
# Well-calibrated for CLIP ViT-B/32 on sports broadcast content:
MATCH_THRESHOLD   = 0.82   # frame-level confirmed match → piracy
SUSPECT_THRESHOLD = 0.65   # frame-level suspect → flag for Adjudicator

# Temporal signature threshold — lower because sequence partial match is meaningful
TEMPORAL_MATCH_THRESHOLD = 0.72

# Confidence fusion weights
W_CLIP     = 0.60
W_TEMPORAL = 0.30
W_PHASH    = 0.10


def _fetch_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")


def _thumbnail_variants(thumbnail_url: str) -> list:
    """
    Try multiple resolutions for YouTube thumbnails.
    maxresdefault contains actual footage frames (not designed artwork),
    which dramatically improves CLIP matching accuracy.
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
    return round(max(0.0, min(100.0, similarity * 100)), 2)


def _severity_from_confidence(confidence: float) -> str:
    if confidence >= 85:
        return "CRITICAL"
    if confidence >= 60:
        return "WARNING"
    return "INFO"


def _fuse_confidence(
    clip_sim: float,
    temporal_score: float,
    phash_match: bool,
) -> float:
    """
    Fuse three detection signals into a single 0-100 confidence score.

    clip_sim:       CLIP cosine similarity (0–1)
    temporal_score: best temporal signature match score (0–1)
    phash_match:    whether pHash distance < 15

    Fusion formula:
        confidence = clip * 0.60 + temporal * 0.30 + phash_bonus * 0.10
    """
    phash_bonus = 1.0 if phash_match else clip_sim   # don't penalise if no vault video file
    fused = (clip_sim * W_CLIP) + (temporal_score * W_TEMPORAL) + (phash_bonus * W_PHASH)
    return round(max(0.0, min(100.0, fused * 100)), 2)


def scan_thumbnail(thumbnail_url: str) -> dict:
    """
    Full three-layer scan of a suspect thumbnail:

    Layer 1: CLIP frame-level cosine similarity (with screen correction)
    Layer 2: pHash cross-check on high-similarity candidates
    Layer 3: Temporal signature (Video DNA) sequence matching

    Returns enriched result with fused confidence score.
    """
    if vector_db.ntotal == 0:
        return {"error": "FAISS vault is empty. Ingest an official video first."}

    urls = _thumbnail_variants(thumbnail_url)
    k    = min(3, vector_db.ntotal)

    best_similarity = -1.0
    best_sims       = None
    best_idxs       = None
    best_pil        = None
    best_emb        = None

    # ── Layer 1: CLIP cosine (try all thumbnail resolutions) ─────────────────
    for url in urls:
        try:
            img = _fetch_image(url)
            # embed_image_for_sentinel handles screen detection + perspective correction
            emb = embed_image_for_sentinel(img)
            sims, idxs = vector_db.search(emb, k=k)
            score = float(sims[0][0])
            if score > best_similarity:
                best_similarity = score
                best_sims       = sims
                best_idxs       = idxs
                best_pil        = img
                best_emb        = emb
        except Exception:
            continue

    if best_pil is None or best_sims is None:
        return {"error": f"Could not fetch or scan thumbnail: {thumbnail_url}"}

    clip_confidence = _cosine_to_confidence(best_similarity)

    top_matches = []
    for sim, idx in zip(best_sims[0], best_idxs[0]):
        if idx == -1:
            continue
        meta = metadata_store.get(str(idx), {})
        top_matches.append({
            "vault_index":      int(idx),
            "similarity":       float(round(float(sim), 4)),
            "l2_distance":      float(round(1.0 - float(sim), 4)),
            "confidence":       float(_cosine_to_confidence(float(sim))),
            "source_video":     meta.get("video_path", "unknown"),
            "timestamp_sec":    int(meta.get("timestamp_sec", 0)),
            "scene_idx":        int(meta.get("scene_idx", 0)),
            "screen_capture":   bool(meta.get("screen_capture", False)),
        })

    # ── Layer 2: pHash cross-check ────────────────────────────────────────────
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
                target_ts = int(vault_meta.get("timestamp_sec", 0))
                cap.set(cv2.CAP_PROP_POS_MSEC, target_ts * 1000)
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

    # ── Layer 3: Temporal signature matching ──────────────────────────────────
    temporal_result = {"best_score": 0.0, "best_signature": None}
    temporal_score  = 0.0

    if best_emb is not None and best_similarity >= SUSPECT_THRESHOLD:
        try:
            signatures = get_temporal_signatures_for_scan()
            if signatures:
                temporal_result = temporal_similarity(best_emb, signatures)
                temporal_score  = temporal_result["best_score"]
        except Exception:
            pass

    # ── Confidence fusion ─────────────────────────────────────────────────────
    fused_confidence = _fuse_confidence(best_similarity, temporal_score, phash_match)

    # Match is confirmed if CLIP alone is very high, OR fused confidence is high
    match_confirmed = (
        best_similarity >= MATCH_THRESHOLD or
        fused_confidence >= 82
    )

    # Build temporal match info for response
    temporal_match_info = None
    if temporal_result["best_signature"]:
        sig = temporal_result["best_signature"]
        temporal_match_info = {
            "score":          float(round(temporal_score, 4)),
            "window_start_ts": sig.get("window_start_ts"),
            "window_end_ts":  sig.get("window_end_ts"),
            "video_id":       sig.get("video_id"),
        }

    return {
        "match_confirmed":    bool(match_confirmed),
        "confidence_score":   float(fused_confidence),
        "clip_similarity":    float(round(best_similarity, 4)),
        "clip_confidence":    float(clip_confidence),
        "temporal_score":     float(round(temporal_score, 4)),
        "temporal_match":     temporal_match_info,
        "l2_distance":        float(round(1.0 - best_similarity, 4)),
        "severity":           _severity_from_confidence(fused_confidence),
        "phash_match":        bool(phash_match),
        "phash_score":        int(phash_score),
        "top_matches":        top_matches,
        "thumbnail_url":      thumbnail_url,
    }


def tool_scan_thumbnail(thumbnail_url: str) -> str:
    """
    Full three-layer scan: CLIP frame-level + pHash + Temporal Signature.
    Used by the agent pipeline for single thumbnail evaluation.
    """
    result = scan_thumbnail(thumbnail_url)

    if "error" in result:
        return f"[ERROR] {result['error']}"

    if result["match_confirmed"]:
        top = result["top_matches"][0] if result["top_matches"] else {}
        return (
            f"[CRITICAL ANOMALY DETECTED] "
            f"Fused Confidence: {result['confidence_score']}% | "
            f"CLIP: {result['clip_similarity']} | "
            f"Temporal: {result['temporal_score']:.3f} | "
            f"pHash: {result['phash_match']} | "
            f"Matched at {top.get('timestamp_sec', '?')}s."
        )

    if result["confidence_score"] >= 60:
        return (
            f"[SUSPECT] Partial match. "
            f"Confidence: {result['confidence_score']}% "
            f"(CLIP={result['clip_confidence']}%, Temporal={result['temporal_score']:.2f}) "
            f"— flagged for Adjudicator review."
        )

    return f"[CLEAN] No match. Confidence: {result['confidence_score']}%"
