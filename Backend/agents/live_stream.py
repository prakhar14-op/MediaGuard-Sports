"""
Live Stream Piracy Detection Pipeline
======================================
Handles continuous ingestion of live stream segments with parallel processing.

The Problem with Sequential Processing for Live Streams:
─────────────────────────────────────────────────────────
Current batch pipeline: Download → Embed → Scan → Adjudicate → Enforce
This is fine for VOD (recorded videos). For live streams it fails because:
1. You can't wait for the stream to finish before detecting piracy
2. A 90-minute match would be detected AFTER it's over — useless
3. Each stage blocks the next — latency compounds

The Solution: Parallel Pipeline Stages
────────────────────────────────────────
Live stream is divided into 30-second segments. Each segment flows through
ALL pipeline stages in parallel:

    Segment N+0: [Ingest] → [Embed] → [Scan] → [Alert]
    Segment N+1:            [Ingest] → [Embed] → [Scan] → [Alert]
    Segment N+2:                       [Ingest] → [Embed] → [Scan] → [Alert]

Result: detection latency = one segment length (30s) not full stream length.

Architecture:
─────────────
    HLS/RTMP Stream URL
            ↓
    StreamMonitor (this module)
            ↓  segments every 30s
    SegmentQueue (thread-safe)
            ↓  parallel workers
    ┌─────────────┬────────────────┬──────────────────┐
    │ CLIP Embed  │ Audio Fingerpt │ Forensics (gated)│
    └──────┬──────┴────────┬───────┴────────┬─────────┘
           └───────────────▼────────────────┘
                   Sentinel Scan
                          ↓
                   Evidence Vault
                          ↓
                   Socket.IO alert → Frontend
                          ↓
                   Adjudicator (if above threshold)

FFmpeg is used for:
1. Downloading HLS/RTMP stream segments
2. Extracting audio for fingerprinting
3. Extracting keyframes for CLIP embedding

Supports:
- YouTube Live (via yt-dlp)
- HLS streams (m3u8)
- RTMP streams
- Any URL supported by yt-dlp/ffmpeg
"""

import os
import sys
import time
import queue
import threading
import tempfile
import subprocess
import json
import hashlib
import glob
from typing import Optional, Callable
from datetime import datetime, timezone

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ─── Redis Persistence ───────────────────────────────────────────────────────
_redis_client = None
_redis_available = False
_redis_prefix = "mediaguard:stream_monitor:"

def _init_redis():
    """Initialize Redis connection for monitor persistence."""
    global _redis_client, _redis_available
    if _redis_available:
        return
    try:
        import redis
        redis_url = os.getenv("REDIS_URL", "")
        if not redis_url:
            print("[LiveStream] REDIS_URL not set, persistence disabled")
            return
        _redis_client = redis.from_url(redis_url)
        _redis_client.ping()
        _redis_available = True
        print(f"[LiveStream] Redis persistence initialized")
        _restore_monitors()
    except Exception as e:
        print(f"[LiveStream] Redis not available, persistence disabled: {e}")
        _redis_available = False

def _save_monitor(monitor):
    """Save monitor state to Redis."""
    if not _redis_available or not _redis_client:
        return
    try:
        key = f"{_redis_prefix}{monitor.stream_id}"
        state = {
            "stream_id": monitor.stream_id,
            "stream_url": monitor.stream_url,
            "started_at": monitor._started_at.isoformat() if hasattr(monitor, "_started_at") else datetime.now(timezone.utc).isoformat(),
            "segment_index": monitor._segment_idx,
            "cookies_path": monitor.cookies_path,
        }
        _redis_client.setex(key, 86400 * 7, json.dumps(state))  # 7-day TTL
    except Exception as e:
        print(f"[LiveStream] Failed to save monitor: {e}")

def _remove_monitor(stream_id):
    """Remove monitor state from Redis."""
    if not _redis_available or not _redis_client:
        return
    try:
        key = f"{_redis_prefix}{stream_id}"
        _redis_client.delete(key)
    except Exception as e:
        print(f"[LiveStream] Failed to remove monitor: {e}")

def _restore_monitors():
    """Restore active monitors from Redis on startup."""
    if not _redis_available or not _redis_client:
        return
    try:
        keys = _redis_client.keys(f"{_redis_prefix}*")
        restored = 0
        for key in keys:
            try:
                state = json.loads(_redis_client.get(key))
                # Recreate the monitor
                monitor = StreamMonitor(
                    stream_url=state["stream_url"],
                    stream_id=state["stream_id"],
                    cookies_path=state.get("cookies_path", ""),
                )
                monitor._segment_idx = state.get("segment_index", 0)
                monitor._started_at = datetime.fromisoformat(state["started_at"])
                with _registry_lock:
                    if state["stream_id"] not in _active_monitors:
                        _active_monitors[state["stream_id"]] = monitor
                        monitor.start()
                        restored += 1
            except Exception as e:
                print(f"[LiveStream] Failed to restore monitor {key}: {e}")
        if restored > 0:
            print(f"[LiveStream] Restored {restored} active stream monitors")
    except Exception as e:
        print(f"[LiveStream] Failed to restore monitors: {e}")

# Initialize Redis on module load
_init_redis()

# ─── Pipeline config ──────────────────────────────────────────────────────────
SEGMENT_DURATION    = 30        # seconds per segment
MAX_QUEUE_DEPTH     = 10        # max segments waiting to be processed
EMBED_WORKERS       = 2         # parallel CLIP embedding workers
SCAN_WORKERS        = 2         # parallel sentinel scan workers
DETECTION_THRESHOLD = 60.0      # confidence above this = alert immediately
ADJUDICATE_THRESHOLD = 55.0     # confidence above this = send to adjudicator


class StreamSegment:
    """A single time slice of a live stream."""

    def __init__(self, stream_id: str, segment_index: int, video_path: str, timestamp_sec: float):
        self.stream_id      = stream_id
        self.segment_index  = segment_index
        self.video_path     = video_path
        self.timestamp_sec  = timestamp_sec
        self.segment_id     = f"{stream_id}_seg{segment_index:06d}"

        # Results — populated by pipeline workers
        self.frames:        list       = []   # PIL Images
        self.embeddings:    Optional[np.ndarray] = None
        self.audio_result:  Optional[dict]       = None
        self.scan_result:   Optional[dict]       = None
        self.custody_event: Optional[dict]       = None

        self.created_at = datetime.now(timezone.utc).isoformat()


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENT EXTRACTOR — downloads HLS/RTMP segments
# ═══════════════════════════════════════════════════════════════════════════════

def _extract_segment(stream_url: str, segment_index: int, output_dir: str, cookies_path: str = "") -> Optional[str]:
    """
    Download a SEGMENT_DURATION-second segment from a live stream.
    Uses ffmpeg's segment muxer or yt-dlp for platform streams.
    Returns path to the downloaded segment file, or None on failure.
    """
    out_path = os.path.join(output_dir, f"seg_{segment_index:06d}.mp4")

    # Try direct ffmpeg for HLS/RTMP
    if any(x in stream_url for x in [".m3u8", "rtmp://", "rtsp://"]):
        import shutil
        ffmpeg_exe = shutil.which("ffmpeg")
        if not ffmpeg_exe:
            try:
                import imageio_ffmpeg
                ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            except Exception:
                ffmpeg_exe = "ffmpeg"
        start_sec = segment_index * SEGMENT_DURATION
        cmd = [
            ffmpeg_exe, "-y",
            "-ss", str(start_sec),
            "-i", stream_url,
            "-t", str(SEGMENT_DURATION),
            "-c:v", "libx264", "-preset", "ultrafast",
            "-c:a", "aac",
            "-f", "mp4",
            out_path,
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, timeout=SEGMENT_DURATION * 2)
            if result.returncode == 0 and os.path.exists(out_path):
                return out_path
        except Exception as e:
            print(f"[LiveStream] ffmpeg direct failed: {e}")

    # Fall back to yt-dlp (YouTube Live, Twitch, etc.)
    try:
        import shutil as _shutil
        from agents.audio_fingerprint import _get_ffmpeg_exe
        ffmpeg_path = _get_ffmpeg_exe()

        ydl_opts = {
            "outtmpl":      out_path.replace(".mp4", ".%(ext)s"),
            "format":       "best[height<=720]",
            "quiet":        True,
            "noplaylist":   True,
            # Live stream: download only SEGMENT_DURATION seconds
            "external_downloader":      ffmpeg_path,
            "external_downloader_args": {"ffmpeg_i": ["-t", str(SEGMENT_DURATION)]},
        }
        if cookies_path and os.path.exists(cookies_path):
            ydl_opts["cookiefile"] = cookies_path

        import yt_dlp
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([stream_url])

        # Find downloaded file
        matches = glob.glob(out_path.replace(".mp4", ".*"))
        if matches:
            return matches[0]
    except Exception as e:
        print(f"[LiveStream] yt-dlp failed: {e}")

    return None


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENT EMBEDDING WORKER
# ═══════════════════════════════════════════════════════════════════════════════

def _embed_segment(segment: StreamSegment) -> StreamSegment:
    """
    Extract frames and compute CLIP embeddings for a segment.
    Runs in a worker thread.
    """
    try:
        import cv2
        from agents.archivist import _embed_batch, detect_screen_capture, correct_perspective

        cap = cv2.VideoCapture(segment.video_path)
        if not cap.isOpened():
            return segment

        fps             = cap.get(cv2.CAP_PROP_FPS) or 25.0
        sample_interval = max(1, int(fps * 5))   # 1 frame every 5s within segment
        frame_id        = 0
        pil_frames      = []

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_id % sample_interval == 0:
                # Apply screen detection + perspective correction
                screen_info = detect_screen_capture(frame)
                if screen_info["is_screen_capture"] and screen_info.get("screen_corners"):
                    frame = correct_perspective(frame, screen_info["screen_corners"])
                pil_frames.append(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
            frame_id += 1

        cap.release()

        if pil_frames:
            embs = _embed_batch(pil_frames)
            segment.embeddings = embs
            segment.frames     = pil_frames

        print(f"[LiveStream] Segment {segment.segment_index} embedded: {len(pil_frames)} frames")
    except Exception as e:
        print(f"[LiveStream] Embed error for segment {segment.segment_index}: {e}")

    return segment


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENT AUDIO WORKER
# ═══════════════════════════════════════════════════════════════════════════════

def _fingerprint_segment_audio(segment: StreamSegment) -> StreamSegment:
    """Extract audio fingerprint from a segment. Runs in parallel with embedding."""
    try:
        from agents.audio_fingerprint import search_audio, get_audio_vault_status

        status = get_audio_vault_status()
        if status["fingerprints_stored"] == 0 and status["audio_vectors"] == 0:
            return segment   # no vault to compare against

        result = search_audio(segment.video_path)
        segment.audio_result = result

        if result.get("audio_match"):
            print(f"[LiveStream] AUDIO MATCH in segment {segment.segment_index}: "
                  f"confidence={result['audio_confidence']:.1f}%")
    except Exception as e:
        print(f"[LiveStream] Audio error for segment {segment.segment_index}: {e}")

    return segment


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENT SCAN WORKER — runs after embed + audio complete
# ═══════════════════════════════════════════════════════════════════════════════

def _scan_segment(segment: StreamSegment) -> StreamSegment:
    """
    Scan segment against FAISS vault using all detection layers.
    Runs: CLIP similarity + Temporal DNA + Audio fusion + Forensic leak chain.
    Everything runs on the same segment — piracy, leaks, plagiarism detected together.
    """
    if segment.embeddings is None or len(segment.embeddings) == 0:
        return segment

    try:
        import faiss as _faiss
        from agents.archivist import vector_db, metadata_store, temporal_similarity, get_temporal_signatures_for_scan

        if vector_db.ntotal == 0:
            return segment

        # ── Layer 1: CLIP Visual Similarity ──────────────────────────────────
        # Use centroid of segment embeddings (more robust than single frame)
        centroid = segment.embeddings.mean(axis=0).reshape(1, -1).astype(np.float32)
        _faiss.normalize_L2(centroid)

        k    = min(3, vector_db.ntotal)
        sims, idxs = vector_db.search(centroid, k=k)
        best_sim   = float(sims[0][0])

        top_matches = []
        for sim, idx in zip(sims[0], idxs[0]):
            if idx == -1:
                continue
            meta = metadata_store.get(str(idx), {})
            top_matches.append({
                "vault_index":   int(idx),
                "similarity":    float(round(float(sim), 4)),
                "timestamp_sec": int(meta.get("timestamp_sec", 0)),
                "source_video":  meta.get("video_path", ""),
            })

        # ── Layer 2: Temporal DNA Matching ───────────────────────────────────
        temporal_score = 0.0
        temporal_match = None
        if best_sim >= 0.55:
            sigs = get_temporal_signatures_for_scan()
            if sigs:
                t_result = temporal_similarity(centroid, sigs)
                temporal_score = t_result.get("best_score", 0.0)
                if t_result.get("best_signature"):
                    temporal_match = {
                        "score":      float(round(temporal_score, 4)),
                        "video_id":   t_result["best_signature"].get("video_id"),
                        "window_ts":  t_result["best_signature"].get("window_start_ts"),
                    }

        # ── Layer 3: Audio fusion ────────────────────────────────────────────
        audio_confidence = 0.0
        audio_match = False
        if segment.audio_result:
            audio_confidence = (segment.audio_result.get("audio_confidence") or 0.0) / 100.0
            audio_match = segment.audio_result.get("audio_match", False)

        # ── Layer 4: Forensic Leak Chain (runs on best frame) ────────────────
        forensics_result = {
            "chain": [], "chain_length": 0, "confidence": 0.0,
            "first_platform": None, "leak_risk": "low", "method": "skipped",
        }
        if segment.frames:
            try:
                from agents.forensics import analyze_image_chain
                forensics_result = analyze_image_chain(segment.frames[0])
            except Exception as e:
                forensics_result["error"] = str(e)

        # ── Confidence Fusion ────────────────────────────────────────────────
        # CLIP=0.45, Audio=0.30, Temporal=0.15, Forensics=0.10
        forensics_boost = min(forensics_result.get("confidence", 0.0), 1.0) if forensics_result.get("chain") else 0.0
        fused = (
            best_sim         * 0.45 +
            audio_confidence * 0.30 +
            temporal_score   * 0.15 +
            forensics_boost  * 0.10
        )
        fused_confidence = round(min(100.0, fused * 100), 2)

        match_confirmed = (
            best_sim >= 0.82 or
            audio_confidence >= 0.80 or
            fused_confidence >= 82.0
        )

        severity = (
            "CRITICAL" if fused_confidence >= 85 else
            "WARNING"  if fused_confidence >= 60 else
            "INFO"
        )

        # ── Determine detection type ────────────────────────────────────────
        detection_types = []
        if best_sim >= 0.65 or match_confirmed:
            detection_types.append("PIRACY")
        if audio_match:
            detection_types.append("AUDIO_MATCH")
        if forensics_result.get("chain"):
            detection_types.append("LEAK_CHAIN")
            if forensics_result.get("leak_risk") in ("critical", "high"):
                detection_types.append("HIGH_RISK_LEAK")
        if temporal_score >= 0.72:
            detection_types.append("TEMPORAL_DNA_MATCH")

        segment.scan_result = {
            "segment_id":       segment.segment_id,
            "stream_id":        segment.stream_id,
            "segment_index":    segment.segment_index,
            "timestamp_sec":    segment.timestamp_sec,

            # Detection summary
            "match_confirmed":  match_confirmed,
            "confidence_score": fused_confidence,
            "severity":         severity,
            "detection_types":  detection_types,

            # Layer 1: Visual
            "clip_similarity":  float(round(best_sim, 4)),
            "top_matches":      top_matches,

            # Layer 2: Temporal DNA
            "temporal_score":   float(round(temporal_score, 4)),
            "temporal_match":   temporal_match,

            # Layer 3: Audio
            "audio_match":      audio_match,
            "audio_confidence": float(round(audio_confidence * 100, 2)),

            # Layer 4: Forensic Leak Chain
            "forensics_chain":          forensics_result.get("chain", []),
            "forensics_first_platform": forensics_result.get("first_platform"),
            "forensics_leak_risk":      forensics_result.get("leak_risk", "low"),
            "forensics_confidence":     float(forensics_result.get("confidence", 0.0)),
            "forensics_method":         forensics_result.get("method", "skipped"),
        }

        # ── Logging ──────────────────────────────────────────────────────────
        if match_confirmed:
            chain_str = " → ".join(forensics_result.get("chain", [])) or "N/A"
            print(f"[LiveStream] 🚨 DETECTION in segment {segment.segment_index}: "
                  f"{fused_confidence:.1f}% | types={detection_types} | "
                  f"leak_chain={chain_str}")
        elif fused_confidence >= 60:
            print(f"[LiveStream] ⚠️  SUSPECT in segment {segment.segment_index}: "
                  f"{fused_confidence:.1f}% | CLIP={best_sim:.2f} audio={audio_confidence:.2f}")

    except Exception as e:
        print(f"[LiveStream] Scan error for segment {segment.segment_index}: {e}")

    return segment


# ═══════════════════════════════════════════════════════════════════════════════
# STREAM MONITOR — orchestrates the parallel pipeline
# ═══════════════════════════════════════════════════════════════════════════════

class StreamMonitor:
    """
    Monitors a live stream URL for piracy in real-time.

    Pipeline:
        Segment extraction → [Embed + Audio] (parallel) → Scan → Alert → Evidence Vault

    Each stage runs in a separate thread pool so stages don't block each other.
    """

    def __init__(
        self,
        stream_url: str,
        stream_id: Optional[str] = None,
        on_detection: Optional[Callable] = None,
        cookies_path: str = "",
    ):
        self.stream_url   = stream_url
        self.stream_id    = stream_id or hashlib.sha256(stream_url.encode()).hexdigest()[:12]
        self.on_detection = on_detection   # callback(segment) called on confirmed match
        self.cookies_path = cookies_path

        self._running      = False
        self._segment_idx  = 0
        self._tmpdir       = None
        self._workers      = []
        self._raw_queue    = queue.Queue(maxsize=MAX_QUEUE_DEPTH)
        self._scan_queue   = queue.Queue(maxsize=MAX_QUEUE_DEPTH)
        self._results      = []
        self._lock         = threading.Lock()

        print(f"[LiveStream] Monitor created: stream_id={self.stream_id}")

    def start(self):
        """Start the live stream monitoring pipeline."""
        self._running = True
        self._started_at = datetime.now(timezone.utc)
        self._tmpdir  = tempfile.mkdtemp(prefix=f"mediaguard_stream_{self.stream_id}_")
        # Save initial state
        _save_monitor(self)
        
        # Worker 1: Segment extractor (producer)
        t = threading.Thread(target=self._extraction_loop, daemon=True)
        t.start(); self._workers.append(t)
        
        # Worker 2: Periodic state saver
        def _save_loop():
            while self._running:
                time.sleep(30)  # Save every 30 seconds
                _save_monitor(self)
        t = threading.Thread(target=_save_loop, daemon=True)
        t.start(); self._workers.append(t)

        # Workers 2-3: Embed + audio (parallel per segment)
        for i in range(EMBED_WORKERS):
            t = threading.Thread(target=self._embed_audio_worker, daemon=True)
            t.start(); self._workers.append(t)

        # Workers 4-5: Scan + alert
        for i in range(SCAN_WORKERS):
            t = threading.Thread(target=self._scan_worker, daemon=True)
            t.start(); self._workers.append(t)

        print(f"[LiveStream] Pipeline started — {len(self._workers)} workers")

    def stop(self):
        """Stop the monitoring pipeline gracefully."""
        self._running = False
        # Remove from persistence
        _remove_monitor(self.stream_id)
        # Poison pills to unblock workers
        for _ in range(EMBED_WORKERS + 2):
            try: self._raw_queue.put(None, timeout=2)
            except queue.Full: pass
        for _ in range(SCAN_WORKERS + 2):
            try: self._scan_queue.put(None, timeout=2)
            except queue.Full: pass
        for t in self._workers:
            t.join(timeout=10)
        if self._tmpdir and os.path.exists(self._tmpdir):
            import shutil
            shutil.rmtree(self._tmpdir, ignore_errors=True)
        print(f"[LiveStream] Pipeline stopped. Processed {self._segment_idx} segments.")

    def get_results(self) -> list:
        with self._lock:
            return list(self._results)

    # ── Internal workers ──────────────────────────────────────────────────────

    def _extraction_loop(self):
        """Continuously extract segments from the live stream."""
        while self._running:
            seg_path = _extract_segment(
                self.stream_url,
                self._segment_idx,
                self._tmpdir,
                self.cookies_path,
            )

            if seg_path:
                segment = StreamSegment(
                    stream_id     = self.stream_id,
                    segment_index = self._segment_idx,
                    video_path    = seg_path,
                    timestamp_sec = self._segment_idx * SEGMENT_DURATION,
                )
                try:
                    self._raw_queue.put(segment, timeout=5)
                    print(f"[LiveStream] Queued segment {self._segment_idx}")
                except queue.Full:
                    print(f"[LiveStream] Queue full — dropping segment {self._segment_idx}")
            else:
                print(f"[LiveStream] Failed to extract segment {self._segment_idx} — retrying in 5s")
                time.sleep(5)
                continue

            self._segment_idx += 1

            # Don't immediately grab next segment — wait for the segment duration
            # minus processing overhead
            time.sleep(max(1, SEGMENT_DURATION - 5))

    def _embed_audio_worker(self):
        """Embed frames + fingerprint audio for segments in parallel."""
        while True:
            segment = self._raw_queue.get()
            if segment is None:
                self._scan_queue.put(None)
                break

            # Run embed and audio in parallel — both mutate segment in-place
            def _do_embed():
                _embed_segment(segment)

            def _do_audio():
                _fingerprint_segment_audio(segment)

            embed_thread = threading.Thread(target=_do_embed, daemon=True)
            audio_thread = threading.Thread(target=_do_audio, daemon=True)
            embed_thread.start()
            audio_thread.start()
            embed_thread.join(timeout=60)
            audio_thread.join(timeout=60)

            # Package to evidence vault immediately (don't wait for scan)
            try:
                from agents.evidence_vault import package_stream_segment
                package_stream_segment(
                    stream_id         = self.stream_id,
                    segment_index     = segment.segment_index,
                    segment_ts        = segment.timestamp_sec,
                    frame_embeddings  = segment.embeddings,
                    audio_fingerprint = segment.audio_result,
                )
            except Exception as e:
                print(f"[LiveStream] Evidence vault error: {e}")

            self._scan_queue.put(segment)
            self._raw_queue.task_done()

    def _scan_worker(self):
        """Scan segments against vault and alert on matches."""
        while True:
            segment = self._scan_queue.get()
            if segment is None:   # poison pill
                break

            _scan_segment(segment)

            if segment.scan_result:
                with self._lock:
                    self._results.append({
                        "segment_id":       segment.segment_id,
                        "segment_index":    segment.segment_index,
                        "timestamp_sec":    segment.timestamp_sec,
                        "confidence_score": segment.scan_result.get("confidence_score", 0),
                        "match_confirmed":  segment.scan_result.get("match_confirmed", False),
                        "severity":         segment.scan_result.get("severity", "INFO"),
                        "forensics_chain":  segment.scan_result.get("forensics_chain", []),
                        "forensics_first_platform": segment.scan_result.get("forensics_first_platform"),
                        "forensics_leak_risk":      segment.scan_result.get("forensics_leak_risk", "low"),
                        "clip_similarity":  segment.scan_result.get("clip_similarity", 0),
                        "audio_match":      segment.scan_result.get("audio_match", False),
                        "detection_types":  segment.scan_result.get("detection_types", []),
                    })

                # Alert on detection
                confidence = segment.scan_result.get("confidence_score", 0)
                if confidence >= DETECTION_THRESHOLD:
                    # Store full scan result in evidence vault
                    try:
                        from agents.evidence_vault import package_detection_evidence, record_custody_event
                        pil = segment.frames[0] if segment.frames else None
                        package_detection_evidence(
                            incident_id      = segment.segment_id,
                            sentinel_result  = segment.scan_result,
                            thumbnail_pil    = pil,
                            clip_embedding   = segment.embeddings,
                            audio_result     = segment.audio_result,
                        )
                    except Exception as e:
                        print(f"[LiveStream] Evidence package error: {e}")

                    # Fire callback (sends Socket.IO event to frontend)
                    if self.on_detection:
                        try:
                            self.on_detection(segment)
                        except Exception as e:
                            print(f"[LiveStream] Detection callback error: {e}")

            self._scan_queue.task_done()


# ═══════════════════════════════════════════════════════════════════════════════
# STREAM REGISTRY — tracks all active monitors
# ═══════════════════════════════════════════════════════════════════════════════

_active_monitors: dict = {}
_registry_lock          = threading.Lock()


def start_stream_monitor(
    stream_url: str,
    stream_id: Optional[str] = None,
    on_detection: Optional[Callable] = None,
) -> str:
    """
    Start monitoring a live stream.
    Returns the stream_id for later reference.
    """
    cookies_path = os.path.join(os.path.dirname(__file__), "..", "yt_cookies.txt")
    if not os.path.exists(cookies_path):
        cookies_path = ""

    monitor   = StreamMonitor(stream_url, stream_id, on_detection, cookies_path)
    stream_id = monitor.stream_id

    with _registry_lock:
        if stream_id in _active_monitors:
            return stream_id   # already running
        _active_monitors[stream_id] = monitor

    monitor.start()
    print(f"[LiveStream] Started monitoring: {stream_url} → {stream_id}")
    return stream_id


def stop_stream_monitor(stream_id: str):
    """Stop monitoring a live stream."""
    with _registry_lock:
        monitor = _active_monitors.pop(stream_id, None)
    if monitor:
        monitor.stop()


def get_stream_results(stream_id: str) -> list:
    """Get detection results for a stream."""
    with _registry_lock:
        monitor = _active_monitors.get(stream_id)
    return monitor.get_results() if monitor else []


def list_active_streams() -> list:
    """List all currently monitored streams."""
    with _registry_lock:
        return [
            {
                "stream_id":      sid,
                "stream_url":     m.stream_url,
                "segments_processed": m._segment_idx,
            }
            for sid, m in _active_monitors.items()
        ]
