import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import IngestedAsset from "../models/IngestedAsset.js";
import { generateHash } from "../utils/blockchain.js";
import { getIO } from "../config/socket.js";
import ExpressError from "../utils/ExpressError.js";

const FASTAPI = process.env.FASTAPI_URL || "http://127.0.0.1:8001";

// Ingest can take 10+ minutes for long videos — timeout set to 30 minutes
const fastapiClient = axios.create({
  baseURL: FASTAPI,
  timeout: 30 * 60 * 1000,
});

export const ingestAsset = async (req, res) => {
  const { official_video_url, video_title = "" } = req.body;
  const jobId = uuidv4();
  const io = getIO();

  const asset = await IngestedAsset.create({ official_video_url, status: "downloading" });

  // Respond immediately — ingest runs async on FastAPI side
  res.json({ success: true, message: "Ingest job started.", assetId: asset._id, jobId });

  try {
    io.emit("ingest:progress", {
      jobId, assetId: asset._id, stage: "downloading", message: "Downloading official video...",
    });

    // Kick off async ingest on FastAPI — returns immediately
    await fastapiClient.post("/ingest", { official_video_url, job_id: jobId, video_title });

    // Poll FastAPI for status every 10s (max 35 min)
    const MAX_POLLS = 210;  // 210 × 10s = 35 min
    let polls = 0;

    const poll = async () => {
      polls++;
      if (polls > MAX_POLLS) {
        await IngestedAsset.findByIdAndUpdate(asset._id, { status: "failed", error_message: "Ingest timed out" });
        io.emit("ingest:error", { jobId, assetId: asset._id, message: "Ingest timed out after 35 minutes" });
        return;
      }

      try {
        const { data: statusData } = await fastapiClient.get(`/ingest/status/${jobId}`);

        if (statusData.status === "downloading") {
          io.emit("ingest:progress", {
            jobId, assetId: asset._id, stage: "downloading",
            message: statusData.message || "Downloading video...",
          });
          setTimeout(poll, 8000);

        } else if (statusData.status === "processing") {
          io.emit("ingest:progress", {
            jobId, assetId: asset._id, stage: "processing",
            message: "Embedding frames into FAISS vault...",
          });
          setTimeout(poll, 8000);

        } else if (statusData.status === "complete") {
          const integrity_hash = generateHash({
            url: official_video_url,
            tx_hash: statusData.tx_hash,
            frame_count: statusData.frame_count,
          });

          await IngestedAsset.findByIdAndUpdate(asset._id, {
            title:         statusData.title,
            local_path:    statusData.local_path,
            frame_count:   statusData.frame_count,
            vault_size:    statusData.vault_size,
            tx_hash:       statusData.tx_hash,
            integrity_hash,
            status:        "complete",
          });

          io.emit("ingest:complete", {
            jobId, assetId: asset._id,
            title:       statusData.title,
            frame_count: statusData.frame_count,
            vault_size:  statusData.vault_size,
            tx_hash:     statusData.tx_hash,
            integrity_hash,
          });

        } else if (statusData.status === "failed") {
          await IngestedAsset.findByIdAndUpdate(asset._id, { status: "failed", error_message: statusData.message });
          io.emit("ingest:error", { jobId, assetId: asset._id, message: statusData.message });

        } else {
          setTimeout(poll, 8000);
        }
      } catch (err) {
        // If FastAPI returned 404, the job was lost (process restart) — fail fast
        if (err?.response?.status === 404) {
          await IngestedAsset.findByIdAndUpdate(asset._id, {
            status: "failed",
            error_message: "Ingest job lost — the server restarted during processing. Please try again.",
          });
          io.emit("ingest:error", {
            jobId, assetId: asset._id,
            message: "Ingest job lost due to server restart. Please re-submit the video.",
          });
          return;
        }
        setTimeout(poll, 8000);
      }
    };

    // Start polling after 5s — fast enough to catch quick downloads
    setTimeout(poll, 5000);

  } catch (err) {
    await IngestedAsset.findByIdAndUpdate(asset._id, { status: "failed", error_message: err.message });
    io.emit("ingest:error", { jobId, assetId: asset._id, message: err.message });
  }
};

export const getAssets = async (_req, res) => {
  const assets = await IngestedAsset.find().sort({ createdAt: -1 });
  res.json({ success: true, data: assets });
};

export const getAssetById = async (req, res) => {
  const asset = await IngestedAsset.findById(req.params.id);
  if (!asset) throw new ExpressError(404, "Asset not found");
  res.json({ success: true, data: asset });
};

export const deleteAsset = async (req, res) => {
  const asset = await IngestedAsset.findById(req.params.id);
  if (!asset) throw new ExpressError(404, "Asset not found");

  // Delete the downloaded video file from disk if it exists
  if (asset.local_path) {
    try {
      const fs = await import("fs/promises");
      await fs.unlink(asset.local_path);
    } catch {
      // File already gone — not an error
    }
  }

  await IngestedAsset.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: "Asset deleted from vault.", id: req.params.id });
};
