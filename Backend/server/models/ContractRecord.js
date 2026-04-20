import mongoose from "mongoose";

const contractRecordSchema = new mongoose.Schema(
  {
    incident_id:             { type: mongoose.Schema.Types.ObjectId, ref: "Incident", required: true },
    target_account:          { type: String, required: true },
    platform:                { type: String, required: true },
    copyright_holder_share:  { type: Number, default: 30 },
    creator_share:           { type: Number, default: 70 },
    tx_hash:                 { type: String }, // Mock Polygon tx hash from blockchain.js
    network:                 { type: String, default: "Polygon (Mock)" },
    receipt:                 { type: String },
    integrity_hash:          { type: String }, // SHA-256 of the contract for audit trail
    status:                  { type: String, enum: ["minted", "active", "expired", "disputed"], default: "minted" },
  },
  { timestamps: true }
);

export default mongoose.model("ContractRecord", contractRecordSchema);
