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
  const { official_video_url } = req.body;
  const jobId = uuidv4();
  const io = getIO();

  const asset = await IngestedAsset.create({ official_video_url, status: "downloading" });

  res.json({ success: true, message: "Ingest job started.", assetId: asset._id, jobId });

  try {
    io.to(`ingest:${jobId}`).emit("ingest:progress", {
      jobId, stage: "downloading", message: "Downloading official video via yt-dlp...",
    });

    const { data: result } = await fastapiClient.post("/ingest", {
      official_video_url,
      job_id: jobId,
    });

    if (!result.success) throw new Error(result.message || "FastAPI ingest failed");

    io.to(`ingest:${jobId}`).emit("ingest:progress", {
      jobId, stage: "processing",
      message: `Extracted ${result.frame_count} frames. Storing vectors in FAISS vault...`,
    });

    const integrity_hash = generateHash({
      url: official_video_url,
      tx_hash: result.tx_hash,
      frame_count: result.frame_count,
    });

    await IngestedAsset.findByIdAndUpdate(asset._id, {
      title: result.title,
      local_path: result.local_path,
      frame_count: result.frame_count,
      vault_size: result.vault_size,
      tx_hash: result.tx_hash,
      integrity_hash,
      status: "complete",
    });

    io.to(`ingest:${jobId}`).emit("ingest:complete", {
      jobId,
      assetId: asset._id,
      title: result.title,
      frame_count: result.frame_count,
      vault_size: result.vault_size,
      tx_hash: result.tx_hash,
      integrity_hash,
    });

  } catch (err) {
    await IngestedAsset.findByIdAndUpdate(asset._id, {
      status: "failed",
      error_message: err.message,
    });
    io.to(`ingest:${jobId}`).emit("ingest:error", { jobId, message: err.message });
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
