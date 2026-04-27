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

# ─── CLIP — lazy loaded ───────────────────────────────────────────────────────
# DO NOT load CLIP at import time — Render free tier has 512MB RAM and CLIP
# weights alone are ~350MB.  Loading at startup causes OOM before the server
# even starts.  Instead we load once on first use and cache the references.
_MODEL_ID     = "openai/clip-vit-base-patch32"
_processor    = None
_clip         = None
_USE_HALF     = False
EMBEDDING_DIM = 512

BATCH_SIZE          = 4   # conservative for 512MB — increase to 8 on paid tier
SAMPLE_EVERY_N_SECS = 10  # 1 frame per 10s — 90min video = ~540 frames


def _load_clip():
    """Load CLIP into memory on first call. Subsequent calls are no-ops."""
    global _processor, _clip, _USE_HALF
    if _clip is not None:
        return  # already loaded

    from transformers import CLIPProcessor, CLIPModel
    print("[Archivist] Loading CLIP ViT-B/32 (lazy)...")

    _processor = CLIPProcessor.from_pretrained(_MODEL_ID)

    # Load directly to float16 to avoid the double-RAM spike that happens when
    # transformers loads float32 then converts — saves ~175MB peak RAM.
    try:
        _clip = CLIPModel.from_pretrained(_MODEL_ID, torch_dtype=torch.float16)
        _USE_HALF = True
        print("[Archivist] CLIP loaded in float16 — ~175MB RAM")
    except Exception:
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
    Embed a batch of PIL images via CLIP.
    Returns float32 array of shape (N, 512), L2-normalised.
    CLIP is loaded on first call (lazy).
    """
    _load_clip()

    inputs = _processor(
        text=["dummy"] * len(pil_images),
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

    def _flush_batch():
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
            # Resize to 224px — CLIP's native input size, reduces RAM per frame
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
