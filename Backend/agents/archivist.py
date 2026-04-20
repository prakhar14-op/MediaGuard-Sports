

# import cv2
# import torch
# import faiss
# import numpy as np
# import json
# from PIL import Image
# from transformers import CLIPProcessor, CLIPModel
# from crewai.tools import tool

# # The CrewAI Agent import
# from crewai import Agent

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
            
#             # Access the pooled image embeddings from the model output
# # 1. Grab the pooled output (first element)
#             image_embeds = image_features[0] 
            
#             # 2. Convert to numpy and assign it to 'embedding'
#             embedding = image_embeds.detach().cpu().numpy().astype('float32')
            
#             # 3. Normalize for FAISS
#             faiss.normalize_L2(embedding)
            
#             db_id = vector_db.ntotal
#             vector_db.add(embedding)
#             metadata_store[db_id] = {"video_path": video_path, "timestamp_sec": extracted_count}
            
#             extracted_count += 1
#             print(f"Extracted and embedded frame at {extracted_count} seconds...")
            
#     cap.release()
    
#     # --- PERSISTENT STORAGE (Crucial for the Swarm) ---
#     faiss.write_index(vector_db, "faiss_vault.index")
#     with open("vault_metadata.json", "w") as f:
#         json.dump(metadata_store, f)
    
#     mock_tx_hash = f"0x{np.random.bytes(16).hex()}"
    
#     return f"[SUCCESS] Extracted {extracted_count} frames. Saved 'faiss_vault.index'. Blockchain Mint: {mock_tx_hash}"

# # ==========================================
# # 3. DEFINE THE CREWAI AGENT
# # ==========================================
# archivist_agent = Agent(
#     role='The Archivist',
#     goal='Ingest official media, extract visual tensors using CLIP, and secure ownership in a FAISS vector database.',
#     backstory='You are a meticulous digital librarian. You process raw video feeds, converting visual features into immutable mathematical DNA to protect intellectual property.',
#     verbose=True,
#     allow_delegation=False,
#     tools=[tool_ingest_video],
#     llm=None # In a full run, we assign the Gemini LLM here. Left None for standalone testing.
# )

# # ==========================================
# # 4. DIRECT EXECUTION TEST 
# # ==========================================
# if __name__ == "__main__":
#     print("\nStarting the direct ingestion test...")
#     result = tool_ingest_video.run(video_path="assets/suspect_video.mp4")
    
#     print("\n--- INGESTION RESULT ---")
#     print(result)
#     print(f"Total vectors securely locked in FAISS Vault: {vector_db.ntotal}")



import cv2
import torch
import faiss
import numpy as np
import json
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from crewai.tools import tool
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
        frame_rate = 1 
        
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
            
            # Prepare image for CLIP
            inputs = processor(images=pil_image, return_tensors="pt")
      # --- THE BULLETPROOF CLIP FIX ---
            # Passing dummy text forces CLIP to return its full dictionary, 
            # guaranteeing direct access to the 512-D image_embeds attribute.
            inputs = processor(text=["dummy"], images=pil_image, return_tensors="pt", padding=True)
            
            with torch.no_grad():
                outputs = model(**inputs)
            
            # Grab the explicit 512-dimensional projection
            embedding = outputs.image_embeds.detach().cpu().numpy().astype('float32')
            
            # Reshape to a (1, 512) matrix for FAISS compatibility
            embedding = embedding.reshape(1, -1)
            
            # Normalize and add to Vault
            faiss.normalize_L2(embedding)
            db_id = vector_db.ntotal
            vector_db.add(embedding)
            metadata_store[db_id] = {"video_path": video_path, "timestamp_sec": extracted_count}
            # --------------------------------
            # --- END OF UPDATED CLIP PROCESSING ---
            
            extracted_count += 1
            print(f"Extracted and embedded frame at {extracted_count} seconds...")
            
    cap.release()
    
    # --- PERSISTENT STORAGE ---
    faiss.write_index(vector_db, "faiss_vault.index")
    json_metadata = {str(k): v for k, v in metadata_store.items()}
    with open("vault_metadata.json", "w") as f:
        json.dump(json_metadata, f)
    
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
    llm=None
)

# ==========================================
# 4. DIRECT EXECUTION TEST 
# ==========================================
if __name__ == "__main__":
    print("\nStarting the direct ingestion test...")
    # Point this to your OFFICIAL video
    result = tool_ingest_video.run(video_path="assets/suspect_video.mp4")
    
    print("\n--- INGESTION RESULT ---")
    print(result)
    print(f"Total vectors securely locked in FAISS Vault: {vector_db.ntotal}")