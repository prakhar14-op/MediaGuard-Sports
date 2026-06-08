"""
Archivist — video fingerprinting via CLIP ViT-B/32 embeddings.

CLIP ViT-B/32 is used for cross-modal semantic similarity:
- Trained on 400M image-text pairs — understands visual semantics deeply
- Produces 512-dim L2-normalised embeddings for cosine similarity
- Excellent for matching thumbnails against video frames even with
  crops, color grading changes, or watermarks added by pirates

Memory management for Render free tier (512MB RAM):
- CLIP is lazy-loaded on first ingest/scan call, NOT at import time
  (import-time loading caused OOM during health check restarts)
- torch_dtype=float16 loads weights directly in half precision,
  avoiding the double-RAM spike of float32 load → convert
  (~350MB float32 → ~175MB float16)
- transformers cache is pre-populated at Docker build time so there
  is no HuggingFace download delay at runtime
"""

import cv2
import torch
import faiss
import numpy as np
import json
import os
from PIL import Image

VAULT_DIR = os.path.join(os.path.dirname(__file__), "..", "vault")
os.makedirs(VAULT_DIR, exist_ok=True)

VAULT_INDEX_PATH = os.path.join(VAULT_DIR, "faiss_vault.index")
VAULT_META_PATH  = os.path.join(VAULT_DIR, "vault_metadata.json")

# ─── Model config ─────────────────────────────────────────────────────────────
_MODEL_ID     = "openai/clip-vit-base-patch32"
_processor    = None
_clip         = None
_USE_HALF     = False

EMBEDDING_DIM = 512   # CLIP ViT-B/32 image embedding dimension

BATCH_SIZE          = 8    # conservative for 512MB RAM
SAMPLE_EVERY_N_SECS = 30   # 1 frame per 30s — 90min video ≈ 180 frames


def _load_clip():
    """
    Load CLIP ViT-B/32 on first call. Subsequent calls are no-ops.

    Uses torch_dtype=float16 to load weights directly in half precision.
    This avoids the double-RAM spike that occurs when transformers loads
    float32 weights first and then converts them (~350MB → ~175MB peak RAM).
    """
    global _processor, _clip, _USE_HALF
    if _clip is not None:
        return

    from transformers import CLIPProcessor, CLIPModel
    print("[Archivist] Loading CLIP ViT-B/32 (lazy, float16)...")

    _processor = CLIPProcessor.from_pretrained(_MODEL_ID)

    try:
        _clip = CLIPModel.from_pretrained(_MODEL_ID, torch_dtype=torch.float16)
        _USE_HALF = True
        print("[Archivist] CLIP loaded in float16 — ~175MB RAM")
    except Exception:
        # Fallback to float32 if float16 not supported
        _clip = CLIPModel.from_pretrained(_MODEL_ID)
        _USE_HALF = False
        print("[Archivist] CLIP loaded in float32 — ~350MB RAM")

    _clip.eval()
    print(f"[Archivist] CLIP ready — dim={EMBEDDING_DIM}, batch={BATCH_SIZE}, sample={SAMPLE_EVERY_N_SECS}s")


# ─── FAISS vault ─────────────────────────────────────────────────────────────
# IndexFlatIP: inner product after L2 normalisation = cosine similarity
vector_db      = faiss.IndexFlatIP(EMBEDDING_DIM)
metadata_store = {}

if os.path.exists(VAULT_INDEX_PATH):
    try:
        loaded = faiss.read_index(VAULT_INDEX_PATH)
        if loaded.d == EMBEDDING_DIM:
            vector_db = loaded
            print(f"[Archivist] Vault loaded — {vector_db.ntotal} vectors")
        else:
            print(f"[Archivist] Vault dim mismatch ({loaded.d} vs {EMBEDDING_DIM}) — starting fresh")
    except Exception as e:
        print(f"[Archivist] Could not load vault: {e} — starting fresh")

if os.path.exists(VAULT_META_PATH):
    try:
        with open(VAULT_META_PATH, "r") as f:
            metadata_store = json.load(f)
    except Exception:
        metadata_store = {}


def _embed_batch(pil_images: list) -> np.ndarray:
    """
    Embed a batch of PIL images via CLIP ViT-B/32.
    Returns float32 array of shape (N, 512), L2-normalised.
    After L2 normalisation, FAISS inner product = cosine similarity.
    """
    _load_clip()

    inputs = _processor(
        text=["dummy"] * len(pil_images),   # CLIP requires text input — dummy is fine for image-only tasks
        images=pil_images,
        return_tensors="pt",
        padding=True,
    )

    if _USE_HALF:
        inputs["pixel_values"] = inputs["pixel_values"].half()

    with torch.inference_mode():
        outputs = _clip(**inputs)

    embeddings = outputs.image_embeds.detach().cpu().float().numpy().astype("float32")
    faiss.normalize_L2(embeddings)
    return embeddings


def _embed_pil_image(pil_image: Image.Image) -> np.ndarray:
    """Single-image embed — used by Sentinel. Returns (1, 512) float32."""
    return _embed_batch([pil_image.convert("RGB")])


def tool_ingest_video(video_path: str) -> str:
    """
    Extracts 1 frame every SAMPLE_EVERY_N_SECS seconds, embeds in batches
    via CLIP ViT-B/32 (float16, lazy-loaded), stores in FAISS vault.

    Optimisations for Render free tier:
    - 30s sample interval → ~180 frames for 90min video
    - Batch size 8 → fewer model calls, lower peak RAM
    - float16 model → ~175MB instead of ~350MB
    - Progress logged every 50 frames
    """
    global vector_db, metadata_store

    video_path = os.path.realpath(video_path)

    if not os.path.exists(video_path):
        return f"[ERROR] File does not exist: {video_path}"

    file_size = os.path.getsize(video_path)
    if file_size < 10_000:
        return f"[ERROR] File too small ({file_size} bytes) — likely a failed download"

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return f"[ERROR] OpenCV could not open video (size={file_size}, ext={os.path.splitext(video_path)[1]}): {video_path}"

    fps             = cap.get(cv2.CAP_PROP_FPS) or 25.0
    sample_interval = max(1, int(fps * SAMPLE_EVERY_N_SECS))

    frame_id         = 0
    extracted_count  = 0
    batch_images     = []
    batch_timestamps = []
    last_log_count   = 0

    def _flush_batch():
        nonlocal extracted_count, last_log_count
        if not batch_images:
            return
        embeddings = _embed_batch(batch_images)
        for emb, ts in zip(embeddings, batch_timestamps):
            db_id = vector_db.ntotal
            vector_db.add(emb.reshape(1, -1))
            metadata_store[str(db_id)] = {
                "video_path":    os.path.relpath(video_path),
                "timestamp_sec": ts,
            }
            extracted_count += 1
        if extracted_count - last_log_count >= 50:
            print(f"[Archivist] Embedded {extracted_count} frames so far…")
            last_log_count = extracted_count
        batch_images.clear()
        batch_timestamps.clear()

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_id % sample_interval == 0:
            pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            batch_images.append(pil_image)
            batch_timestamps.append(int(frame_id / fps))
            if len(batch_images) >= BATCH_SIZE:
                _flush_batch()
        frame_id += 1

    cap.release()
    _flush_batch()

    if extracted_count == 0:
        return f"[ERROR] No frames extracted from video — file may be corrupted or have no readable frames: {video_path}"

    tmp_index = VAULT_INDEX_PATH + ".tmp"
    tmp_meta  = VAULT_META_PATH  + ".tmp"
    try:
        faiss.write_index(vector_db, tmp_index)
        with open(tmp_meta, "w") as f:
            json.dump(metadata_store, f)
        os.replace(tmp_index, VAULT_INDEX_PATH)
        os.replace(tmp_meta,  VAULT_META_PATH)
    except Exception as e:
        for p in [tmp_index, tmp_meta]:
            try: os.remove(p)
            except: pass
        return f"[ERROR] Failed to save vault: {e}"

    return f"[SUCCESS] Extracted {extracted_count} frames. Vault size: {vector_db.ntotal}."


def embed_image_for_sentinel(pil_image: Image.Image) -> np.ndarray:
    """Returns a normalised (1, 512) CLIP embedding — used by the Sentinel."""
    return _embed_pil_image(pil_image)
