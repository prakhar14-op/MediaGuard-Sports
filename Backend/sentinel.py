# import cv2
# import torch
# import faiss
# import numpy as np
# from PIL import Image
# from transformers import CLIPProcessor, CLIPModel
# from crewai.tools import tool
# from crewai import Agent

# # ==========================================
# # 1. INITIALIZE THE SENTINEL'S BRAIN
# # ==========================================
# print("Loading Sentinel CLIP Model & FAISS Vault...")
# model_id = "openai/clip-vit-base-patch32"
# processor = CLIPProcessor.from_pretrained(model_id)
# model = CLIPModel.from_pretrained(model_id)

# # Load the database created by the Archivist
# try:
#     vector_db = faiss.read_index("faiss_vault.index")
#     print(f"Vault loaded successfully. Protecting {vector_db.ntotal} authorized assets.")
# except Exception as e:
#     print(f"[FATAL ERROR] Could not find 'faiss_vault.index'. Did the Archivist run? Error: {e}")
#     exit()

# # ==========================================
# # 2. THE SENTINEL'S TOOL (Detecting Piracy)
# # ==========================================
# @tool("Scan Suspect Media")
# def tool_scan_media(suspect_video_path: str) -> str:
#     """Scrapes a suspect video, extracts embeddings, and compares against the FAISS Vault."""
#     global vector_db
    
#     print(f"\n[Sentinel] Scanning target: {suspect_video_path}...")
    
#     cap = cv2.VideoCapture(suspect_video_path)
#     if not cap.isOpened():
#         return f"[ERROR] Could not open suspect video: {suspect_video_path}"
    
#     frame_rate = int(cap.get(cv2.CAP_PROP_FPS))
#     if frame_rate == 0: frame_rate = 1
        
#     match_found = False
#     highest_confidence = 0.0
    
#     while cap.isOpened() and not match_found:
#         frame_id = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
#         ret, frame = cap.read()
        
#         if not ret:
#             break
            
#         # Check 1 frame every second
#         if frame_id % frame_rate == 0:
#             rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#             pil_image = Image.fromarray(rgb_frame)
            
#             inputs = processor(images=pil_image, return_tensors="pt")
#             with torch.no_grad():
#                 image_features = model.get_image_features(**inputs)
            
#             suspect_embedding = image_features.numpy().astype('float32')
#             faiss.normalize_L2(suspect_embedding)
            
#             # Search the FAISS database for the closest mathematical match
#             distance, index = vector_db.search(suspect_embedding, k=1)
#             current_distance = distance[0][0]
            
#             if current_distance < 0.6:
#                 match_found = True
#                 highest_confidence = round((1.0 - (current_distance / 2.0)) * 100, 2)
#                 print(f"⚠️ [ALERT] L2 Vector Distance: {current_distance:.4f} (Extremely Close!)")
#                 break
#             else:
#                 print("Clear. No match found in this frame...")
                
#     cap.release()
    
#     if match_found:
#         return f"[CRITICAL ANOMALY DETECTED] Signature Match: {highest_confidence}% confidence. Waking up Adjudicator Agent."
#     else:
#         return "[CLEAN] No unauthorized assets detected in this media."

# # ==========================================
# # 3. DEFINE THE CREWAI AGENT
# # ==========================================
# sentinel_agent = Agent(
#     role='The Sentinel',
#     goal='Scan target media files, extract their mathematical embeddings, and detect unauthorized matches against the FAISS Vault.',
#     backstory='You are a relentless digital radar. You sweep the internet looking for visual anomalies that match protected intellectual property.',
#     verbose=True,
#     allow_delegation=False,
#     tools=[tool_scan_media],
#     llm=None # Purely execution-based for now.
# )

# # ==========================================
# # 4. DIRECT EXECUTION TEST 
# # ==========================================
# if __name__ == "__main__":
#     print("\nStarting the Sentinel radar sweep...")
#     # Point the Sentinel at a simulated 'stolen' video in your assets folder
#     result = tool_scan_media.invoke({"suspect_video_path": "assets/suspect_video.mp4"})
    
#     print("\n--- SENTINEL REPORT ---")
#     print(result)
import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM  # <-- Notice we imported LLM here

# Load the API key from the .env file
load_dotenv()

print("Waking up The Adjudicator (Gemini 1.5 Pro)...")

# ==========================================
# 1. INITIALIZE THE LLM BRAIN
# ==========================================
# This is the modern CrewAI way to set temperature and pass the key!
gemini_brain = LLM(
    model="gemini/gemini-1.5-pro",
    temperature=0.1,
    api_key=os.getenv("GEMINI_API_KEY")
)

# ==========================================
# 2. DEFINE THE ADJUDICATOR AGENT
# ==========================================
adjudicator_agent = Agent(
    role='Chief IP Adjudicator',
    goal='Analyze flagged media metadata to distinguish between malicious piracy and transformative fair use.',
    backstory="""You are an elite, cold, and highly logical legal AI. You receive alerts from the Sentinel radar. 
    Your job is to read the context of the flagged video. 
    - If it is raw, unaltered footage meant to steal views, you classify it as 'SEVERE PIRACY'.
    - If it contains heavy commentary, transformative editing, or parody, you classify it as 'FAIR USE / FAN CONTENT'.""",
    verbose=True,
    allow_delegation=False,
    llm=gemini_brain  # <-- Pass the customized brain here!
)

# ==========================================
# 2. DIRECT EXECUTION TEST 
# ==========================================
if __name__ == "__main__":
    sentinel_report = "[CRITICAL ANOMALY DETECTED] Signature Match: 100.0% confidence."
    
    mock_context = f"""
    SENTINEL ALERT: {sentinel_report}
    VIDEO SOURCE: TikTok
    ACCOUNT: @AnimeFanEdits_99
    AUDIO TRANSCRIPT: "Bro watch this crazy sequence!" followed by heavy phonk music and meme sound effects.
    VISUALS: Original video is heavily filtered, and text overlays are on screen.
    """

    triage_task = Task(
        description=f"""Analyze the following incident report:\n{mock_context}\n
        Determine if this is Piracy or Fair Use. You must output a final decision in exactly this format:
        CLASSIFICATION: [Piracy or Fair Use]
        JUSTIFICATION: [1-2 sentences explaining why based on the audio/visual context]
        RECOMMENDED ROUTING: [Enforcer or Broker]""",
        expected_output="A strict 3-line legal classification.",
        agent=adjudicator_agent
    )

    adjudicator_crew = Crew(
        agents=[adjudicator_agent],
        tasks=[triage_task],
        verbose=True
    )

    print("\n[ALERT] Handing context to Adjudicator...\n")
    result = adjudicator_crew.kickoff()
    
    print("\n==============================================")
    print("⚖️ FINAL ADJUDICATOR VERDICT")
    print("==============================================")
    print(result)
