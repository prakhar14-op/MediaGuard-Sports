import os, time
import numpy as np
from PIL import Image

ONNX_PATH = "clip_vision.onnx"

print("Testing ONNX inference...")

# Load ONNX
import onnxruntime as ort
sess_opts = ort.SessionOptions()
sess_opts.intra_op_num_threads = 4
sess = ort.InferenceSession(ONNX_PATH, sess_options=sess_opts, providers=["CPUExecutionProvider"])
print(f"ONNX loaded: {ONNX_PATH}")

# Load processor
from transformers import CLIPProcessor
proc = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# Test image
dummy = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
inp = proc(text=["dummy"], images=[dummy], return_tensors="pt", padding=True)
pv_np = inp["pixel_values"].float().numpy()

# Warmup
sess.run(["image_embeds"], {"pixel_values": pv_np})

# Benchmark single image
times = []
for _ in range(20):
    t = time.perf_counter()
    out = sess.run(["image_embeds"], {"pixel_values": pv_np})
    times.append(time.perf_counter() - t)

avg_ms = sum(times)/len(times)*1000
print(f"ONNX single image: {avg_ms:.1f}ms (was 760ms PyTorch = {760/avg_ms:.1f}x speedup)")
print(f"Output shape: {out[0].shape}, norm: {np.linalg.norm(out[0][0]):.4f}")
print("PASS" if abs(np.linalg.norm(out[0][0]) - 1.0) < 0.001 else "FAIL: not unit norm")

# Batch test
for bs in [1, 2, 4]:
    imgs = [dummy] * bs
    inp_b = proc(text=["dummy"]*bs, images=imgs, return_tensors="pt", padding=True)
    pv_b = inp_b["pixel_values"].float().numpy()
    t = time.perf_counter()
    for _ in range(10):
        sess.run(["image_embeds"], {"pixel_values": pv_b})
    avg_batch = (time.perf_counter()-t)/10*1000
    print(f"Batch={bs}: {avg_batch:.1f}ms total ({avg_batch/bs:.1f}ms/img)")
