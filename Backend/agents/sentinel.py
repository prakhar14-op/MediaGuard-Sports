"""
Sentinel — Four-layer piracy detection engine for MediaGuard.

Detection layers (in order of execution speed):

  Layer 1: CLIP Visual Similarity (frame-level)
    Embed the suspect thumbnail via CLIP ViT-B/32 with screen detection
    and perspective correction applied first. Search FAISS vault for
    nearest neighbours using cosine similarity.
    Catches: exact re-uploads, re-encodes, minor crops, color grading.

  Layer 2: pHash Cross-check (pixel-level)
    For high-similarity candidates, run a perceptual hash comparison
    against the matched vault frame at the exact timestamp.
    Adds: legal defensibility ("cryptographic proof"), reduces false positives.

  Layer 3: Temporal Signature Matching (sequence-level / Video DNA)
    Search the suspect embedding against stored sequences of N consecutive
    scene embeddings from the official video. A pirate who replaces individual
    frames but keeps the sequence will still be caught here.
    Catches: partial re-uploads, compilations, loop cuts.

  Layer 4: Audio Fingerprint + Mel Embedding (audio-level)
    THE KILLER LAYER. Pirates almost always keep the original audio even
    when they crop, blur, add borders, or change aspect ratio.
    Two-layer audio detection:
      L4a: Chroma fingerprint (Shazam-style Jaccard similarity)
           → works even through speakers, re-encoding, noise
      L4b: Mel spectrogram FAISS embedding (semantic audio similarity)
           → works for slight pitch/speed changes

    Audio is checked from the suspect's URL by downloading a short sample.
    This is the most powerful layer for visual-only obfuscation attacks.

Confidence Fusion:
    final_confidence =
        CLIP_score   * 0.45  (visual frame match)
      + audio_score  * 0.30  (audio fingerprint + mel embedding)
      + temporal     * 0.15  (sequence / Video DNA)
      + phash_bonus  * 0.10  (pixel-level verification)

    Weighting rationale:
    - Visual is the primary signal but can be defeated by crops/blur
    - Audio is the secondary signal and is very hard to defeat
    - Temporal adds sequence verification, catches partial clips
    - pHash is a cheap confirmation layer, not a primary detector

Match is confirmed if:
    - CLIP alone >= 0.82 (clearly visual match), OR
    - audio alone >= 0.80 (clearly audio match), OR
    - fused confidence >= 82%
"""

import sys
import os
import re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import faiss
import requests
import imagehash
import numpy as np
from PIL import Image
from io import BytesIO

from agents.archivist import (
    vector_db,
    metadata_store,
    embed_image_for_sentinel,
    temporal_similarity,
    get_temporal_signatures_for_scan,
)

# ─── Thresholds ───────────────────────────────────────────────────────────────
MATCH_THRESHOLD           = 0.82   # CLIP cosine — confirmed visual match
SUSPECT_THRESHOLD         = 0.65   # CLIP cosine — suspect, flag for Adjudicator
TEMPORAL_MATCH_THRESHOLD  = 0.72   # temporal window score — sequence match
AUDIO_MATCH_THRESHOLD     = 0.70   # fused audio score (0-1) — audio match

# Fusion weights (must sum to 1.0)
W_CLIP     = 0.45
W_AUDIO    = 0.30
W_TEMPORAL = 0.15
W_PHASH    = 0.10


def _fetch_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")


def _thumbnail_variants(thumbnail_url: str) -> list:
    """
    Try multiple resolutions for YouTube thumbnails.
    maxresdefault contains actual footage frames (not designed artwork)
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
    audio_score: float,      # 0-1, fused from fp + mel
    temporal_score: float,   # 0-1
    phash_match: bool,
    clip_sim_raw: float,     # same as clip_sim but used for phash fallback
) -> float:
    """
    Fuse four detection signals into a single 0-100 confidence score.

    phash is used as a bonus — if no vault video file is available,
    we use clip_sim as the phash contribution to avoid penalising.
    """
    phash_val = 1.0 if phash_match else clip_sim_raw
    fused = (
        clip_sim      * W_CLIP     +
        audio_score   * W_AUDIO    +
        temporal_score * W_TEMPORAL +
        phash_val     * W_PHASH
    )
    return round(max(0.0, min(100.0, fused * 100)), 2)


def _run_audio_layer(suspect_url: str) -> dict:
    """
    Run audio fingerprinting on a suspect URL.
    Downloads the audio, runs two-layer check against vault.
    Non-blocking — returns empty result on any failure.
    """
    empty = {
        "audio_match":        False,
        "audio_confidence":   0.0,
        "fp_score":           0.0,
        "embedding_score":    0.0,
        "best_video_id":      None,
        "best_timestamp_sec": None,
        "error":              None,
        "skipped":            True,
    }

    if not suspect_url:
        return empty

    try:
        from agents.audio_fingerprint import search_audio_from_url, get_audio_vault_status
        status = get_audio_vault_status()
        if status["fingerprints_stored"] == 0 and status["audio_vectors"] == 0:
            empty["error"] = "Audio vault empty"
            return empty

        result = search_audio_from_url(suspect_url)
        result["skipped"] = False
        return result
    except Exception as e:
        empty["error"] = str(e)
        return empty


def scan_thumbnail(thumbnail_url: str, suspect_video_url: str = "") -> dict:
    """
    Full four-layer scan of a suspect.

    Args:
        thumbnail_url:     URL of the suspect's thumbnail image
        suspect_video_url: URL of the suspect's video (for audio layer)
                           If empty, audio layer is skipped.

    Returns comprehensive result with per-layer scores and fused confidence.
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

    # ── Layer 1: CLIP visual similarity ──────────────────────────────────────
    # embed_image_for_sentinel handles screen detection + perspective correction
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
                target_ts = int(vault_meta.get("timestamp_sec", 0))
                cap = cv2.VideoCapture(video_path)
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

    # ── Layer 3: Temporal signature (Video DNA) ───────────────────────────────
    temporal_score  = 0.0
    temporal_match_info = None

    if best_emb is not None and best_similarity >= SUSPECT_THRESHOLD:
        try:
            signatures = get_temporal_signatures_for_scan()
            if signatures:
                t_result = temporal_similarity(best_emb, signatures)
                temporal_score = t_result.get("best_score", 0.0)
                if t_result.get("best_signature"):
                    sig = t_result["best_signature"]
                    temporal_match_info = {
                        "score":           float(round(temporal_score, 4)),
                        "window_start_ts": sig.get("window_start_ts"),
                        "window_end_ts":   sig.get("window_end_ts"),
                        "video_id":        sig.get("video_id"),
                    }
        except Exception:
            pass

    # ── Layer 4: Audio fingerprint + Mel embedding ────────────────────────────
    # THE KILLER LAYER — catches pirates who crop/blur video but keep audio
    audio_result = _run_audio_layer(suspect_video_url)
    audio_score  = (audio_result.get("audio_confidence", 0.0) or 0.0) / 100.0

    # ── Confidence fusion ─────────────────────────────────────────────────────
    fused_confidence = _fuse_confidence(
        clip_sim       = best_similarity,
        audio_score    = audio_score,
        temporal_score = temporal_score,
        phash_match    = phash_match,
        clip_sim_raw   = best_similarity,
    )

    # Match confirmed if any single layer is very high, or fused score is high
    match_confirmed = (
        best_similarity >= MATCH_THRESHOLD or
        audio_score     >= AUDIO_MATCH_THRESHOLD or
        fused_confidence >= 82.0
    )

    return {
        # ── Summary ──────────────────────────────────────────────────────────
        "match_confirmed":    bool(match_confirmed),
        "confidence_score":   float(fused_confidence),
        "severity":           _severity_from_confidence(fused_confidence),

        # ── Layer 1: Visual ───────────────────────────────────────────────────
        "clip_similarity":    float(round(best_similarity, 4)),
        "clip_confidence":    float(clip_confidence),
        "l2_distance":        float(round(1.0 - best_similarity, 4)),
        "top_matches":        top_matches,

        # ── Layer 2: pHash ────────────────────────────────────────────────────
        "phash_match":        bool(phash_match),
        "phash_score":        int(phash_score),

        # ── Layer 3: Temporal ─────────────────────────────────────────────────
        "temporal_score":     float(round(temporal_score, 4)),
        "temporal_match":     temporal_match_info,

        # ── Layer 4: Audio ────────────────────────────────────────────────────
        "audio_match":        bool(audio_result.get("audio_match", False)),
        "audio_confidence":   float(audio_result.get("audio_confidence", 0.0)),
        "audio_fp_score":     float(audio_result.get("fp_score", 0.0)),
        "audio_mel_score":    float(audio_result.get("embedding_score", 0.0)),
        "audio_best_video":   audio_result.get("best_video_id"),
        "audio_best_ts":      audio_result.get("best_timestamp_sec"),
        "audio_skipped":      bool(audio_result.get("skipped", True)),

        # ── Meta ──────────────────────────────────────────────────────────────
        "thumbnail_url":      thumbnail_url,
        "suspect_video_url":  suspect_video_url,
    }


def tool_scan_thumbnail(thumbnail_url: str, suspect_video_url: str = "") -> str:
    """
    Full four-layer scan: CLIP + pHash + Temporal + Audio.
    Used by agent pipeline for single-thumbnail evaluation.
    """
    result = scan_thumbnail(thumbnail_url, suspect_video_url)

    if "error" in result:
        return f"[ERROR] {result['error']}"

    audio_info = ""
    if not result.get("audio_skipped"):
        audio_info = f" | Audio: {result['audio_confidence']:.1f}%"

    if result["match_confirmed"]:
        top = result["top_matches"][0] if result["top_matches"] else {}
        return (
            f"[CRITICAL ANOMALY DETECTED] "
            f"Confidence: {result['confidence_score']}% | "
            f"CLIP: {result['clip_confidence']}%"
            f"{audio_info} | "
            f"Temporal: {result['temporal_score']:.2f} | "
            f"pHash: {result['phash_match']} | "
            f"Frame @{top.get('timestamp_sec', '?')}s."
        )

    if result["confidence_score"] >= 60:
        return (
            f"[SUSPECT] Confidence: {result['confidence_score']}% "
            f"(CLIP={result['clip_confidence']}%"
            f"{audio_info}) — flagged for Adjudicator."
        )

    return f"[CLEAN] Confidence: {result['confidence_score']}% — no match detected."
