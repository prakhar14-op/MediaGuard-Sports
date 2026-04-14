

# import cv2
# import torch
# import faiss
# import numpy as np
# from PIL import Image
# from transformers import CLIPProcessor, CLIPModel
# from langchain_core.tools import tool

# # ==========================================
# # 1. INITIALIZE THE "BRAIN" (Pre-trained CLIP)
# # ==========================================
# print("Loading CLIP Model (This acts as our pre-trained visual brain)...")
# model_id = "openai/clip-vit-base-patch32"
# processor = CLIPProcessor.from_pretrained(model_id)
# model = CLIPModel.from_pretrained(model_id)

# # Initialize FAISS Index (L2 distance for 512-dimensional CLIP vectors)
# embedding_dim = 512 
# vector_db = faiss.IndexFlatL2(embedding_dim)

# # Dictionary to map FAISS IDs back to video names
# metadata_store = {}

# # ==========================================
# # 2. THE ARCHIVIST'S TOOL (Frame Extraction & Embedding)
# # ==========================================
# @tool("Ingest Official Video")
# def tool_ingest_video(video_path: str) -> str:
#     """Extracts frames from an official video, generates CNN embeddings, and stores them in FAISS."""
#     global vector_db, metadata_store
    
#     print(f"\n[Archivist] Ingesting official asset: {video_path}")
    
#     cap = cv2.VideoCapture(video_path)
#     if not cap.isOpened():
#         return f"[ERROR] Could not open video: {video_path}. Make sure the file exists!"
    
#     frame_rate = int(cap.get(cv2.CAP_PROP_FPS))
#     if frame_rate == 0: 
#         frame_rate = 1 # Fallback just in case
        
#     extracted_count = 0
    
#     while cap.isOpened():
#         frame_id = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
#         ret, frame = cap.read()
        
#         if not ret:
#             break
            
#         # Extract 1 frame every second
#         if frame_id % frame_rate == 0:
#             rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#             pil_image = Image.fromarray(rgb_frame)
            
#             inputs = processor(images=pil_image, return_tensors="pt")
#             with torch.no_grad():
#                 image_features = model.get_image_features(**inputs)
            
#             embedding = image_features.numpy().astype('float32')
#             faiss.normalize_L2(embedding)
            
#             db_id = vector_db.ntotal
#             vector_db.add(embedding)
#             metadata_store[db_id] = {"video_path": video_path, "timestamp_sec": extracted_count}
            
#             extracted_count += 1
#             print(f"Extracted and embedded frame at {extracted_count} seconds...")
            
#     cap.release()
    
#     mock_tx_hash = f"0x{np.random.bytes(16).hex()}"
    
#     return f"[SUCCESS] Extracted {extracted_count} frames. Stored 512-D vectors in FAISS. Blockchain Proof Minted: {mock_tx_hash}"

# # ==========================================
# # 3. DIRECT EXECUTION TEST 
# # ==========================================
# if __name__ == "__main__":
#     print("\nStarting the direct ingestion test...")
#     # Make sure you have a small video named 'test_video.mp4' in the backend folder!
#     result = tool_ingest_video.invoke({"video_path": "assets/test_video.mp4"})
    
#     print("\n--- INGESTION RESULT ---")
#     print(result)
#     print(f"Total vectors safely stored in FAISS Vault: {vector_db.ntotal}")


import cv2
import torch
import faiss
import numpy as np
import json
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from langchain_core.tools import tool

# The CrewAI Agent import
from crewai import Agent

# ==========================================
# 1. INITIALIZE THE "BRAIN" (Pre-trained CLIP)
# ==========================================
print("Loading CLIP Model (This acts as our pre-trained visual brain)...")
model_id = "openai/clip-vit-base-patch32"
processor = CLIPProcessor.from_pretrained(model_id)
model = CLIPModel.from_pretrained(model_id)

# Initialize FAISS Index (L2 distance for 512-dimensional CLIP vectors)
embedding_dim = 512 
vector_db = faiss.IndexFlatL2(embedding_dim)

# Dictionary to map FAISS IDs back to video names
metadata_store = {}

# ==========================================
# 2. THE ARCHIVIST'S TOOL (Frame Extraction & Embedding)
# ==========================================
@tool("Ingest Official Video")
def tool_ingest_video(video_path: str) -> str:
    """Extracts frames from an official video, generates CNN embeddings, and stores them in FAISS."""
    global vector_db, metadata_store
    
    print(f"\n[Archivist] Ingesting official asset: {video_path}")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return f"[ERROR] Could not open video: {video_path}. Make sure the file exists!"
    
    frame_rate = int(cap.get(cv2.CAP_PROP_FPS))
    if frame_rate == 0: 
        frame_rate = 1 # Fallback just in case
        
    extracted_count = 0
    
    while cap.isOpened():
        frame_id = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
        ret, frame = cap.read()
        
        if not ret:
            break
            
        # Extract 1 frame every second
        if frame_id % frame_rate == 0:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_frame)
            
            inputs = processor(images=pil_image, return_tensors="pt")
            with torch.no_grad():
                image_features = model.get_image_features(**inputs)
            
            embedding = image_features.numpy().astype('float32')
            faiss.normalize_L2(embedding)
            
            db_id = vector_db.ntotal
            vector_db.add(embedding)
            metadata_store[db_id] = {"video_path": video_path, "timestamp_sec": extracted_count}
            
            extracted_count += 1
            print(f"Extracted and embedded frame at {extracted_count} seconds...")
            
    cap.release()
    
    # --- PERSISTENT STORAGE (Crucial for the Swarm) ---
    faiss.write_index(vector_db, "faiss_vault.index")
    with open("vault_metadata.json", "w") as f:
        json.dump(metadata_store, f)
    
    mock_tx_hash = f"0x{np.random.bytes(16).hex()}"
    
    return f"[SUCCESS] Extracted {extracted_count} frames. Saved 'faiss_vault.index'. Blockchain Mint: {mock_tx_hash}"

# ==========================================
# 3. DEFINE THE CREWAI AGENT
# ==========================================
archivist_agent = Agent(
    role='The Archivist',
    goal='Ingest official media, extract visual tensors using CLIP, and secure ownership in a FAISS vector database.',
    backstory='You are a meticulous digital librarian. You process raw video feeds, converting visual features into immutable mathematical DNA to protect intellectual property.',
    verbose=True,
    allow_delegation=False,
    tools=[tool_ingest_video],
    llm=None # In a full run, we assign the Gemini LLM here. Left None for standalone testing.
)

# ==========================================
# 4. DIRECT EXECUTION TEST 
# ==========================================
if __name__ == "__main__":
    print("\nStarting the direct ingestion test...")
    result = tool_ingest_video.invoke({"video_path": "assets/test_video.mp4"})
    
    print("\n--- INGESTION RESULT ---")
    print(result)
    print(f"Total vectors securely locked in FAISS Vault: {vector_db.ntotal}")