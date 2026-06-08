"""
MediaGuard Forensics Model Training Script
==========================================
Trains the SND (Social Network Detection) model from Su et al. 2025
on the R-SMUD dataset to produce pretrained weights for forensics.py.

Usage (local or GCP VM with T4/A100):
    python train_forensics.py

Usage (GCP Vertex AI custom job):
    gcloud ai custom-jobs create \
        --region=us-central1 \
        --display-name=mediaguard-forensics-train \
        --worker-pool-spec=machine-type=n1-standard-8,accelerator-type=NVIDIA_TESLA_T4,accelerator-count=1,replica-count=1,container-image-uri=gcr.io/deeplearning-platform-release/pytorch-gpu.2-0 \
        --args="--script=train_forensics.py" \
        -- python train_forensics.py

After training, the best checkpoint is saved to:
    ./checkpoints/best.pth  (local)
    gs://{GCS_BUCKET}/forensics/best.pth  (if GCS_BUCKET env var is set)

Set in your GCP service:
    FORENSICS_MODEL_GCS=gs://{your-bucket}/forensics/best.pth

The forensics agent will auto-switch from heuristic → neural mode.

Expected training time:
    T4 GPU:  ~6-8 hours for 80 epochs
    A100:    ~2-3 hours for 80 epochs
    CPU:     Not recommended (days)

Expected accuracy after training:
    Chain-1 (single platform): ~100%
    Chain-2 (two platforms):   ~86%
    Chain-3 (three platforms): ~60%
    (matches Su et al. 2025 paper results)
"""

import math
import random
import zipfile
import urllib.request
import collections
import time
import json
import glob
import shutil
import os
import subprocess
import sys
from dataclasses import dataclass, asdict

import numpy as np
from PIL import Image
import scipy.fft as fft_lib
from tqdm import tqdm

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torch.optim.lr_scheduler import CosineAnnealingLR


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Config:
    # Image / DCT
    H: int = 256
    W: int = 256
    T: int = 20   # DCT clip range → 21 stereo channels

    # Architecture (Su et al. defaults)
    d_model:          int = 512
    d_ff:             int = 2048
    d_k:              int = 64
    d_v:              int = 64
    n_layers:         int = 6
    n_heads:          int = 8
    feature_dim:      int = 529
    num_words:        int = 64
    num_networks:     int = 3
    mode:             int = 7
    dropout:          float = 0.1
    input_channel_noise: int = 9
    meta_dim:         int = 160

    # Training
    batch_size:       int = 4
    lr:               float = 2e-4
    weight_decay:     float = 1e-4
    epochs:           int = 80
    label_smoothing:  float = 0.1
    grad_clip:        float = 1.0
    use_amp:          bool = True    # enable AMP on GPU for faster training

    # Paths
    data_root:        str = "./data/D1-release"
    ckpt_dir:         str = "./checkpoints"
    results_path:     str = "./results.json"

    # GCS upload (optional)
    gcs_bucket:       str = ""   # e.g. "my-bucket" — set via env var GCS_BUCKET

    # Reproducibility
    seed:             int = 42
    split:            tuple = (0.8, 0.1, 0.1)
    num_platforms:    int = 3
    max_chain:        int = 3
    auto_resume:      bool = True

    # LCD-specific
    aux_length_weight: float = 0.5
    bias_alpha_init:   float = 0.0

    schema_version:   int = 1
    track:            str = "mediaguard_forensics_v1"


# ═══════════════════════════════════════════════════════════════════════════════
# DATASET
# ═══════════════════════════════════════════════════════════════════════════════

DATASET_URL = "https://loki.disi.unitn.it/~rvsmud/D1-release.zip"
PLATFORMS   = ["FB", "TW", "FL"]
PLAT2IDX    = {p: i for i, p in enumerate(PLATFORMS)}

_STD_QTABLE = np.array([
    [16, 11, 10, 16, 24, 40, 51, 61],
    [12, 12, 14, 19, 26, 58, 60, 55],
    [14, 13, 16, 24, 40, 57, 69, 56],
    [14, 17, 22, 29, 51, 87, 80, 62],
    [18, 22, 37, 56, 68, 109, 103, 77],
    [24, 35, 55, 64, 81, 104, 113, 92],
    [49, 64, 78, 87, 103, 121, 120, 101],
    [72, 92, 95, 98, 112, 100, 103, 99],
], dtype=np.float32)


def download_dataset(cfg: Config):
    zip_path    = "./D1-release.zip"
    extract_dir = "./data"

    if os.path.exists(cfg.data_root) and len(os.listdir(cfg.data_root)) >= 10:
        print(f"[data] Dataset already present at {cfg.data_root}")
        return

    if not os.path.exists(zip_path):
        print(f"[data] Downloading R-SMUD (~8 GB) from {DATASET_URL}")
        urllib.request.urlretrieve(DATASET_URL, zip_path)

    os.makedirs(extract_dir, exist_ok=True)
    print("[data] Extracting...")
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(extract_dir)
    print(f"[data] Extracted to {cfg.data_root}")


def get_qtable(path: str) -> np.ndarray:
    try:
        img   = Image.open(path)
        qtabs = getattr(img, "quantization", None)
        if qtabs:
            q = list(qtabs.values())[0]
            if len(q) == 64:
                return np.array(q, dtype=np.float32).reshape(8, 8)
    except Exception:
        pass
    return _STD_QTABLE.copy()


def extract_qf_from_path(path: str) -> int:
    for part in path.split(os.sep):
        if part.startswith("QF-"):
            try:
                return int(part[3:])
            except ValueError:
                pass
    return -1


def make_dct_stereo(dct: np.ndarray, T: int = 20) -> np.ndarray:
    clipped = np.clip(np.abs(dct).astype(np.int64), 0, T)
    stereo  = np.zeros((T + 1, *clipped.shape), dtype=np.float32)
    for t in range(T + 1):
        stereo[t] = (clipped == t).astype(np.float32)
    return stereo


def make_meta_vector(qtab: np.ndarray, container: np.ndarray, meta_dim: int = 160) -> np.ndarray:
    q_flat       = qtab.reshape(64).astype(np.float32) / 255.0
    full         = np.zeros(meta_dim, dtype=np.float32)
    full[:64]    = q_flat
    full[64:68]  = container
    return full


def parse_chain(folder_name: str, max_chain: int = 3):
    parts  = folder_name.strip().split("-")
    idxs   = [PLAT2IDX[p] for p in parts]
    length = len(idxs)
    while len(idxs) < max_chain:
        idxs.append(0)
    return idxs, length


class RSMUDDataset(Dataset):
    def __init__(self, root: str, cfg: Config):
        self.H        = cfg.H
        self.W        = cfg.W
        self.T        = cfg.T
        self.meta_dim = cfg.meta_dim
        self.max_chain = cfg.max_chain
        self.samples  = []

        platform_set = set(PLATFORMS)
        if not os.path.exists(root):
            raise RuntimeError(f"Dataset root not found: {root}")

        for chain_folder in sorted(os.listdir(root)):
            chain_dir = os.path.join(root, chain_folder)
            if not os.path.isdir(chain_dir):
                continue
            parts = chain_folder.split("-")
            if not all(p in platform_set for p in parts):
                continue
            try:
                chain_idxs, chain_len = parse_chain(chain_folder, cfg.max_chain)
            except KeyError:
                continue

            found = []
            for entry in os.listdir(chain_dir):
                ep = os.path.join(chain_dir, entry)
                if os.path.isdir(ep) and entry.startswith("QF-"):
                    for fname in os.listdir(ep):
                        if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                            found.append(os.path.join(ep, fname))
                elif entry.lower().endswith((".jpg", ".jpeg", ".png")):
                    found.append(ep)

            for img_path in found:
                self.samples.append((img_path, chain_idxs, chain_len))

        chain_labels = set("-".join(str(x) for x in s[1]) for s in self.samples)
        print(f"[dataset] {len(self.samples)} images across {len(chain_labels)} chains")

    def _build(self, idx: int):
        path, chain_idxs, chain_len = self.samples[idx]

        pil   = Image.open(path)
        q_np  = get_qtable(path)
        rgb   = np.array(pil.convert("RGB").resize((self.W, self.H)), dtype=np.float32) / 255.0
        img_t = torch.from_numpy(rgb).permute(2, 0, 1)

        gray   = np.array(pil.convert("L").resize((self.W, self.H)), dtype=np.float32) - 128.0
        blocks = gray.reshape(self.H // 8, 8, self.W // 8, 8)
        dct    = fft_lib.dctn(blocks, type=2, norm="ortho", axes=(1, 3)).reshape(self.H, self.W).astype(np.float32)
        stereo_t = torch.from_numpy(make_dct_stereo(dct, self.T))
        q_t      = torch.from_numpy(q_np)

        orig_w, orig_h = pil.size
        qf = extract_qf_from_path(path)
        try:
            fsize_kb = os.path.getsize(path) / 1024.0
        except Exception:
            fsize_kb = 0.0

        container = np.array([
            orig_h / 3000.0,
            orig_w / 3000.0,
            (qf if qf > 0 else 75) / 100.0,
            min(fsize_kb, 2000.0) / 2000.0,
        ], dtype=np.float32)

        meta_t  = torch.from_numpy(make_meta_vector(q_np, container, self.meta_dim))
        chain_t = torch.tensor(chain_idxs, dtype=torch.long)
        len_t   = torch.tensor(chain_len,   dtype=torch.long)

        return img_t, stereo_t, q_t, meta_t, chain_t, len_t

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        try:
            return self._build(idx)
        except Exception as e:
            print(f"[dataset] WARN skip idx={idx}: {e}")
            return self.__getitem__((idx + 1) % len(self))


# ═══════════════════════════════════════════════════════════════════════════════
# MODEL (Su et al. 2025 — LCD variant)
# ═══════════════════════════════════════════════════════════════════════════════

# Module-level globals — set by set_global_dims() before model instantiation
d_model = 512; d_ff = 2048; d_k = 64; d_v = 64
n_layers = 6; n_heads = 8; mode = 7; dropout = 0.1
num_words = 64; num_networks = 3; feature_dim = 529


def set_global_dims(cfg: Config):
    global d_model, d_ff, d_k, d_v, n_layers, n_heads, mode, dropout
    global num_words, num_networks, feature_dim
    d_model = cfg.d_model; d_ff = cfg.d_ff; d_k = cfg.d_k; d_v = cfg.d_v
    n_layers = cfg.n_layers; n_heads = cfg.n_heads; mode = cfg.mode
    dropout = cfg.dropout; num_words = cfg.num_words
    num_networks = cfg.num_networks; feature_dim = cfg.feature_dim


class PositionalEncoding(nn.Module):
    def __init__(self, d_model, drop=0.1, max_len=5000):
        super().__init__()
        self.dropout = nn.Dropout(p=drop)
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        pe = pe.unsqueeze(0).transpose(0, 1)
        self.register_buffer("pe", pe)

    def forward(self, x):
        return self.dropout(x + self.pe[:x.size(0), :])


def get_attn_pad_mask(seq_q, seq_k):
    B, Lq = seq_q.size(); _, Lk = seq_k.size()
    return seq_k.data.eq(0).unsqueeze(1).expand(B, Lq, Lk)


def get_attn_subsequence_mask(seq):
    shape = [seq.size(0), seq.size(1), seq.size(1)]
    mask  = torch.from_numpy(np.triu(np.ones(shape), k=1)).byte()
    return mask.cuda() if torch.cuda.is_available() else mask


class AFTSelfLayer(nn.Module):
    def __init__(self, d_model, seq_len, d_ff_mult=4, causal=False):
        super().__init__()
        self.causal = causal
        self.w_q    = nn.Linear(d_model, d_model)
        self.w_k    = nn.Linear(d_model, d_model)
        self.w_v    = nn.Linear(d_model, d_model)
        self.w_pos  = nn.Parameter(torch.randn(seq_len, seq_len) * 0.02)
        self.ffn    = nn.Sequential(
            nn.Linear(d_model, d_model * d_ff_mult), nn.GELU(),
            nn.Linear(d_model * d_ff_mult, d_model),
        )
        self.norm1  = nn.LayerNorm(d_model)
        self.norm2  = nn.LayerNorm(d_model)
        if causal:
            cm = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()
            self.register_buffer("causal_mask", cm)

    def forward(self, x, mask=None):
        B, T, D = x.shape
        h = self.norm1(x)
        Q, K, V = self.w_q(h), self.w_k(h), self.w_v(h)
        with torch.amp.autocast(device_type="cuda", enabled=False):
            K, V = K.float(), V.float()
            w    = self.w_pos[:T, :T].unsqueeze(0).unsqueeze(-1).float()
            scores = w + K.unsqueeze(1)
            if self.causal:
                scores = scores.masked_fill(self.causal_mask[:T, :T].view(1, T, T, 1), -1e9)
            attn = F.softmax(scores, dim=2)
            out  = (attn * V.unsqueeze(1)).sum(2)
        x = x + torch.sigmoid(Q) * out.to(x.dtype)
        return x + self.ffn(self.norm2(x))


class CrossAFTLayer(nn.Module):
    def __init__(self, d_model, q_len, k_len):
        super().__init__()
        self.w_q    = nn.Linear(d_model, d_model)
        self.w_k    = nn.Linear(d_model, d_model)
        self.w_v    = nn.Linear(d_model, d_model)
        self.w_pos  = nn.Parameter(torch.randn(q_len, k_len) * 0.02)
        self.norm_q = nn.LayerNorm(d_model)
        self.norm_k = nn.LayerNorm(d_model)

    def forward(self, q_in, kv):
        B, Tq, D = q_in.shape; _, Tk, _ = kv.shape
        hq, hk   = self.norm_q(q_in), self.norm_k(kv)
        Q, K, V  = self.w_q(hq), self.w_k(hk), self.w_v(hk)
        with torch.amp.autocast(device_type="cuda", enabled=False):
            K, V = K.float(), V.float()
            w    = self.w_pos[:Tq, :Tk].unsqueeze(0).unsqueeze(-1).float()
            attn = F.softmax(w + K.unsqueeze(1), dim=2)
            out  = (attn * V.unsqueeze(1)).sum(2)
        return q_in + torch.sigmoid(Q) * out.to(q_in.dtype)


class Encoder(nn.Module):
    def __init__(self):
        super().__init__()
        d_ff_mult = max(1, (d_ff * 2 + d_model - 1) // d_model)
        self.layers = nn.ModuleList([
            AFTSelfLayer(d_model, num_words, d_ff_mult=d_ff_mult)
            for _ in range(n_layers)
        ])

    def forward(self, x):
        for layer in self.layers:
            x = layer(x)
        return x


class LengthHead(nn.Module):
    def __init__(self):
        super().__init__()
        self.pool = nn.Sequential(nn.Linear(d_model, d_model), nn.GELU(), nn.Dropout(0.1))
        self.head = nn.Linear(d_model, num_networks)

    def forward(self, enc):
        return self.head(self.pool(enc.mean(dim=1)))


class LengthBias(nn.Module):
    def __init__(self):
        super().__init__()
        self.bias  = nn.Parameter(torch.zeros(num_networks, num_words, d_model))
        self.alpha = nn.Parameter(torch.tensor(0.0))

    def forward(self, len_probs, enc):
        flat  = self.bias.reshape(num_networks, num_words * d_model)
        mixed = (len_probs @ flat).reshape(-1, num_words, d_model)
        return enc + torch.sigmoid(self.alpha) * mixed


class DecoderLayer(nn.Module):
    def __init__(self):
        super().__init__()
        d_ff_mult       = max(1, (d_ff * 2 + d_model - 1) // d_model)
        self.self_attn  = AFTSelfLayer(d_model, num_networks + 1, d_ff_mult=d_ff_mult, causal=True)
        self.cross_attn = CrossAFTLayer(d_model, num_networks + 1, num_words)
        self.ffn        = nn.Sequential(
            nn.Linear(d_model, d_model * d_ff_mult), nn.GELU(),
            nn.Linear(d_model * d_ff_mult, d_model),
        )
        self.norm = nn.LayerNorm(d_model)

    def forward(self, dec, enc, mask=None):
        x = self.self_attn(dec)
        x = self.cross_attn(x, enc)
        return x + self.ffn(self.norm(x))


class Decoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.tgt_emb  = nn.Embedding(mode, d_model)
        self.pos_emb  = PositionalEncoding(d_model, drop=dropout)
        self.len_head = LengthHead()
        self.len_bias = LengthBias()
        self.layers   = nn.ModuleList([DecoderLayer() for _ in range(n_layers)])

    def forward(self, dec_in, enc):
        len_logits  = self.len_head(enc)
        len_probs   = F.softmax(len_logits, dim=-1)
        enc_biased  = self.len_bias(len_probs, enc)

        emb  = self.tgt_emb(dec_in)
        x    = self.pos_emb(emb.transpose(0, 1)).transpose(0, 1)
        mask = get_attn_pad_mask(dec_in, dec_in)
        sub  = get_attn_subsequence_mask(dec_in)
        combined = torch.gt((mask + sub), 0)
        combined = abs(combined.float() - 1)

        for layer in self.layers:
            x = layer(x, enc_biased, combined)
        return x, len_logits


class Transformer(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder    = Encoder()
        self.decoder    = Decoder()
        self.projection = nn.Linear(d_model, mode, bias=False)

    def forward(self, sentence, dec_inputs):
        enc = self.encoder(sentence)
        dec, len_logits = self.decoder(dec_inputs, enc)
        logits = self.projection(dec)
        return logits.view(-1, mode), enc, len_logits


class BasicBlock(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.seq  = nn.Sequential(
            nn.Conv2d(c, c, 3, 1, 1, bias=False), nn.BatchNorm2d(c), nn.ReLU(inplace=True),
            nn.Conv2d(c, c, 3, 1, 1, bias=False), nn.BatchNorm2d(c),
        )
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        return self.relu(x + self.seq(x))


class DCTStream(nn.Module):
    def __init__(self):
        super().__init__()
        self.l0 = nn.Sequential(
            nn.Conv2d(21, 64, 3, 1, dilation=8, padding=8),
            nn.BatchNorm2d(64), nn.ReLU(inplace=True),
        )
        self.l1 = nn.Sequential(
            nn.Conv2d(64, 4, 1, bias=False), nn.BatchNorm2d(4), nn.ReLU(inplace=True),
        )

    def forward(self, dct_vol, qtab):
        x = self.l1(self.l0(dct_vol))
        B, C, H, W = x.shape
        xr = x.reshape(B, C, H//8, 8, W//8, 8).permute(0,1,3,5,2,4).reshape(B, 64*C, H//8, W//8)
        xt = x.reshape(B, C, H//8, 8, W//8, 8).permute(0,1,3,5,2,4)
        qm = qtab.unsqueeze(1).unsqueeze(-1).unsqueeze(-1)
        xq = (xt * qm).reshape(B, 64*C, H//8, W//8)
        return torch.cat([xr, xq], dim=1)


class SRMConv2D(nn.Module):
    def __init__(self):
        super().__init__()
        self.register_buffer("weight", torch.tensor(self._build()))

    @staticmethod
    def _build():
        srm1 = np.zeros((5,5), dtype=np.float32)
        srm1[1:-1,1:-1] = np.array([[-1,2,-1],[2,-4,2],[-1,2,-1]]); srm1 /= 4.0
        srm2 = np.array([[-1,2,-2,2,-1],[2,-6,8,-6,2],[-2,8,-12,8,-2],
                          [2,-6,8,-6,2],[-1,2,-2,2,-1]], dtype=np.float32) / 12.0
        srm3 = np.zeros((5,5), dtype=np.float32)
        srm3[2,1:-1] = np.array([1,-2,1]); srm3 /= 2.0
        kernel = []
        for srm in [srm1, srm2, srm3]:
            for ch in range(3):
                k = np.zeros((5,5,3), dtype=np.float32); k[:,:,ch] = srm
                kernel.append(k)
        kernel = np.stack(kernel, axis=-1)
        kernel = np.swapaxes(kernel, 1, 2)
        kernel = np.swapaxes(kernel, 0, 3)
        return kernel

    def forward(self, x):
        return F.conv2d(x, self.weight, padding=2)


class SND(nn.Module):
    def __init__(self, input_channel: int, num_words_: int, batch_size: int, feature_dim_: int = 529):
        super().__init__()
        self.srm        = SRMConv2D()
        self.dct_stream = DCTStream()

        self.dct_feat   = nn.Sequential(
            nn.Conv2d(512, 128, 3,1,1,bias=False), nn.BatchNorm2d(128), nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, 3,1,1,bias=False), nn.BatchNorm2d(128), nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, 3,1,1,bias=False), nn.BatchNorm2d(128), nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, 3,1,1,bias=False), nn.BatchNorm2d(128), nn.ReLU(inplace=True),
        )
        self.noise_feat = nn.Sequential(
            nn.Conv2d(input_channel, 64, 3,1,1,bias=False), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3,1,1,bias=False), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3,1,1,bias=False), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3,1,1,bias=False), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
        )
        self.total_feat = nn.Sequential(
            nn.Conv2d(192, 64, 3,1,1,bias=False), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3,1,1,bias=False), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3,1,1,bias=False), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3,1,1,bias=False), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
        )
        self.resblocks = nn.ModuleList([BasicBlock(64) for _ in range(4)])
        self.noise_words = nn.Sequential(
            nn.Conv2d(64*5, 64, 3,1,1,bias=False), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.Conv2d(64, num_words_, 3,1,1,bias=False), nn.BatchNorm2d(num_words_), nn.ReLU(inplace=True),
            nn.AdaptiveMaxPool2d((32, 32)),
        )
        self.se = nn.Sequential(
            nn.AdaptiveMaxPool2d(1),
            nn.Conv2d(num_words_, 2, 1), nn.ReLU(),
            nn.Conv2d(2, num_words_, 1), nn.Sigmoid(),
        )
        self.proj      = nn.Sequential(
            nn.Conv2d(1184, 512, 1), nn.BatchNorm2d(512), nn.ReLU(inplace=True),
        )
        self.pos_emb   = nn.Parameter(torch.randn(num_words_, 512))
        self.transformer = Transformer()

    def forward(self, img, dct_vol, qtab, dec_in, meta):
        noise     = self.srm(img)
        dct_out   = self.dct_stream(dct_vol, qtab)
        dct_f     = self.dct_feat(dct_out)
        N         = self.noise_feat(noise)
        skips     = [F.adaptive_max_pool2d(N, (32,32))]
        for i, rb in enumerate(self.resblocks):
            N = rb(N)
            if i < 3:
                skips.append(F.adaptive_max_pool2d(N, (32,32)))
                N = F.max_pool2d(N, 2, stride=2, ceil_mode=True)
        N  = torch.cat([N] + skips, dim=1)
        N  = self.noise_words(N)
        N  = N * self.se(N)
        tf = self.total_feat(torch.cat([dct_f, N], dim=1))
        tf = tf.view(tf.shape[0], 64, 1024)
        m  = meta.unsqueeze(1).repeat(1, 64, 1)
        tf = torch.cat([m, tf], dim=2)
        tf = self.proj(tf.transpose(1,2).unsqueeze(3)).squeeze(3)
        logits, enc, len_logits = self.transformer(
            tf.transpose(1,2) + self.pos_emb, dec_in
        )
        return logits, enc, len_logits


# ═══════════════════════════════════════════════════════════════════════════════
# CHECKPOINT I/O
# ═══════════════════════════════════════════════════════════════════════════════

def _ckpt_epoch_num(path):
    try:
        return int(os.path.basename(path).replace("ckpt_epoch", "").replace(".pth", ""))
    except Exception:
        return -1


def find_latest_ckpt(ckpt_dir):
    files = glob.glob(os.path.join(ckpt_dir, "ckpt_epoch*.pth"))
    if files:
        return max(files, key=_ckpt_epoch_num)
    latest = os.path.join(ckpt_dir, "latest.pth")
    return latest if os.path.exists(latest) else None


def prune_old_ckpts(ckpt_dir, keep=3):
    files = sorted(glob.glob(os.path.join(ckpt_dir, "ckpt_epoch*.pth")), key=_ckpt_epoch_num)
    for old in files[:-keep]:
        try:
            os.remove(old)
        except Exception:
            pass


def save_checkpoint(path, epoch, model, opt, sched, scaler, best_val_acc,
                    best_val_per_len, history, cfg, split_indices):
    state = {
        "epoch":           epoch,
        "model_state":     model.state_dict(),
        "optimizer_state": opt.state_dict(),
        "scheduler_state": sched.state_dict() if sched else None,
        "scaler_state":    scaler.state_dict() if scaler else None,
        "best_val_acc":    best_val_acc,
        "best_val_per_len": best_val_per_len,
        "history":         history,
        "rng_state": {
            "python":     random.getstate(),
            "numpy":      np.random.get_state(),
            "torch_cpu":  torch.get_rng_state(),
            "torch_cuda": torch.cuda.get_rng_state_all() if torch.cuda.is_available() else [],
        },
        "config":         asdict(cfg),
        "split_indices":  split_indices,
        "track":          cfg.track,
        "schema_version": cfg.schema_version,
    }
    tmp = path + ".tmp"
    torch.save(state, tmp)
    os.replace(tmp, path)


def load_checkpoint(path, model, opt, sched, scaler, cfg: Config):
    ckpt = torch.load(path, map_location="cpu", weights_only=False)
    if ckpt.get("schema_version", 0) != cfg.schema_version:
        print(f"[resume] Schema mismatch — starting fresh")
        return None
    if ckpt.get("track") != cfg.track:
        print(f"[resume] Track mismatch — starting fresh")
        return None
    model.load_state_dict(ckpt["model_state"])
    opt.load_state_dict(ckpt["optimizer_state"])
    if sched and ckpt.get("scheduler_state"):
        sched.load_state_dict(ckpt["scheduler_state"])
    if scaler and ckpt.get("scaler_state"):
        scaler.load_state_dict(ckpt["scaler_state"])
    rs = ckpt["rng_state"]
    try:
        random.setstate(rs["python"]); np.random.set_state(rs["numpy"])
        torch.set_rng_state(rs["torch_cpu"])
        if torch.cuda.is_available() and rs.get("torch_cuda"):
            torch.cuda.set_rng_state_all(rs["torch_cuda"])
    except Exception as e:
        print(f"[resume] RNG restore warning: {e}")
    print(f"[resume] Loaded {path} — resuming from epoch {ckpt['epoch']+1}")
    return ckpt


def upload_to_gcs(local_path: str, gcs_bucket: str, gcs_key: str = "forensics/best.pth"):
    """Upload checkpoint to GCS if bucket is configured."""
    if not gcs_bucket:
        return
    gcs_uri = f"gs://{gcs_bucket}/{gcs_key}"
    try:
        subprocess.run(["gsutil", "cp", local_path, gcs_uri], check=True, timeout=120)
        print(f"[GCS] Uploaded best checkpoint → {gcs_uri}")
        print(f"[GCS] Set env var: FORENSICS_MODEL_GCS={gcs_uri}")
    except FileNotFoundError:
        # gsutil not available — try google-cloud-storage library
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(gcs_bucket)
            blob   = bucket.blob(gcs_key)
            blob.upload_from_filename(local_path)
            print(f"[GCS] Uploaded best checkpoint → {gcs_uri}")
        except Exception as e:
            print(f"[GCS] Upload failed: {e} — checkpoint saved locally at {local_path}")
    except Exception as e:
        print(f"[GCS] Upload failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# TRAINING & EVALUATION
# ═══════════════════════════════════════════════════════════════════════════════

def encode_decoder_inputs(chains, lengths, cfg):
    B = chains.size(0)
    dec_in = torch.zeros((B, cfg.num_networks + 1), dtype=torch.long, device=chains.device)
    dec_in[:, 0] = 1  # SOS
    for b in range(B):
        L = lengths[b].item()
        for t in range(L):
            dec_in[b, t + 1] = chains[b, t].item() + 2
    return dec_in


def decode_targets(chains, lengths, cfg):
    B = chains.size(0)
    tgt = torch.zeros((B, cfg.num_networks + 1), dtype=torch.long, device=chains.device)
    for b in range(B):
        L = lengths[b].item()
        for t in range(L):
            tgt[b, t] = chains[b, t].item() + 2
    return tgt


def train_one_epoch(model, loader, opt, scaler, device, cfg, epoch):
    model.train()
    use_amp   = scaler is not None and scaler.is_enabled()
    tot_loss  = tot_correct = tot_samples = 0

    pbar = tqdm(loader, desc=f"Epoch {epoch} [train]", leave=False, dynamic_ncols=True)
    for img, stereo, qtab, meta, chains, lengths in pbar:
        img     = img.to(device, non_blocking=True)
        stereo  = stereo.to(device, non_blocking=True)
        qtab    = qtab.to(device, non_blocking=True)
        meta    = meta.to(device, non_blocking=True)
        chains  = chains.to(device, non_blocking=True)
        lengths = lengths.to(device, non_blocking=True)
        B       = img.size(0)

        dec_inputs = encode_decoder_inputs(chains, lengths, cfg)
        targets    = decode_targets(chains, lengths, cfg)

        with torch.amp.autocast(device_type="cuda", enabled=use_amp):
            logits, _, len_logits = model(img, stereo, qtab, dec_inputs, meta)
            tgt_flat    = targets.reshape(-1)
            chain_loss  = F.cross_entropy(logits, tgt_flat, ignore_index=0, label_smoothing=cfg.label_smoothing)
            len_targets = lengths - 1
            len_loss    = F.cross_entropy(len_logits, len_targets, label_smoothing=cfg.label_smoothing)
            loss        = chain_loss + cfg.aux_length_weight * len_loss

        if not torch.isfinite(loss):
            opt.zero_grad(set_to_none=True)
            tot_samples += B
            continue

        opt.zero_grad(set_to_none=True)
        if use_amp:
            scaler.scale(loss).backward()
            scaler.unscale_(opt)
            torch.nn.utils.clip_grad_norm_(model.parameters(), cfg.grad_clip)
            scaler.step(opt); scaler.update()
        else:
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), cfg.grad_clip)
            opt.step()

        pred = logits.argmax(-1).reshape(B, cfg.num_networks + 1)
        for b in range(B):
            cl = lengths[b].item()
            ok = all(pred[b, t].item() == chains[b, t].item() + 2 for t in range(cl))
            if ok:
                tot_correct += 1

        tot_loss    += loss.item() * B
        tot_samples += B
        pbar.set_postfix(loss=f"{loss.item():.3f}", acc=f"{100.*tot_correct/tot_samples:.1f}%")

    return tot_loss / max(tot_samples, 1), 100.0 * tot_correct / max(tot_samples, 1)


@torch.no_grad()
def evaluate(model, loader, device, cfg):
    model.eval()
    buckets = collections.defaultdict(lambda: [0, 0])
    tot_correct = tot_samples = 0

    for img, stereo, qtab, meta, chains, lengths in loader:
        img, stereo, qtab, meta = (
            img.to(device), stereo.to(device), qtab.to(device), meta.to(device)
        )
        chains, lengths = chains.to(device), lengths.to(device)
        B = img.size(0)

        dec_inputs = torch.zeros((B, cfg.num_networks + 1), dtype=torch.long, device=device)
        dec_inputs[:, 0] = 1  # SOS
        for t in range(cfg.num_networks):
            logits, _, _ = model(img, stereo, qtab, dec_inputs, meta)
            pred = logits.argmax(-1).reshape(B, cfg.num_networks + 1)
            dec_inputs[:, t + 1] = pred[:, t]

        for b in range(B):
            cl = lengths[b].item()
            ok = all(dec_inputs[b, t+1].item() == chains[b, t].item() + 2 for t in range(cl))
            buckets[cl][0] += int(ok)
            buckets[cl][1] += 1
            tot_correct    += int(ok)
            tot_samples    += 1

    per_len = {cl: 100.0 * v[0] / v[1] for cl, v in buckets.items() if v[1] > 0}
    return 100.0 * tot_correct / max(tot_samples, 1), per_len


# ═══════════════════════════════════════════════════════════════════════════════
# STRATIFIED SPLIT
# ═══════════════════════════════════════════════════════════════════════════════

def stratified_split(samples, split, seed):
    rng      = np.random.default_rng(seed)
    by_chain = collections.defaultdict(list)
    for i, (_, chain_idxs, _) in enumerate(samples):
        by_chain[tuple(chain_idxs)].append(i)
    tr, va, te = [], [], []
    for idxs in by_chain.values():
        idxs = np.array(idxs); rng.shuffle(idxs)
        n    = len(idxs)
        n_tr = int(n * split[0]); n_va = int(n * split[1])
        tr.extend(idxs[:n_tr].tolist())
        va.extend(idxs[n_tr:n_tr+n_va].tolist())
        te.extend(idxs[n_tr+n_va:].tolist())
    return tr, va, te


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    cfg = Config()

    # Read GCS bucket from env var if set
    cfg.gcs_bucket = os.getenv("GCS_BUCKET", cfg.gcs_bucket).strip()

    # Seeds
    random.seed(cfg.seed); np.random.seed(cfg.seed); torch.manual_seed(cfg.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(cfg.seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark     = False

    set_global_dims(cfg)
    os.makedirs(cfg.ckpt_dir, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n{'='*60}")
    print(f"MediaGuard Forensics Model Training — Su et al. 2025 (LCD)")
    print(f"{'='*60}")
    print(f"Device    : {device}")
    if device == "cuda":
        props = torch.cuda.get_device_properties(0)
        print(f"GPU       : {torch.cuda.get_device_name(0)} ({props.total_memory/1e9:.1f} GB)")
    print(f"Config    : d_model={cfg.d_model}, d_ff={cfg.d_ff}, n_layers={cfg.n_layers}")
    print(f"Epochs    : {cfg.epochs}  Batch: {cfg.batch_size}  LR: {cfg.lr}")
    print(f"Ckpt dir  : {cfg.ckpt_dir}")
    print(f"GCS bucket: {cfg.gcs_bucket or 'not set (local only)'}")

    with open(os.path.join(cfg.ckpt_dir, "config.json"), "w") as f:
        json.dump(asdict(cfg), f, indent=2)

    # Dataset
    download_dataset(cfg)
    full_ds = RSMUDDataset(cfg.data_root, cfg)
    if len(full_ds) == 0:
        raise RuntimeError(f"No images found in {cfg.data_root}")

    tr_idx, val_idx, te_idx = stratified_split(full_ds.samples, cfg.split, cfg.seed)
    print(f"[data] train={len(tr_idx)}  val={len(val_idx)}  test={len(te_idx)}")

    nw = min(4, os.cpu_count() or 1)
    train_loader = DataLoader(torch.utils.data.Subset(full_ds, tr_idx),  cfg.batch_size, shuffle=True,  num_workers=nw, pin_memory=(device=="cuda"))
    val_loader   = DataLoader(torch.utils.data.Subset(full_ds, val_idx), cfg.batch_size, shuffle=False, num_workers=nw, pin_memory=(device=="cuda"))
    test_loader  = DataLoader(torch.utils.data.Subset(full_ds, te_idx),  cfg.batch_size, shuffle=False, num_workers=nw, pin_memory=(device=="cuda"))

    # Model
    model = SND(cfg.input_channel_noise, cfg.num_words, cfg.batch_size, cfg.feature_dim).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"[model] Params: {n_params:,} ({n_params/1e6:.1f}M)")

    opt   = torch.optim.AdamW(model.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay)
    sched = CosineAnnealingLR(opt, T_max=cfg.epochs)
    use_amp_flag = cfg.use_amp and device == "cuda"
    scaler       = torch.amp.GradScaler(device="cuda", enabled=use_amp_flag)
    print(f"AMP: {use_amp_flag}")

    # Auto-resume
    start_epoch    = 0
    best_val_acc   = 0.0
    best_val_per_len = {}
    history        = []
    split_indices  = {"train": tr_idx, "val": val_idx, "test": te_idx}

    latest = find_latest_ckpt(cfg.ckpt_dir) if cfg.auto_resume else None
    if latest:
        ckpt = load_checkpoint(latest, model, opt, sched, scaler, cfg)
        if ckpt:
            start_epoch      = ckpt["epoch"] + 1
            best_val_acc     = ckpt["best_val_acc"]
            best_val_per_len = ckpt.get("best_val_per_len", {})
            history          = ckpt.get("history", [])
            si               = ckpt.get("split_indices")
            if si:
                split_indices = si
                train_loader  = DataLoader(torch.utils.data.Subset(full_ds, si["train"]), cfg.batch_size, shuffle=True,  num_workers=nw, pin_memory=(device=="cuda"))
                val_loader    = DataLoader(torch.utils.data.Subset(full_ds, si["val"]),   cfg.batch_size, shuffle=False, num_workers=nw, pin_memory=(device=="cuda"))
                test_loader   = DataLoader(torch.utils.data.Subset(full_ds, si["test"]),  cfg.batch_size, shuffle=False, num_workers=nw, pin_memory=(device=="cuda"))

    # Training loop
    t0 = time.time()
    for epoch in range(start_epoch, cfg.epochs):
        tr_loss, tr_acc = train_one_epoch(model, train_loader, opt, scaler, device, cfg, epoch + 1)
        val_acc, val_per_len = evaluate(model, val_loader, device, cfg)
        sched.step()

        log = {"epoch": epoch+1, "train_loss": tr_loss, "train_acc": tr_acc,
               "val_acc": val_acc, "val_per_len": val_per_len, "lr": opt.param_groups[0]["lr"]}
        history.append(log)

        improved = val_acc > best_val_acc
        if improved:
            best_val_acc     = val_acc
            best_val_per_len = val_per_len

        print(f"Ep {epoch+1:3d}/{cfg.epochs} | loss {tr_loss:.4f} | "
              f"tr {tr_acc:.1f}% | val {val_acc:.1f}% "
              f"(C1 {val_per_len.get(1,0):.1f} C2 {val_per_len.get(2,0):.1f} C3 {val_per_len.get(3,0):.1f})"
              f"{'  *BEST*' if improved else ''}")

        ckpt_path = os.path.join(cfg.ckpt_dir, f"ckpt_epoch{epoch+1:03d}.pth")
        save_checkpoint(ckpt_path, epoch, model, opt, sched, scaler,
                        best_val_acc, best_val_per_len, history, cfg, split_indices)
        shutil.copyfile(ckpt_path, os.path.join(cfg.ckpt_dir, "latest.pth"))
        if improved:
            shutil.copyfile(ckpt_path, os.path.join(cfg.ckpt_dir, "best.pth"))
        prune_old_ckpts(cfg.ckpt_dir, keep=3)

    # Final test evaluation
    wall_min  = (time.time() - t0) / 60.0
    best_path = os.path.join(cfg.ckpt_dir, "best.pth")

    if os.path.exists(best_path):
        print(f"\n[final] Loading best checkpoint for test evaluation…")
        ckpt = torch.load(best_path, map_location=device, weights_only=False)
        model.load_state_dict(ckpt["model_state"])
        test_acc, test_per_len = evaluate(model, test_loader, device, cfg)

        paper_ref = {"1": 100.0, "2": 86.46, "3": 60.35}
        gap       = {str(k): test_per_len.get(k, 0) - paper_ref[str(k)] for k in [1, 2, 3]}

        results = {
            "track":               cfg.track,
            "test_acc_overall":    test_acc,
            "test_acc_per_len":    {str(k): v for k, v in test_per_len.items()},
            "paper_reference":     paper_ref,
            "gap_vs_paper":        gap,
            "best_val_acc":        best_val_acc,
            "best_val_per_len":    best_val_per_len,
            "wallclock_minutes":   round(wall_min, 2),
            "n_params":            n_params,
        }
        with open(cfg.results_path, "w") as f:
            json.dump(results, f, indent=2)

        print(f"\n{'='*64}")
        print(f"FINAL TEST RESULTS")
        print(f"{'='*64}")
        print(f"{'Method':<28} {'C1':>8} {'C2':>8} {'C3':>8} {'Overall':>9}")
        print(f"{'-'*64}")
        def _row(name, pl, overall):
            print(f"{name:<28} {pl.get(1,0):>7.2f}% {pl.get(2,0):>7.2f}% {pl.get(3,0):>7.2f}% {overall:>8.2f}%")
        _row("Paper (Su et al. 2025)", {1:100.0, 2:86.46, 3:60.35}, 0.0)
        _row("Ours (MediaGuard)",      test_per_len,                  test_acc)
        print(f"\nWallclock: {wall_min:.1f} minutes")
        print(f"Results:   {cfg.results_path}")
        print(f"Weights:   {best_path}")

        # Upload to GCS if configured
        if cfg.gcs_bucket:
            upload_to_gcs(best_path, cfg.gcs_bucket)
        else:
            print(f"\n[next] To use these weights in production:")
            print(f"  1. Upload {best_path} to GCS:")
            print(f"     gsutil cp {best_path} gs://YOUR_BUCKET/forensics/best.pth")
            print(f"  2. Set env var in GCP service:")
            print(f"     FORENSICS_MODEL_GCS=gs://YOUR_BUCKET/forensics/best.pth")


if __name__ == "__main__":
    main()
