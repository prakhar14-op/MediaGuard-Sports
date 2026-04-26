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

# ─── EfficientNet-B0 backbone ─────────────────────────────────────────────────
# ~20MB weights, ~250MB runtime — fits Render free tier (512MB)
# 1280-dim embeddings — much better than MobileNetV3's 576-dim for visual similarity
print("[Archivist] Loading EfficientNet-B0 embedding model...")
_backbone = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
# Strip the classifier — keep only the feature extractor
_backbone.classifier = torch.nn.Identity()
_backbone.eval()

_transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

EMBEDDING_DIM = 1280   # EfficientNet-B0 penultimate layer output
print(f"[Archivist] Model ready — embedding dim: {EMBEDDING_DIM}")

vector_db      = faiss.IndexFlatIP(EMBEDDING_DIM)  # Inner product (cosine after normalisation)
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


def _embed_pil_image(pil_image: Image.Image) -> np.ndarray:
    """Returns a normalised (1, EMBEDDING_DIM) float32 numpy array."""
    tensor = _transform(pil_image.convert("RGB")).unsqueeze(0)
    with torch.no_grad():
        feat = _backbone(tensor)
    embedding = feat.cpu().numpy().astype("float32").reshape(1, -1)
    # L2 normalise so inner product = cosine similarity
    faiss.normalize_L2(embedding)
    return embedding


def tool_ingest_video(video_path: str) -> str:
    """Extracts 1 frame every 5 seconds, embeds via EfficientNet-B0, stores in FAISS vault."""
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

            db_id = vector_db.ntotal
            vector_db.add(embedding)
            metadata_store[str(db_id)] = {
                "video_path":    os.path.relpath(video_path),  # relative — works on any OS
                "timestamp_sec": extracted_count * 5,
            }
            extracted_count += 1

    cap.release()

    faiss.write_index(vector_db, VAULT_INDEX_PATH)
    with open(VAULT_META_PATH, "w") as f:
        json.dump(metadata_store, f)

    return f"[SUCCESS] Extracted {extracted_count} frames. Vault size: {vector_db.ntotal}."


def embed_image_for_sentinel(pil_image: Image.Image) -> np.ndarray:
    """Returns a normalised (1, EMBEDDING_DIM) embedding — used by the Sentinel."""
    return _embed_pil_image(pil_image)
