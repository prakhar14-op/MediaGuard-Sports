import cv2
import torch
import torchvision.models as models
import torchvision.transforms as T
import faiss
import numpy as np
import json
import os
from PIL import Image

VAULT_DIR = os.path.join(os.path.dirname(__file__), "..", "vault")
os.makedirs(VAULT_DIR, exist_ok=True)

VAULT_INDEX_PATH = os.path.join(VAULT_DIR, "faiss_vault.index")
VAULT_META_PATH  = os.path.join(VAULT_DIR, "vault_metadata.json")

# ─── Lightweight MobileNetV3-Small backbone ───────────────────────────────────
# ~20MB weights, ~200MB runtime RAM — fits Render free tier (512MB)
# Produces 576-dim embeddings from the penultimate layer
print("[Archivist] Loading MobileNetV3 embedding model...")
_backbone = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
_backbone.classifier = torch.nn.Identity()   # strip classifier → raw feature vector
_backbone.eval()

_transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

EMBEDDING_DIM = 576   # MobileNetV3-Small penultimate layer output dim
print(f"[Archivist] Model ready — embedding dim: {EMBEDDING_DIM}")

vector_db      = faiss.IndexFlatL2(EMBEDDING_DIM)
metadata_store = {}

# Load existing vault so vectors persist across restarts
if os.path.exists(VAULT_INDEX_PATH):
    try:
        loaded = faiss.read_index(VAULT_INDEX_PATH)
        # Only load if dimension matches (guards against old CLIP vault)
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


def _embed_pil_image(pil_image: Image.Image) -> np.ndarray:
    """Returns a normalized (1, EMBEDDING_DIM) float32 numpy array."""
    tensor = _transform(pil_image.convert("RGB")).unsqueeze(0)
    with torch.no_grad():
        feat = _backbone(tensor)
    embedding = feat.cpu().numpy().astype("float32").reshape(1, -1)
    return embedding


def tool_ingest_video(video_path: str) -> str:
    """Extracts 1 frame every 5 seconds from an official video, embeds via MobileNetV3, stores in FAISS vault."""
    global vector_db, metadata_store

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return f"[ERROR] Could not open video: {video_path}"

    frame_rate      = int(cap.get(cv2.CAP_PROP_FPS)) or 1
    sample_interval = frame_rate * 5   # 1 frame every 5 seconds
    extracted_count = 0

    while cap.isOpened():
        frame_id = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
        ret, frame = cap.read()
        if not ret:
            break

        if frame_id % sample_interval == 0:
            pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            embedding = _embed_pil_image(pil_image)
            faiss.normalize_L2(embedding)

            db_id = vector_db.ntotal
            vector_db.add(embedding)
            metadata_store[str(db_id)] = {
                "video_path":    video_path,
                "timestamp_sec": extracted_count * 5,
            }
            extracted_count += 1

    cap.release()

    faiss.write_index(vector_db, VAULT_INDEX_PATH)
    with open(VAULT_META_PATH, "w") as f:
        json.dump(metadata_store, f)

    return f"[SUCCESS] Extracted {extracted_count} frames. Vault size: {vector_db.ntotal}."


def embed_image_for_sentinel(pil_image: Image.Image) -> np.ndarray:
    """Returns a normalized (1, EMBEDDING_DIM) embedding — used by the Sentinel."""
    embedding = _embed_pil_image(pil_image)
    faiss.normalize_L2(embedding)
    return embedding
