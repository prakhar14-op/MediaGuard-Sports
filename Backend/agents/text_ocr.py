"""
OCR/Text Detection Module for MediaGuard
=========================================
Detects text, subtitles, and watermarks in video frames using EasyOCR.
"""

import os
import sys
import json
import hashlib
from typing import Optional, List, Dict, Any
from PIL import Image
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ─── OCR Initialization ───────────────────────────────────────────────────────
_ocr_reader = None
_ocr_initialized = False
_ocr_languages = ['en']  # Can be extended with more languages
_ocr_confidence_threshold = 0.5  # Minimum confidence for OCR results

def _init_ocr():
    """Initialize OCR reader (lazy loading to save memory)."""
    global _ocr_reader, _ocr_initialized
    if _ocr_initialized:
        return
    try:
        import easyocr
        print(f"[TextOCR] Initializing EasyOCR with languages: {_ocr_languages}")
        _ocr_reader = easyocr.Reader(_ocr_languages, gpu=False)
        _ocr_initialized = True
        print("[TextOCR] OCR initialized successfully")
    except Exception as e:
        print(f"[TextOCR] Failed to initialize OCR: {e}")
        _ocr_initialized = False


def extract_text_from_image(
    image: Image.Image,
    min_confidence: float = _ocr_confidence_threshold
) -> Dict[str, Any]:
    """
    Extract text from a PIL Image using OCR.
    
    Returns:
        dict with:
            - detected_text: list of text strings
            - text_regions: list of (bbox, text, confidence)
            - has_watermark: bool (detects repeated text patterns)
            - has_subtitles: bool (detects text at bottom of frame)
            - total_confidence: float
    """
    _init_ocr()
    if not _ocr_initialized or not _ocr_reader:
        return {
            "detected_text": [],
            "text_regions": [],
            "has_watermark": False,
            "has_subtitles": False,
            "total_confidence": 0.0
        }
    
    try:
        # Convert PIL Image to numpy array
        img_np = np.array(image)
        
        # Run OCR
        results = _ocr_reader.readtext(img_np, detail=1)
        
        detected_text = []
        text_regions = []
        total_confidence = 0.0
        subtitle_count = 0
        watermark_candidates = {}
        
        img_height, img_width = img_np.shape[:2]
        bottom_region = img_height * 0.2  # Bottom 20% for subtitles
        
        for (bbox, text, confidence) in results:
            if confidence >= min_confidence:
                detected_text.append(text)
                text_regions.append({
                    "bbox": bbox,
                    "text": text,
                    "confidence": float(confidence)
                })
                total_confidence += confidence
                
                # Check if text is in bottom region (subtitle candidate)
                y_coords = [point[1] for point in bbox]
                avg_y = sum(y_coords) / len(y_coords)
                if avg_y >= (img_height - bottom_region):
                    subtitle_count += 1
                
                # Check for repeated text (watermark candidate)
                text_hash = hashlib.md5(text.lower().strip().encode()).hexdigest()
                watermark_candidates[text_hash] = watermark_candidates.get(text_hash, 0) + 1
        
        has_subtitles = subtitle_count >= 2  # At least 2 subtitle lines
        has_watermark = any(count >= 2 for count in watermark_candidates.values())
        
        avg_confidence = total_confidence / len(detected_text) if detected_text else 0.0
        
        return {
            "detected_text": detected_text,
            "text_regions": text_regions,
            "has_watermark": has_watermark,
            "has_subtitles": has_subtitles,
            "total_confidence": float(avg_confidence),
            "num_text_regions": len(text_regions)
        }
    except Exception as e:
        print(f"[TextOCR] Error extracting text: {e}")
        return {
            "detected_text": [],
            "text_regions": [],
            "has_watermark": False,
            "has_subtitles": False,
            "total_confidence": 0.0
        }


def extract_text_from_video_path(
    video_path: str,
    sample_interval_sec: float = 5.0,
    max_frames: int = 20
) -> Dict[str, Any]:
    """
    Extract text from a video file by sampling frames.
    
    Args:
        video_path: Path to video file
        sample_interval_sec: Seconds between sampled frames
        max_frames: Maximum number of frames to process
    
    Returns:
        dict with combined OCR results across sampled frames
    """
    import cv2
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Could not open video file", "detected_text": []}
    
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    sample_interval_frames = max(1, int(fps * sample_interval_sec))
    
    all_text = []
    all_regions = []
    total_subtitles = 0
    total_watermarks = 0
    frame_count = 0
    
    for i in range(0, total_frames, sample_interval_frames):
        if frame_count >= max_frames:
            break
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if not ret:
            break
        
        # Convert to PIL Image
        pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        # Extract text
        result = extract_text_from_image(pil_img)
        all_text.extend(result["detected_text"])
        all_regions.extend(result["text_regions"])
        if result["has_subtitles"]:
            total_subtitles += 1
        if result["has_watermark"]:
            total_watermarks += 1
        
        frame_count += 1
    
    cap.release()
    
    # Deduplicate text
    unique_text = list(set(all_text))
    
    return {
        "detected_text": unique_text,
        "all_text_regions": all_regions,
        "has_subtitles": total_subtitles >= 2,
        "has_watermark": total_watermarks >= 1,
        "num_frames_processed": frame_count,
        "num_text_regions": len(all_regions)
    }