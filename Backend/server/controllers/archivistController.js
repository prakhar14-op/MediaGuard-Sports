import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import IngestedAsset from "../models/IngestedAsset.js";
import { generateHash } from "../utils/blockchain.js";
import { getIO } from "../config/socket.js";
import ExpressError from "../utils/ExpressError.js";

const FASTAPI = process.env.FASTAPI_URL || "http://127.0.0.1:8001";

export const ingestAsset = async (req, res) => {
  const { official_video_url } = req.body;
  const jobId = uuidv4();
  const io = getIO();

  const asset = await IngestedAsset.create({
    official_video_url,
    status: "downloading",
  });

  res.json({
    success: true,
    message: "Ingest job started.",
    assetId: asset._id,
    jobId,
  });

  // Run the full pipeline async — client tracks progress via socket
  try {
    io.emit("ingest:progress", { jobId, stage: "downloading", message: "Downloading official video via yt-dlp..." });

    // FastAPI handles yt-dlp download + CLIP + FAISS
    const { data: fastapiResult } = await axios.post(`${FASTAPI}/ingest`, {
      official_video_url,
      job_id: jobId,
    });

    if (!fastapiResult.success) {
      throw new ExpressError(500, fastapiResult.message || "FastAPI ingest failed");
    }

    io.emit("ingest:progress", { jobId, stage: "processing", message: `Extracted ${fastapiResult.frame_count} frames. Storing vectors in FAISS vault...` });

    const integrity_hash = generateHash({
      url: official_video_url,
      tx_hash: fastapiResult.tx_hash,
      frame_count: fastapiResult.frame_count,
    });

    await IngestedAsset.findByIdAndUpdate(asset._id, {
      title:          fastapiResult.title,
      local_path:     fastapiResult.local_path,
      frame_count:    fastapiResult.frame_count,
      vault_size:     fastapiResult.vault_size,
      tx_hash:        fastapiResult.tx_hash,
      integrity_hash,
      status:         "complete",
    });

    io.emit("ingest:complete", {
      jobId,
      assetId:     asset._id,
      title:       fastapiResult.title,
      frame_count: fastapiResult.frame_count,
      vault_size:  fastapiResult.vault_size,
      tx_hash:     fastapiResult.tx_hash,
      integrity_hash,
    });

  } catch (err) {
    await IngestedAsset.findByIdAndUpdate(asset._id, {
      status: "failed",
      error_message: err.message,
    });

    io.emit("ingest:error", { jobId, message: err.message });
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
