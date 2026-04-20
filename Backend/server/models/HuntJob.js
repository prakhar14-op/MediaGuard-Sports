import mongoose from "mongoose";

const huntJobSchema = new mongoose.Schema(
  {
    jobId:              { type: String, required: true, unique: true },
    official_video_url: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "complete", "failed"],
      default: "queued",
    },
    // Official source extracted by Spider
    official_source: {
      country:     String,
      coordinates: { lat: Number, lng: Number },
    },
    // Summary counts
    threat_count:   { type: Number, default: 0 },
    piracy_count:   { type: Number, default: 0 },
    fair_use_count: { type: Number, default: 0 },

    error_message: { type: String },
    completed_at:  { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("HuntJob", huntJobSchema);
