import mongoose from "mongoose";

const ingestedAssetSchema = new mongoose.Schema(
  {
    official_video_url: { type: String, required: true },
    title:              { type: String },
    local_path:         { type: String },
    frame_count:        { type: Number, default: 0 },
    vault_size:         { type: Number, default: 0 },
    tx_hash:            { type: String },
    integrity_hash:     { type: String },
    status: {
      type: String,
      enum: ["downloading", "processing", "complete", "failed"],
      default: "downloading",
    },
    error_message: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("IngestedAsset", ingestedAssetSchema);
