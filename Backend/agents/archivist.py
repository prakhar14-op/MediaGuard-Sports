"""
Archivist — video fingerprinting via MobileNetV3 embeddings.

Why MobileNetV3 instead of CLIP?
- CLIP ViT-B/32 weights = ~350MB → OOM on Render free tier (512MB)
- MobileNetV3-Large weights = ~22MB → fits easily
- Both produce 512-dim L2-normalised embeddings for cosine similarity
- For piracy detection (frame-level visual similarity) MobileNetV3 is
  sufficient — we don't need cross-modal text-image matching
"""

import cv2
import torch
import torch.nn as nn
import faiss
import numpy as np
import json
import os
from PIL import Image
from torchvision import transforms, models

VAULT_DIR = os.path.join(os.path.dirname(__file__), "..", "vault")
os.makedirs(VAULT_DIR, exist_ok=True)

VAULT_INDEX_PATH = os.path.join(VAULT_DIR, "faiss_vault.index")
VAULT_META_PATH  = os.path.join(VAULT_DIR, "vault_metadata.json")

# ─── MobileNetV3 — lazy loaded ────────────────────────────────────────────────
_model        = None
EMBEDDING_DIM = 512

BATCH_SIZE          = 16   # MobileNetV3 is tiny — 16 frames per pass is fine
SAMPLE_EVERY_N_SECS = 10   # 1 frame per 10s — 90min video = ~540 frames

# Standard ImageNet normalisation
_TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])


def _load_model():
    """Load MobileNetV3 on first call. Subsequent calls are no-ops."""
    global _model
    if _model is not None:
        return

    print("[Archivist] Loading MobileNetV3-Large (~22MB)...")
    base = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.IMAGENET1K_V2)

    # Remove the classifier — use the 960-dim avgpool output, project to 512
    # MobileNetV3-Large: features → AdaptiveAvgPool → flatten → 960-dim
    # We add a linear projection to 512 to match EMBEDDING_DIM
    class _EmbedNet(nn.Module):
        def __init__(self, backbone):
            super().__init__()
            self.features  = backbone.features
            self.avgpool   = backbone.avgpool
            self.project   = nn.Linear(960, EMBEDDING_DIM, bias=False)

        def forward(self, x):
            x = self.features(x)
            x = self.avgpool(x)
            x = torch.flatten(x, 1)
            x = self.project(x)
            return x

    _model = _EmbedNet(base)
    _model.eval()
    print(f"[Archivist] MobileNetV3 ready — embedding dim: {EMBEDDING_DIM}")


# ─── FAISS vault ─────────────────────────────────────────────────────────────
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
    Embed a batch of PIL images.
    Returns float32 array of shape (N, 512), L2-normalised.
    """
    _load_model()

    tensors = torch.stack([_TRANSFORM(img.convert("RGB")) for img in pil_images])
    with torch.inference_mode():
        embeddings = _model(tensors).cpu().numpy().astype("float32")

    faiss.normalize_L2(embeddings)
    return embeddings


def _embed_pil_image(pil_image: Image.Image) -> np.ndarray:
    """Single-image embed — used by Sentinel. Returns (1, 512) float32."""
    return _embed_batch([pil_image.convert("RGB")])


def tool_ingest_video(video_path: str) -> str:
    """
    Extracts 1 frame every SAMPLE_EVERY_N_SECS seconds, embeds in batches
    via MobileNetV3-Large, stores in FAISS vault.
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
    """Returns a normalised (1, 512) embedding — used by the Sentinel."""
    return _embed_pil_image(pil_image)
