"""
Ingestion Pipeline Profiler — measures every stage timing.
Run: python profile_ingest.py
"""
import time, os, cv2, numpy as np, glob, json

BASE = os.path.dirname(os.path.abspath(__file__))
videos = glob.glob(os.path.join(BASE, "assets", "official", "*.mp4"))
if not videos:
    print("NO VIDEOS FOUND in assets/official/")
    exit(1)

vpath = sorted(videos, key=os.path.getsize, reverse=True)[0]
fsize = os.path.getsize(vpath) / 1e6
print(f"\n=== MediaGuard Ingestion Profiler ===")
print(f"Video: {os.path.basename(vpath)} ({fsize:.1f} MB)")
print("=" * 50)

timings = {}
results = {}

# ─── Stage 1: OpenCV open ────────────────────────────────────────────────────
t0 = time.perf_counter()
cap = cv2.VideoCapture(vpath)
fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration_sec = total_frames / fps
cap.release()
timings["1_cv2_open_ms"] = (time.perf_counter() - t0) * 1000
results["fps"] = fps
results["total_frames"] = total_frames
results["duration_sec"] = duration_sec
print(f"[Stage 1] cv2.open:    {timings['1_cv2_open_ms']:.1f}ms | FPS={fps:.1f} frames={total_frames} duration={duration_sec:.1f}s")

# ─── Stage 2: Frame decode throughput ────────────────────────────────────────
SAMPLE_INTERVAL = max(1, int(fps * 1.0))  # 1s sample
MAX_FRAMES = min(total_frames, int(fps * 120))  # first 2 min

t0 = time.perf_counter()
cap = cv2.VideoCapture(vpath)
sampled, decoded_total = 0, 0
sample_frames = []

fid = 0
while fid < MAX_FRAMES:
    ret, frame = cap.read()
    if not ret:
        break
    decoded_total += 1
    if fid % SAMPLE_INTERVAL == 0:
        sampled += 1
        sample_frames.append(frame.copy())
    fid += 1
cap.release()

t_decode = time.perf_counter() - t0
timings["2_frame_decode_sec"] = t_decode
fps_actual = sampled / t_decode if t_decode > 0 else 0
print(f"[Stage 2] Frame decode: {t_decode:.2f}s for {decoded_total} decoded, {sampled} sampled = {fps_actual:.1f} sampled/sec")
print(f"          → at this rate a 90min video samples {int(fps_actual * (90*60 / SAMPLE_INTERVAL))} scene candidates")

# ─── Stage 3: Histogram computation per frame ────────────────────────────────
hist_times = []
for frame in sample_frames[:50]:
    t = time.perf_counter()
    hist = np.zeros(48, dtype=np.float32)
    for i, ch in enumerate(cv2.split(frame)):
        h = cv2.calcHist([ch], [0], None, [16], [0, 256])
        hist[i*16:(i+1)*16] = h[:, 0]
    hist_times.append(time.perf_counter() - t)

avg_hist_ms = (sum(hist_times) / len(hist_times)) * 1000 if hist_times else 0
timings["3_histogram_per_frame_ms"] = avg_hist_ms
print(f"[Stage 3] Histogram/frame: {avg_hist_ms:.3f}ms avg — FAST, not a bottleneck")

# ─── Stage 4: Scene change detection ─────────────────────────────────────────
scene_times = []
prev_hist = None
scene_count = 0
for frame in sample_frames[:100]:
    t = time.perf_counter()
    hist = np.zeros(48, dtype=np.float32)
    for i, ch in enumerate(cv2.split(frame)):
        h = cv2.calcHist([ch], [0], None, [16], [0, 256])
        hist[i*16:(i+1)*16] = h[:, 0]
    total_h = hist.sum()
    if total_h > 0:
        hist /= total_h
    if prev_hist is not None:
        corr = cv2.compareHist(
            prev_hist.reshape(-1,1).astype(np.float32),
            hist.reshape(-1,1).astype(np.float32),
            cv2.HISTCMP_CORREL)
        if float(corr) < 0.35:
            scene_count += 1
    prev_hist = hist
    scene_times.append(time.perf_counter() - t)

avg_scene_ms = (sum(scene_times) / len(scene_times)) * 1000 if scene_times else 0
timings["4_scene_detect_per_frame_ms"] = avg_scene_ms
scene_rate = scene_count / len(sample_frames[:100]) if sample_frames else 0
print(f"[Stage 4] Scene detect/frame: {avg_scene_ms:.3f}ms avg | scene_rate={scene_rate:.1%} — FAST")

# ─── Stage 5: Screen detection ────────────────────────────────────────────────
screen_times = []
for frame in sample_frames[:30]:
    t = time.perf_counter()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        largest = max(contours, key=cv2.contourArea)
        cv2.arcLength(largest, True)
    screen_times.append(time.perf_counter() - t)

avg_screen_ms = (sum(screen_times) / len(screen_times)) * 1000 if screen_times else 0
timings["5_screen_detect_per_frame_ms"] = avg_screen_ms
print(f"[Stage 5] Screen detect/frame: {avg_screen_ms:.2f}ms avg — {'FAST' if avg_screen_ms < 5 else 'MODERATE'}")

# ─── Stage 6: CLIP model load ─────────────────────────────────────────────────
from transformers import CLIPProcessor, CLIPModel
import torch
from PIL import Image
import faiss

print("\n[Stage 6] Loading CLIP ViT-B/32 (float16)...")
t0 = time.perf_counter()
proc  = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32", torch_dtype=torch.float16)
model.eval()
t_load = time.perf_counter() - t0
timings["6_clip_load_sec"] = t_load
print(f"[Stage 6] CLIP load: {t_load:.2f}s — only once per process")

# ─── Stage 7: CLIP embed — single image ───────────────────────────────────────
pil_frame = Image.fromarray(cv2.cvtColor(sample_frames[0], cv2.COLOR_BGR2RGB))
single_times = []
for _ in range(10):
    t = time.perf_counter()
    inp = proc(text=["dummy"], images=[pil_frame], return_tensors="pt", padding=True)
    inp["pixel_values"] = inp["pixel_values"].half()
    with torch.inference_mode():
        out = model(**inp)
    emb = out.image_embeds.detach().cpu().float().numpy()
    faiss.normalize_L2(emb)
    single_times.append(time.perf_counter() - t)

avg_single_ms = (sum(single_times) / len(single_times)) * 1000
timings["7_clip_single_embed_ms"] = avg_single_ms
print(f"\n[Stage 7] CLIP single embed: {avg_single_ms:.1f}ms avg")
print(f"          → at this rate processing 50 scenes = {avg_single_ms * 50 / 1000:.1f}s SEQUENTIAL")

# ─── Stage 8: CLIP batch embed ────────────────────────────────────────────────
print("\n[Stage 8] CLIP batch embed timing:")
scene_pils = [Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)) for f in sample_frames[:32]]
for bs in [1, 4, 8, 16, 32]:
    if bs > len(scene_pils):
        break
    imgs = scene_pils[:bs]
    times = []
    for _ in range(5):
        t = time.perf_counter()
        inp = proc(text=["dummy"]*bs, images=imgs, return_tensors="pt", padding=True)
        inp["pixel_values"] = inp["pixel_values"].half()
        with torch.inference_mode():
            out = model(**inp)
        emb = out.image_embeds.detach().cpu().float().numpy()
        faiss.normalize_L2(emb)
        times.append(time.perf_counter() - t)
    avg = (sum(times)/len(times)) * 1000
    per_img = avg / bs
    timings[f"8_clip_batch_{bs}_ms"] = avg
    print(f"          batch={bs:2d}: {avg:6.1f}ms total | {per_img:5.1f}ms/img | speedup vs single: {avg_single_ms/per_img:.1f}x")

# ─── Stage 9: FAISS add vectors ───────────────────────────────────────────────
dummy_vecs = np.random.randn(100, 512).astype("float32")
faiss.normalize_L2(dummy_vecs)
idx = faiss.IndexFlatIP(512)

t0 = time.perf_counter()
for v in dummy_vecs:
    idx.add(v.reshape(1, -1))
t_faiss_seq = (time.perf_counter() - t0) * 1000
timings["9_faiss_add_100_sequential_ms"] = t_faiss_seq

t0 = time.perf_counter()
idx.add(dummy_vecs)
t_faiss_batch = (time.perf_counter() - t0) * 1000
timings["9_faiss_add_100_batch_ms"] = t_faiss_batch
print(f"\n[Stage 9] FAISS add 100 vectors: sequential={t_faiss_seq:.1f}ms | batch={t_faiss_batch:.1f}ms")

# ─── Stage 10: Audio extraction (ffmpeg) ─────────────────────────────────────
import tempfile, subprocess
from agents.audio_fingerprint import _get_ffmpeg_exe, _ffmpeg_available

print(f"\n[Stage 10] Audio extraction (ffmpeg):")
if _ffmpeg_available():
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        wav_path = tf.name
    t0 = time.perf_counter()
    ffmpeg_exe = _get_ffmpeg_exe()
    result = subprocess.run([
        ffmpeg_exe, "-y", "-i", vpath,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", "-f", "wav", wav_path
    ], capture_output=True, timeout=120)
    t_audio = time.perf_counter() - t0
    wav_size = os.path.getsize(wav_path) / 1e6 if os.path.exists(wav_path) else 0
    os.remove(wav_path) if os.path.exists(wav_path) else None
    timings["10_audio_extract_sec"] = t_audio
    print(f"          ffmpeg audio extract: {t_audio:.2f}s → {wav_size:.1f}MB WAV")
    print(f"          → for a 90min video: ~{t_audio * (90*60/duration_sec):.0f}s estimate")
else:
    print("          ffmpeg NOT available")
    timings["10_audio_extract_sec"] = -1

# ─── Stage 11: Chroma fingerprint computation ─────────────────────────────────
from agents.audio_fingerprint import _extract_audio_pcm, _read_wav_pcm, _compute_chroma, _chroma_to_fingerprint

with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
    wav2 = tf.name
ok = _extract_audio_pcm(vpath, wav2)
if ok:
    samples, sr = _read_wav_pcm(wav2)
    t0 = time.perf_counter()
    chroma = _compute_chroma(samples, sr)
    t_chroma = time.perf_counter() - t0
    t0 = time.perf_counter()
    fp = _chroma_to_fingerprint(chroma)
    t_fp = time.perf_counter() - t0
    timings["11_chroma_compute_sec"] = t_chroma
    timings["11_fingerprint_hash_sec"] = t_fp
    print(f"\n[Stage 11] Chroma compute: {t_chroma:.2f}s | Fingerprint hash: {t_fp:.3f}s")
    print(f"           {len(fp)} fingerprint segments from {len(samples)/sr:.1f}s audio")
    os.remove(wav2) if os.path.exists(wav2) else None
else:
    print("\n[Stage 11] Audio extraction failed — cannot profile chroma")

# ─── Stage 12: Vault save (atomic write) ─────────────────────────────────────
import json as _json
dummy_meta = {str(i): {"video_path": "test.mp4", "timestamp_sec": i} for i in range(200)}

t0 = time.perf_counter()
tmp = "/tmp/test_meta.json.tmp"
with open(tmp, "w") as f:
    _json.dump(dummy_meta, f)
os.replace(tmp, "/tmp/test_meta.json")
t_save = (time.perf_counter() - t0) * 1000
timings["12_metadata_save_ms"] = t_save
print(f"\n[Stage 12] Metadata atomic save (200 entries): {t_save:.1f}ms")

# ─── FULL PIPELINE ESTIMATE ───────────────────────────────────────────────────
print("\n" + "=" * 60)
print("=== BOTTLENECK ANALYSIS — 5 minute video (300s) ===")
print("=" * 60)

# Estimate frames for 5-min video at 25fps, 1s sampling
n_sampled_5min = 300  # 1 frame/sec = 300 frames
scene_rate_est = 0.15  # 15% scene change rate typical
n_scenes_5min = max(1, int(n_sampled_5min * scene_rate_est))
best_batch = 16

print(f"\nVideo: 5min, {fps:.0f}fps, 1s sampling → {n_sampled_5min} sampled, ~{n_scenes_5min} scene boundaries")
print()

stages_5min = {
    "Frame decode (sequential, cv2)":        n_sampled_5min * timings.get("2_frame_decode_sec", 0.1) * 10,  # rough
    "Histogram+scene detect (per frame)":    n_sampled_5min * timings.get("4_scene_detect_per_frame_ms", 0.3) / 1000,
    "Screen detection (scene frames only)":  n_scenes_5min  * timings.get("5_screen_detect_per_frame_ms", 3.0) / 1000,
    "CLIP embed (batch=16, scenes only)":    (n_scenes_5min / best_batch) * timings.get(f"8_clip_batch_16_ms", 200) / 1000,
    "FAISS add vectors":                     n_scenes_5min * timings.get("9_faiss_add_100_sequential_ms", 10) / 100 / 1000,
    "Audio extraction (ffmpeg)":             timings.get("10_audio_extract_sec", 5),
    "Chroma fingerprint":                    timings.get("11_chroma_compute_sec", 2),
    "Vault save":                            timings.get("12_metadata_save_ms", 50) / 1000,
}

total_est = 0
for stage, t in stages_5min.items():
    flag = "🔴 BOTTLENECK" if t > 30 else ("🟡 SLOW" if t > 5 else "🟢 FAST")
    print(f"  {flag:20s} {stage:45s} {t:6.1f}s")
    total_est += t

# Frame decode is the main loop — need to re-estimate properly
# Raw loop time = total_frames / fps / speed_factor
raw_decode = (300 * fps) / (fps * 30)  # OpenCV can decode ~30x realtime
stages_5min["Frame decode (main loop)"] = raw_decode
print(f"  {'':20s} {'Frame read loop (OpenCV ~30x realtime)':45s} {raw_decode:6.1f}s")

print(f"\n  TOTAL ESTIMATED: ~{total_est:.0f}s for 5-minute video")
print()
print("  CURRENT BOTTLENECKS (ranked by time):")
ranked = sorted(stages_5min.items(), key=lambda x: x[1], reverse=True)
for i, (stage, t) in enumerate(ranked[:5], 1):
    print(f"    #{i}: {stage} — {t:.1f}s")

print()
print("=== RAW TIMINGS ===")
for k, v in sorted(timings.items()):
    print(f"  {k}: {v:.3f}")
