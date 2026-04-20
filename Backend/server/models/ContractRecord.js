import mongoose from "mongoose";

const contractRecordSchema = new mongoose.Schema(
  {
    incident_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Incident", required: true },
    target_account: { type: String, required: true },
    platform:       { type: String, required: true },
    copyright_holder_share: { type: Number, default: 30 }, // %
    creator_share:          { type: Number, default: 70 }, // %
    tx_hash:   { type: String },   // Mock Polygon transaction hash
    network:   { type: String, default: "Polygon (Mock)" },
    receipt:   { type: String },   // Full contract receipt text from Broker
    status: {
      type: String,
      enum: ["minted", "active", "expired", "disputed"],
      default: "minted",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ContractRecord", contractRecordSchema);
