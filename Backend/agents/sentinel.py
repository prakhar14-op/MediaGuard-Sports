"""
Sentinel — Five-layer piracy detection engine for MediaGuard.

Detection strategy:
  The system scans suspect content the same way it ingests official content.
  For each suspect URL:
    1. Download a short clip (first 90s) via yt-dlp — platform agnostic
    2. Extract frames at scene boundaries (same as archivist)
    3. CLIP embed each frame → search FAISS vault
    4. Take best visual match across ALL frames (not just thumbnail)
    5. Run audio fingerprint against vault
    6. Run temporal signature matching
    7. Run forensics chain analysis
    8. Fuse all signals

  This is fundamentally different from thumbnail-only scanning:
  - Thumbnail is 1 image; video scan is N frames (10-30 scene boundaries)
  - Pirates often change thumbnails but not video content
  - Audio is extracted from actual video, not thumbnail
  - A 90s sample captures enough temporal DNA to match

  Fallback for no-download cases (batch mode, no URL):
  - Still tries thumbnail + multiple resolution variants
  - Still runs all non-video layers (temporal, forensics, pHash)

Detection layers:
  Layer 1: CLIP Visual (all extracted frames vs vault)
  Layer 2: pHash pixel verification
  Layer 3: Temporal DNA matching
  Layer 4: Audio fingerprint + Mel embedding
  Layer 5: Forensic platform chain

Fusion weights:
  CLIP=0.45, Audio=0.30, Temporal=0.15, pHash=0.10
"""

import sys
import os
import re
import glob
import tempfile
import threading
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import cv2
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
    _bgr_histogram,
    _is_scene_change,
    detect_screen_capture,
    correct_perspective,
    _embed_batch,
    SCENE_HIST_THRESHOLD,
    BATCH_SIZE,
)

try:
    from agents.audio_fingerprint import search_audio, search_audio_from_url, get_audio_vault_status
except Exception:
    search_audio = None
    search_audio_from_url = None
    get_audio_vault_status = None

from agents.forensics import analyze_image_chain

# OCR is optional — may not be installed
try:
    from agents.text_ocr import extract_text_from_video_path
    _OCR_AVAILABLE = True
except ImportError:
    _OCR_AVAILABLE = False
    def extract_text_from_video_path(path):
        return {"has_subtitles": False, "has_watermark": False, "total_confidence": 0.0}

# ─── Thresholds (industry-standard) ──────────────────────────────────────────
# YouTube Content ID: ~0.75 visual, ~0.65 audio for confirmation.
# Our multi-layer fusion: lower per-layer thresholds, combined strength.
MATCH_THRESHOLD           = 0.78   # CLIP cosine — confirmed piracy
SUSPECT_THRESHOLD         = 0.52   # CLIP cosine — flag for adjudication
TEMPORAL_MATCH_THRESHOLD  = 0.62   # Video DNA sequence match
AUDIO_MATCH_THRESHOLD     = 0.62   # Audio fingerprint confirmation

# Fusion weights (configurable via environment variables)
W_CLIP     = float(os.environ.get("FUSION_WEIGHT_CLIP", "0.40"))
W_AUDIO    = float(os.environ.get("FUSION_WEIGHT_AUDIO", "0.28"))
W_TEMPORAL = float(os.environ.get("FUSION_WEIGHT_TEMPORAL", "0.12"))
W_PHASH    = float(os.environ.get("FUSION_WEIGHT_PHASH", "0.10"))
W_TEXT     = float(os.environ.get("FUSION_WEIGHT_TEXT", "0.08"))
W_SOURCE_REP = float(os.environ.get("FUSION_WEIGHT_SOURCE_REP", "0.02"))

# How many seconds to sample from suspect video
# 90s is enough to get ~10-20 scene boundaries and meaningful audio
SUSPECT_CLIP_DURATION = int(os.environ.get("SUSPECT_CLIP_DURATION", "90"))


# ═══════════════════════════════════════════════════════════════════════════════
# VIDEO DOWNLOAD — platform agnostic via yt-dlp
# ═══════════════════════════════════════════════════════════════════════════════

def _download_suspect_clip(url: str, output_dir: str, duration_sec: int = SUSPECT_CLIP_DURATION) -> str | None:
    """
    Download the first `duration_sec` seconds of a suspect video.
    Uses yt-dlp — works for YouTube, TikTok, Vimeo, Dailymotion, Twitch,
    Twitter/X, Facebook, Reddit (v.redd.it), Instagram (with cookies), etc.

    Returns local file path, or None on failure.
    """
    import yt_dlp

    out_tmpl     = os.path.join(output_dir, "suspect.%(ext)s")
    cookies_path = os.path.join(os.path.dirname(__file__), "..", "yt_cookies.txt")

    ydl_opts = {
        "outtmpl":         out_tmpl,
        "format":          "best",
        "quiet":           True,
        "noplaylist":      True,
        "socket_timeout":  12,
    }
    # Add ffmpeg location
    try:
        from agents.audio_fingerprint import _get_ffmpeg_exe
        _ffmpeg = _get_ffmpeg_exe()
        if _ffmpeg:
            ydl_opts["ffmpeg_location"] = os.path.dirname(_ffmpeg)
            # Limit download to first N seconds
            ydl_opts["external_downloader"] = _ffmpeg
            ydl_opts["external_downloader_args"] = {"ffmpeg_i": ["-t", str(duration_sec)]}
    except Exception:
        pass
    if os.path.exists(cookies_path):
        ydl_opts["cookiefile"] = cookies_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Find downloaded file
        files = glob.glob(os.path.join(output_dir, "suspect.*"))
        if files:
            return files[0]
    except Exception as e:
        print(f"[Sentinel] yt-dlp download failed for {url[:60]}: {e}")

    return None


def _download_suspect_clip_ffmpeg(url: str, output_dir: str, duration_sec: int = SUSPECT_CLIP_DURATION) -> str | None:
    """
    Fallback: direct ffmpeg download for direct-link videos (.mp4, .m3u8, etc.)
    Used when yt-dlp fails for direct media URLs.
    """
    import subprocess
    from agents.audio_fingerprint import _get_ffmpeg_exe

    out_path = os.path.join(output_dir, "suspect_direct.mp4")
    try:
        ffmpeg = _get_ffmpeg_exe()
        result = subprocess.run([
            ffmpeg, "-y",
            "-t", str(duration_sec),
            "-i", url,
            "-c", "copy",
            "-f", "mp4",
            out_path,
        ], capture_output=True, timeout=60)
        if result.returncode == 0 and os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
            return out_path
    except Exception as e:
        print(f"[Sentinel] ffmpeg direct download failed: {e}")
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# FRAME EXTRACTION — same scene-detection logic as archivist
# ═══════════════════════════════════════════════════════════════════════════════

def _extract_scene_frames(video_path: str, sample_sec: float = 1.0) -> list[Image.Image]:
    """
    Extract scene-boundary frames from a video file.
    Uses the exact same histogram + scene detection logic as archivist.
    Returns list of PIL images (RGB) at scene boundaries.

    This ensures suspect frames are in the same embedding space
    as the official video frames stored in the vault.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return []

    fps   = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    frames   = []
    prev_hist = None
    prev_gray = None
    frame_id  = 0
    last_sample_frame = 0

    while frame_id < min(total, int(fps * SUSPECT_CLIP_DURATION * 1.5)):
        ret, frame = cap.read()
        if not ret:
            break
        
        # Compute current grayscale frame for motion detection
        curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Compute motion magnitude between current and previous frame
        # For performance, we'll use a simpler version here for suspect scan
        motion = 0.5
        if prev_gray is not None:
            try:
                # Use frame difference as a simpler motion metric (faster than optical flow)
                diff = cv2.absdiff(prev_gray, curr_gray)
                motion = np.mean(diff) / 255.0
            except Exception:
                pass
        
        # Adaptive sampling
        if motion > 0.3:  # high motion
            adaptive_interval = max(1, int(fps * 0.5))
        elif motion > 0.15:  # medium motion
            adaptive_interval = max(1, int(fps * 1.0))
        else:  # low motion
            adaptive_interval = max(1, int(fps * 2.0))
            
        if (frame_id - last_sample_frame) >= adaptive_interval:
            last_sample_frame = frame_id
            curr_hist = _bgr_histogram(frame)
            if _is_scene_change(prev_hist, curr_hist):
                # Screen correction (same as archivist)
                screen_info = detect_screen_capture(frame)
                if screen_info["is_screen_capture"] and screen_info["screen_corners"]:
                    frame = correct_perspective(frame, screen_info["screen_corners"])
                pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                frames.append(pil)
                prev_hist = curr_hist
        
        prev_gray = curr_gray
        frame_id += 1

    cap.release()
    return frames


# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-FRAME CLIP SCAN — core of the new pipeline
# ═══════════════════════════════════════════════════════════════════════════════

def _scan_frames_against_vault(frames: list[Image.Image]) -> tuple[float, list, np.ndarray | None]:
    """
    Embed all frames via CLIP and search vault for each.
    Returns: (best_similarity, top_matches, best_embedding)

    This is equivalent to running the ingest pipeline on the suspect video
    and then doing a vault search — catches matches that no thumbnail would.
    """
    if not frames or vector_db.ntotal == 0:
        return -1.0, [], None

    k = min(3, vector_db.ntotal)

    best_similarity = -1.0
    best_matches    = []
    best_emb        = None

    # Process in batches (same batch size as archivist)
    for i in range(0, len(frames), BATCH_SIZE):
        batch = frames[i:i + BATCH_SIZE]
        try:
            embeddings = _embed_batch(batch)   # (N, 512) float32
        except Exception as e:
            print(f"[Sentinel] Batch embed failed: {e}")
            continue

        for emb in embeddings:
            emb_2d = emb.reshape(1, -1)
            sims, idxs = vector_db.search(emb_2d, k=k)
            score = float(sims[0][0])

            if score > best_similarity:
                best_similarity = score
                best_emb        = emb.copy()
                best_matches    = []
                for s, idx in zip(sims[0], idxs[0]):
                    if idx == -1:
                        continue
                    meta = metadata_store.get(str(idx), {})
                    best_matches.append({
                        "vault_index":    int(idx),
                        "similarity":     float(round(float(s), 4)),
                        "l2_distance":    float(round(1.0 - float(s), 4)),
                        "confidence":     float(_cosine_to_confidence(float(s))),
                        "source_video":   meta.get("video_path", "unknown"),
                        "timestamp_sec":  int(meta.get("timestamp_sec", 0)),
                        "scene_idx":      int(meta.get("scene_idx", 0)),
                        "screen_capture": bool(meta.get("screen_capture", False)),
                    })

    return best_similarity, best_matches, best_emb


# ═══════════════════════════════════════════════════════════════════════════════
# THUMBNAIL FALLBACK — for when video download fails
# ═══════════════════════════════════════════════════════════════════════════════

def _thumbnail_variants(thumbnail_url: str) -> list[str]:
    """
    Generate multiple thumbnail URL variants for better coverage.
    YouTube: tries maxresdefault → hqdefault → mqdefault.
    Other platforms: tries direct URL only.
    """
    if not thumbnail_url:
        return []

    # YouTube thumbnail variants (much higher quality than default)
    yt_match = re.search(r'/vi/([a-zA-Z0-9_-]+)/', thumbnail_url)
    if yt_match:
        vid_id = yt_match.group(1)
        return [
            f"https://i.ytimg.com/vi/{vid_id}/maxresdefault.jpg",
            f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
            f"https://i.ytimg.com/vi/{vid_id}/mqdefault.jpg",
            thumbnail_url,
        ]

    # All other platforms — just the direct URL
    return [thumbnail_url]


def _fetch_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")


def _scan_thumbnail_fallback(thumbnail_url: str) -> tuple[float, list, Image.Image | None, np.ndarray | None]:
    """
    Thumbnail-only scan — used when video download fails or in batch mode.
    Tries all thumbnail URL variants, returns best match.
    """
    if not thumbnail_url or vector_db.ntotal == 0:
        return -1.0, [], None, None

    k = min(3, vector_db.ntotal)
    best_similarity = -1.0
    best_matches    = []
    best_pil        = None
    best_emb        = None

    for url in _thumbnail_variants(thumbnail_url):
        try:
            img = _fetch_image(url)
            emb = embed_image_for_sentinel(img)
            sims, idxs = vector_db.search(emb, k=k)
            score = float(sims[0][0])
            if score > best_similarity:
                best_similarity = score
                best_pil        = img
                best_emb        = emb
                best_matches    = []
                for s, idx in zip(sims[0], idxs[0]):
                    if idx == -1:
                        continue
                    meta = metadata_store.get(str(idx), {})
                    best_matches.append({
                        "vault_index":    int(idx),
                        "similarity":     float(round(float(s), 4)),
                        "l2_distance":    float(round(1.0 - float(s), 4)),
                        "confidence":     float(_cosine_to_confidence(float(s))),
                        "source_video":   meta.get("video_path", "unknown"),
                        "timestamp_sec":  int(meta.get("timestamp_sec", 0)),
                        "scene_idx":      int(meta.get("scene_idx", 0)),
                        "screen_capture": bool(meta.get("screen_capture", False)),
                    })
        except Exception:
            continue

    return best_similarity, best_matches, best_pil, best_emb


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

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
    audio_score: float,
    temporal_score: float,
    phash_match: bool,
    clip_sim_raw: float,
    text_score: float = 0.0,
    source_rep_score: float = 1.0,
) -> float:
    phash_val = 1.0 if phash_match else clip_sim_raw
    fused = (
        clip_sim       * W_CLIP     +
        audio_score    * W_AUDIO    +
        temporal_score * W_TEMPORAL +
        phash_val      * W_PHASH    +
        text_score     * W_TEXT     +
        source_rep_score * W_SOURCE_REP
    )
    return round(max(0.0, min(100.0, fused * 100)), 2)


def _run_audio_layer(suspect_url: str, local_path: str = "", batch_mode: bool = False) -> dict:
    """
    Run audio fingerprinting.
    Priority: use already-downloaded local file → else download from URL.
    batch_mode: skip audio entirely (too slow for 20+ parallel scans).
    """
    empty = {
        "audio_match": False, "audio_confidence": 0.0,
        "fp_score": 0.0, "embedding_score": 0.0,
        "best_video_id": None, "best_timestamp_sec": None,
        "error": None, "skipped": True,
    }

    if batch_mode:
        return empty

    try:
        from agents.audio_fingerprint import search_audio, search_audio_from_url, get_audio_vault_status
        status = get_audio_vault_status()
        if status["fingerprints_stored"] == 0 and status["audio_vectors"] == 0:
            empty["error"] = "Audio vault empty"
            return empty

        if local_path and os.path.exists(local_path):
            # Use already-downloaded video file — no extra download needed
            result = search_audio(local_path)
        elif suspect_url:
            result = search_audio_from_url(suspect_url)
        else:
            return empty

        result["skipped"] = False
        return result
    except Exception as e:
        empty["error"] = str(e)
        return empty


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN SCAN FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

def scan_suspect(
    suspect_video_url: str = "",
    thumbnail_url: str = "",
    platform: str = "",
    batch_mode: bool = False,
) -> dict:
    """
    Full five-layer scan of a suspect.

    NEW pipeline (replaces thumbnail-only scan):
    1. Download suspect video clip (first 90s) via yt-dlp [platform agnostic]
    2. Extract scene-boundary frames (same as archivist pipeline)
    3. CLIP embed all frames → FAISS search → best match across ALL frames
    4. pHash verification on best matching frame
    5. Temporal signature matching
    6. Audio fingerprint (uses downloaded file — no extra download)
    7. Forensic platform chain
    8. Fuse all signals

    Falls back to thumbnail-only if:
    - batch_mode=True (too slow to download 20+ videos in parallel)
    - URL download fails
    - No URL provided

    Args:
        suspect_video_url: URL of suspect video (yt-dlp compatible)
        thumbnail_url:     Thumbnail URL (fallback / forensics)
        platform:          Platform name (for logging)
        batch_mode:        If True, thumbnail-only scan (no video download)
    """
    if vector_db.ntotal == 0:
        return {"error": "FAISS vault is empty. Ingest an official video first."}

    scan_method    = "unknown"
    best_pil       = None
    frames_scanned = 0
    local_path     = None          # ensure defined for all code paths
    audio_result   = _run_audio_layer("", batch_mode=True)  # safe default
    best_similarity = -1.0
    top_matches    = []
    best_emb       = None

    # ─── Strategy selection ──────────────────────────────────────────────────
    if not batch_mode and suspect_video_url:
        # FULL PIPELINE: download clip → extract frames → scan all frames
        tmpdir = tempfile.mkdtemp(prefix="mediaguard_scan_")
        try:
            print(f"[Sentinel] Downloading suspect clip from {platform or 'unknown'}: {suspect_video_url[:60]}")
            local_path = _download_suspect_clip(suspect_video_url, tmpdir)

            # Fallback to direct ffmpeg for direct media URLs
            if not local_path and any(
                suspect_video_url.lower().endswith(ext)
                for ext in ('.mp4', '.webm', '.mkv', '.m3u8', '.mov')
            ):
                local_path = _download_suspect_clip_ffmpeg(suspect_video_url, tmpdir)

            if local_path and os.path.exists(local_path):
                frames = _extract_scene_frames(local_path)
                frames_scanned = len(frames)
                print(f"[Sentinel] Extracted {frames_scanned} scene frames from {os.path.basename(local_path)}")

                if frames:
                    best_similarity, top_matches, best_emb = _scan_frames_against_vault(frames)
                    # Use the first frame as representative for pHash + forensics
                    best_pil = frames[0] if frames else None
                    scan_method = "video_frames"

                    # Run audio on local file (no extra download)
                    audio_result = _run_audio_layer(
                        suspect_video_url, local_path=local_path, batch_mode=False
                    )
                else:
                    print(f"[Sentinel] No frames extracted — falling back to thumbnail")
                    local_path = None
            else:
                local_path = None
        finally:
            # Cleanup downloaded file
            try:
                import shutil
                shutil.rmtree(tmpdir, ignore_errors=True)
            except Exception:
                pass

        # If download/extraction failed → thumbnail fallback
        if scan_method == "unknown" or not top_matches:
            print(f"[Sentinel] Video download failed for {platform} — using thumbnail fallback")
            best_similarity, top_matches, best_pil, best_emb = _scan_thumbnail_fallback(thumbnail_url)
            audio_result = _run_audio_layer(suspect_video_url, batch_mode=False)
            scan_method = "thumbnail_fallback"

    else:
        # BATCH MODE or no URL: thumbnail-only scan
        best_similarity, top_matches, best_pil, best_emb = _scan_thumbnail_fallback(thumbnail_url)
        audio_result = _run_audio_layer(suspect_video_url, batch_mode=True)
        scan_method = "thumbnail_batch"
    
    # ─── Layer 6: Text/OCR ───────────────────────────────────────────────────
    text_score = 0.0
    text_result = {}
    local_path_exists = 'local_path' in dir() and local_path and os.path.exists(str(local_path or ""))
    if local_path_exists:
        try:
            text_result = extract_text_from_video_path(local_path)
            # Score based on detected subtitles/watermarks and text confidence
            if text_result.get("has_subtitles"):
                text_score += 0.3
            if text_result.get("has_watermark"):
                text_score += 0.3
            text_score += text_result.get("total_confidence", 0.0) * 0.4
            text_score = min(1.0, text_score)
        except Exception as e:
            print(f"[Sentinel] Text OCR skipped: {e}")
    
    # ─── Layer 2: pHash ──────────────────────────────────────────────────────
    phash_match = False
    phash_score = 0
    if best_pil is not None and best_similarity >= SUSPECT_THRESHOLD and top_matches:
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
                    vault_pil  = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    vault_hash = imagehash.phash(vault_pil)
                    hash_diff  = suspect_hash - vault_hash
                    phash_score = max(0, 100 - (hash_diff * 4))
                    phash_match = hash_diff < 15
        except Exception:
            pass

    # ─── Layer 3: Temporal DNA ───────────────────────────────────────────────
    temporal_score      = 0.0
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

    # ─── Layer 4: Audio (already computed above) ─────────────────────────────
    if 'audio_result' not in dir():
        audio_result = _run_audio_layer("", batch_mode=True)
    audio_score = (audio_result.get("audio_confidence", 0.0) or 0.0) / 100.0

    # ─── Layer 5: Forensics chain ─────────────────────────────────────────────
    forensics_result = {
        "chain": [], "chain_length": 0, "confidence": 0.0,
        "first_platform": None, "leak_risk": "low",
        "method": "skipped", "error": None,
    }
    if best_pil is not None and best_similarity >= SUSPECT_THRESHOLD:
        try:
            from agents.forensics import analyze_image_chain
            forensics_result = analyze_image_chain(best_pil)
        except Exception as e:
            forensics_result["error"] = str(e)

    # ─── Confidence fusion ────────────────────────────────────────────────────
    clip_confidence  = _cosine_to_confidence(best_similarity)
    fused_confidence = _fuse_confidence(
        clip_sim       = best_similarity,
        audio_score    = audio_score,
        temporal_score = temporal_score,
        phash_match    = phash_match,
        clip_sim_raw   = best_similarity,
        text_score     = text_score,
    )

    match_confirmed = (
        best_similarity >= MATCH_THRESHOLD or
        audio_score     >= AUDIO_MATCH_THRESHOLD or
        fused_confidence >= 75.0    # lowered from 82 — industry standard
    )

    return {
        "match_confirmed":    bool(match_confirmed),
        "confidence_score":   float(fused_confidence),
        "severity":           _severity_from_confidence(fused_confidence),
        "scan_method":        scan_method,
        "frames_scanned":     frames_scanned,

        "clip_similarity":    float(round(best_similarity, 4)),
        "clip_confidence":    float(clip_confidence),
        "l2_distance":        float(round(1.0 - best_similarity, 4)),
        "top_matches":        top_matches,

        "phash_match":        bool(phash_match),
        "phash_score":        int(phash_score),

        "temporal_score":     float(round(temporal_score, 4)),
        "temporal_match":     temporal_match_info,

        "audio_match":        bool(audio_result.get("audio_match", False)),
        "audio_confidence":   float(audio_result.get("audio_confidence", 0.0)),
        "audio_fp_score":     float(audio_result.get("fp_score", 0.0)),
        "audio_mel_score":    float(audio_result.get("embedding_score", 0.0)),
        "audio_best_video":   audio_result.get("best_video_id"),
        "audio_best_ts":      audio_result.get("best_timestamp_sec"),
        "audio_skipped":      bool(audio_result.get("skipped", True)),

        "text_score":         float(round(text_score, 4)),
        "text_result":        text_result,

        "forensics_chain":          forensics_result.get("chain", []),
        "forensics_chain_length":   int(forensics_result.get("chain_length", 0)),
        "forensics_confidence":     float(forensics_result.get("confidence", 0.0)),
        "forensics_first_platform": forensics_result.get("first_platform"),
        "forensics_leak_risk":      forensics_result.get("leak_risk", "low"),
        "forensics_method":         forensics_result.get("method", "skipped"),
        "forensics_jpeg_quality":   float(forensics_result.get("jpeg_quality", 0.0)),

        "thumbnail_url":      thumbnail_url,
        "suspect_video_url":  suspect_video_url,
    }


def scan_thumbnail(thumbnail_url: str, suspect_video_url: str = "", batch_mode: bool = False) -> dict:
    """
    Backward-compatible wrapper for scan_suspect().
    Called by /scan and /scan/batch endpoints in main.py.
    """
    return scan_suspect(
        suspect_video_url = suspect_video_url,
        thumbnail_url     = thumbnail_url,
        batch_mode        = batch_mode,
    )


def tool_scan_thumbnail(thumbnail_url: str, suspect_video_url: str = "") -> str:
    result = scan_thumbnail(thumbnail_url, suspect_video_url)
    if "error" in result:
        return f"[ERROR] {result['error']}"

    method    = result.get("scan_method", "?")
    n_frames  = result.get("frames_scanned", 0)
    audio_str = "" if result.get("audio_skipped") else f" Audio:{result['audio_confidence']:.1f}%"

    if result["match_confirmed"]:
        top = result["top_matches"][0] if result["top_matches"] else {}
        return (
            f"[CRITICAL ANOMALY] Confidence:{result['confidence_score']}% "
            f"CLIP:{result['clip_confidence']}%{audio_str} "
            f"Temporal:{result['temporal_score']:.2f} pHash:{result['phash_match']} "
            f"Frames:{n_frames} Method:{method} "
            f"Frame@{top.get('timestamp_sec','?')}s"
        )
    if result["confidence_score"] >= 60:
        return (
            f"[SUSPECT] Confidence:{result['confidence_score']}% "
            f"CLIP:{result['clip_confidence']}%{audio_str} "
            f"Frames:{n_frames} Method:{method}"
        )
    return f"[CLEAN] Confidence:{result['confidence_score']}% Method:{method}"
