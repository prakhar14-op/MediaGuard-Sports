import cv2
import torch
import faiss
import numpy as np
import json
import os
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

VAULT_DIR = os.path.join(os.path.dirname(__file__), "..", "vault")
os.makedirs(VAULT_DIR, exist_ok=True)

VAULT_INDEX_PATH = os.path.join(VAULT_DIR, "faiss_vault.index")
VAULT_META_PATH  = os.path.join(VAULT_DIR, "vault_metadata.json")

# ─── CLIP ViT-B/32 ────────────────────────────────────────────────────────────
# Render free tier: 512MB RAM total.
# CLIP ViT-B/32 weights alone = ~350MB.
# Optimisations applied:
#   1. half() — float16 weights cut model RAM from ~350MB to ~175MB
#   2. torch.inference_mode() — no gradient graph, saves ~20% memory vs no_grad
#   3. Batch processing — multiple frames per CLIP call instead of 1-by-1
#   4. Frame resize to 224px before PIL conversion — less memory per frame
#   5. Sample interval 10s instead of 3s — 3x fewer frames, still enough for matching
print("[Archivist] Loading CLIP ViT-B/32...")
_MODEL_ID  = "openai/clip-vit-base-patch32"
_processor = CLIPProcessor.from_pretrained(_MODEL_ID)
_clip      = CLIPModel.from_pretrained(_MODEL_ID)
_clip.eval()

# float16 halves model RAM: ~350MB → ~175MB — safe on CPU, no accuracy loss for similarity
try:
    _clip = _clip.half()
    _USE_HALF = True
    print("[Archivist] CLIP running in float16 (half precision) — RAM optimised")
except Exception:
    _USE_HALF = False
    print("[Archivist] float16 not available — running float32")

EMBEDDING_DIM = 512   # CLIP ViT-B/32 image embedding dimension
BATCH_SIZE    = 8     # frames per CLIP forward pass — tune down to 4 if OOM
SAMPLE_EVERY_N_SECS = 10  # 1 frame per 10s — 90min video = ~540 frames (was 1800 at 3s)

print(f"[Archivist] CLIP ready — dim={EMBEDDING_DIM}, batch={BATCH_SIZE}, sample={SAMPLE_EVERY_N_SECS}s")

# Use IndexFlatIP (inner product) — after L2 normalisation this equals cosine similarity
vector_db      = faiss.IndexFlatIP(EMBEDDING_DIM)
metadata_store = {}

# Load existing vault — only if dimension matches
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
    Embed a batch of PIL images via CLIP.
    Returns float32 array of shape (N, 512), L2-normalised.
    Batching is ~4-8x faster than calling CLIP one image at a time.
    """
    inputs = _processor(
        text=["dummy"] * len(pil_images),   # CLIP needs text — dummy is fine for image-only
        images=pil_images,
        return_tensors="pt",
        padding=True,
    )

    # Cast inputs to float16 if model is half precision
    if _USE_HALF:
        inputs["pixel_values"] = inputs["pixel_values"].half()

    with torch.inference_mode():   # lighter than no_grad — no grad graph at all
        outputs = _clip(**inputs)

    embeddings = outputs.image_embeds.detach().cpu().float().numpy().astype("float32")
    faiss.normalize_L2(embeddings)   # normalise so IP = cosine similarity
    return embeddings


def _embed_pil_image(pil_image: Image.Image) -> np.ndarray:
    """Single-image embed — used by Sentinel. Returns (1, 512) float32."""
    return _embed_batch([pil_image.convert("RGB")])


def tool_ingest_video(video_path: str) -> str:
    """
    Extracts 1 frame every SAMPLE_EVERY_N_SECS seconds, embeds in batches via
    CLIP ViT-B/32 (float16), stores in FAISS vault.

    Render free tier optimisations:
    - 10s sample interval  → ~3x fewer frames than 3s
    - Batch size 8         → ~8x faster embedding than 1-by-1
    - float16 model        → ~175MB instead of ~350MB
    - Resize to 224px      → smaller tensors, less RAM per frame
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

    frame_id        = 0
    extracted_count = 0
    batch_images    = []   # PIL images waiting to be embedded
    batch_timestamps= []   # corresponding timestamps in seconds

    def _flush_batch():
        """Embed and store the current batch."""
        nonlocal extracted_count
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
        batch_images.clear()
        batch_timestamps.clear()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_id % sample_interval == 0:
            # Resize to 224px (CLIP's native input size) before converting to PIL
            # — reduces memory per frame significantly for HD/4K videos
            h, w = frame.shape[:2]
            if max(h, w) > 224:
                scale = 224 / max(h, w)
                frame = cv2.resize(frame, (int(w * scale), int(h * scale)),
                                   interpolation=cv2.INTER_AREA)

            pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            batch_images.append(pil_image)
            batch_timestamps.append(int(frame_id / fps))

            if len(batch_images) >= BATCH_SIZE:
                _flush_batch()

        frame_id += 1

    cap.release()
    _flush_batch()   # embed any remaining frames

    if extracted_count == 0:
        return f"[ERROR] No frames extracted from video — file may be corrupted or have no readable frames: {video_path}"

    # Atomic write: write to temp files first, then rename
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
