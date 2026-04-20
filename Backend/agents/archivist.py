import cv2
import torch
import faiss
import numpy as np
import json
import os
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from crewai.tools import tool
from crewai import Agent

VAULT_DIR = os.path.join(os.path.dirname(__file__), "..", "vault")
os.makedirs(VAULT_DIR, exist_ok=True)

VAULT_INDEX_PATH = os.path.join(VAULT_DIR, "faiss_vault.index")
VAULT_META_PATH  = os.path.join(VAULT_DIR, "vault_metadata.json")

print("[Archivist] Loading CLIP model...")
model_id  = "openai/clip-vit-base-patch32"
processor = CLIPProcessor.from_pretrained(model_id)
clip_model = CLIPModel.from_pretrained(model_id)

EMBEDDING_DIM = 512
vector_db     = faiss.IndexFlatL2(EMBEDDING_DIM)
metadata_store = {}

# Load existing vault if it exists so vectors persist across restarts
if os.path.exists(VAULT_INDEX_PATH):
    vector_db = faiss.read_index(VAULT_INDEX_PATH)
    print(f"[Archivist] Vault loaded — {vector_db.ntotal} vectors")

if os.path.exists(VAULT_META_PATH):
    with open(VAULT_META_PATH, "r") as f:
        metadata_store = json.load(f)


def _embed_pil_image(pil_image):
    inputs = processor(text=["dummy"], images=pil_image, return_tensors="pt", padding=True)
    with torch.no_grad():
        outputs = clip_model(**inputs)
    embedding = outputs.image_embeds.detach().cpu().numpy().astype("float32")
    return embedding.reshape(1, -1)


@tool("Ingest Official Video")
def tool_ingest_video(video_path: str) -> str:
    """Extracts 1 frame/sec from an official video, embeds via CLIP, stores in FAISS vault."""
    global vector_db, metadata_store

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return f"[ERROR] Could not open video: {video_path}"

    frame_rate = int(cap.get(cv2.CAP_PROP_FPS)) or 1
    extracted_count = 0

    while cap.isOpened():
        frame_id = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
        ret, frame = cap.read()
        if not ret:
            break

        if frame_id % frame_rate == 0:
            pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            embedding = _embed_pil_image(pil_image)
            faiss.normalize_L2(embedding)

            db_id = vector_db.ntotal
            vector_db.add(embedding)
            metadata_store[str(db_id)] = {
                "video_path": video_path,
                "timestamp_sec": extracted_count,
            }
            extracted_count += 1

    cap.release()

    faiss.write_index(vector_db, VAULT_INDEX_PATH)
    with open(VAULT_META_PATH, "w") as f:
        json.dump(metadata_store, f)

    return f"[SUCCESS] Extracted {extracted_count} frames. Vault size: {vector_db.ntotal}."


def embed_image_for_sentinel(pil_image):
    """Returns a normalized (1, 512) embedding for a PIL image — used by the Sentinel."""
    embedding = _embed_pil_image(pil_image)
    faiss.normalize_L2(embedding)
    return embedding


archivist_agent = Agent(
    role="The Archivist",
    goal="Ingest official media, extract CLIP embeddings, and store them in the FAISS vault.",
    backstory="A meticulous digital librarian converting video frames into immutable mathematical DNA.",
    verbose=True,
    allow_delegation=False,
    tools=[tool_ingest_video],
    llm=None,
)
