import mongoose from "mongoose";

const contractRecordSchema = new mongoose.Schema(
  {
    incident_id:              { type: mongoose.Schema.Types.ObjectId, ref: "Incident", required: true },
    target_account:           { type: String, required: true },
    platform:                 { type: String, required: true },
    video_title:              { type: String },
    copyright_holder_share:   { type: Number, default: 30 },
    creator_share:            { type: Number, default: 70 },
    tx_hash:                  { type: String },
    network:                  { type: String, default: "Polygon (Mock)" },
    receipt:                  { type: String },
    integrity_hash:           { type: String },
    // Saved so data survives page refresh
    tier:                     { type: String, enum: ["Bronze", "Silver", "Gold", "Platinum"], default: "Bronze" },
    estimated_monthly_revenue:{ type: Number, default: 0 },
    status:                   { type: String, enum: ["minted", "active", "expired", "disputed"], default: "minted" },
  },
  { timestamps: true }
);

export default mongoose.model("ContractRecord", contractRecordSchema);
