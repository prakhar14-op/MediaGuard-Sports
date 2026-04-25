import mongoose from "mongoose";

const dmcaRecordSchema = new mongoose.Schema(
  {
    incident_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Incident", required: true },
    target_account:   { type: String, required: true },
    platform:         { type: String, required: true },
    confidence_score: { type: String },
    notice_text:      { type: String },
    integrity_hash:   { type: String },
    // Saved from FastAPI response so data survives page refresh
    tier:             { type: String, enum: ["standard", "expedited", "legal_referral"], default: "standard" },
    offence_number:   { type: Number, default: 1 },
    legal_contact:    { type: String },
    status:           { type: String, enum: ["drafted", "sent", "acknowledged", "rejected"], default: "drafted" },
    sent_at:          { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("DMCARecord", dmcaRecordSchema);
