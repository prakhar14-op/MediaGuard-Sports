"""
Export CLIP ViT-B/32 vision encoder to ONNX for fast CPU inference.
Run once: python export_clip_onnx.py
Produces: clip_vision.onnx (~330MB, no external .data file)

Windows fix: export to C:\Temp first (no spaces), then copy to Backend/.
Uses save_as_external_data=False to keep everything in one file.
"""
import os, sys, time, shutil, numpy as np, tempfile
import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FINAL_OUT = os.path.join(BASE_DIR, "clip_vision.onnx")

# Use C:\Temp to avoid Windows spaces-in-path issue with ONNX external data
TMP_DIR = r"C:\Temp\mediaguard_onnx"
os.makedirs(TMP_DIR, exist_ok=True)
TMP_OUT = os.path.join(TMP_DIR, "clip_vision.onnx")

print("[ONNX Export] Loading CLIP ViT-B/32 float32...")
t0 = time.time()
proc  = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32", torch_dtype=torch.float32)
model.eval()
print(f"  Loaded in {time.time()-t0:.1f}s")

dummy = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
inp   = proc(text=["dummy"], images=[dummy], return_tensors="pt", padding=True)
pv    = inp["pixel_values"].float()

class VisionWrapper(torch.nn.Module):
    def __init__(self, m):
        super().__init__()
        self.vm = m.vision_model
        self.vp = m.visual_projection
    def forward(self, x):
        p = self.vm(x).pooler_output
        e = self.vp(p)
        return (e / e.norm(dim=-1, keepdim=True)).float()

wrapper = VisionWrapper(model)
wrapper.eval()

# Verify PyTorch output first
with torch.no_grad():
    pt_out = wrapper(pv).numpy()
print(f"[ONNX Export] PyTorch output shape: {pt_out.shape}, norm: {np.linalg.norm(pt_out[0]):.4f}")

print(f"[ONNX Export] Exporting to {TMP_OUT} ...")
t0 = time.time()
with torch.no_grad():
    torch.onnx.export(
        wrapper, pv, TMP_OUT,
        input_names   = ["pixel_values"],
        output_names  = ["image_embeds"],
        dynamic_axes  = {"pixel_values": {0: "batch"}, "image_embeds": {0: "batch"}},
        opset_version = 14,
        do_constant_folding  = True,
    )
print(f"  Exported in {time.time()-t0:.1f}s")

# Verify .onnx file exists and is valid
onnx_size = os.path.getsize(TMP_OUT) / 1e6
print(f"  File size: {onnx_size:.0f}MB")

if onnx_size < 10:
    # Check for .data sidecar (external weights)
    data_file = TMP_OUT + ".data"
    if os.path.exists(data_file):
        print(f"  External data: {os.path.getsize(data_file)/1e6:.0f}MB")
        # Inline the external data using onnx library
        print("  Inlining external data into single file...")
        try:
            import onnx
            from onnx.external_data_helper import convert_model_to_external_data, load_external_data_for_model
            m_onnx = onnx.load(TMP_OUT)
            load_external_data_for_model(m_onnx, TMP_DIR)
            inlined_path = TMP_OUT.replace(".onnx", "_inlined.onnx")
            onnx.save(m_onnx, inlined_path)
            onnx_size = os.path.getsize(inlined_path) / 1e6
            print(f"  Inlined size: {onnx_size:.0f}MB")
            TMP_OUT = inlined_path
        except Exception as e:
            print(f"  Could not inline (onnx pkg needed): {e}")
            print("  pip install onnx")
            sys.exit(1)

# Copy to final destination
print(f"[ONNX Export] Copying to {FINAL_OUT}...")
shutil.copy2(TMP_OUT, FINAL_OUT)
shutil.rmtree(TMP_DIR, ignore_errors=True)

final_size = os.path.getsize(FINAL_OUT) / 1e6
print(f"  Final: {FINAL_OUT} ({final_size:.0f}MB)")

# Verify ONNX output
print("[ONNX Export] Verifying ONNX output...")
import onnxruntime as ort
sess = ort.InferenceSession(FINAL_OUT, providers=["CPUExecutionProvider"])
onnx_out = sess.run(["image_embeds"], {"pixel_values": pv.numpy()})[0]
diff = abs(onnx_out - pt_out).max()
print(f"  Max diff PyTorch vs ONNX: {diff:.6f} (target < 0.001)")
assert diff < 0.01, f"Too large diff: {diff}"

# Benchmark
print("[ONNX Export] Benchmarking (20 runs each, batch=1)...")
pv_np = pv.numpy()

times_onnx = []
for _ in range(20):
    t = time.perf_counter()
    sess.run(["image_embeds"], {"pixel_values": pv_np})
    times_onnx.append(time.perf_counter() - t)

times_pt = []
with torch.no_grad():
    for _ in range(20):
        t = time.perf_counter()
        wrapper(pv)
        times_pt.append(time.perf_counter() - t)

avg_onnx = sum(times_onnx) / len(times_onnx) * 1000
avg_pt   = sum(times_pt)   / len(times_pt)   * 1000
speedup  = avg_pt / avg_onnx if avg_onnx > 0 else 0

print(f"\n  PyTorch:  {avg_pt:.1f}ms/image")
print(f"  ONNX RT:  {avg_onnx:.1f}ms/image")
print(f"  Speedup:  {speedup:.1f}x")

print(f"\n✅ Done. Add to .env:")
print(f"   CLIP_ONNX_PATH={FINAL_OUT}")
