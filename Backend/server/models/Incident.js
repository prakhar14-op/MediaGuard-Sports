import mongoose from "mongoose";

const PLATFORMS = ["YouTube", "TikTok", "Twitter", "Instagram", "Telegram", "Reddit", "Other"];

const incidentSchema = new mongoose.Schema(
  {
    jobId:          { type: String, required: true, index: true },
    title:          { type: String, required: true },
    platform:       { type: String, enum: PLATFORMS },
    account_handle: { type: String },
    url:            { type: String },
    thumbnail_url:  { type: String },
    country:        { type: String },
    coordinates:    { lat: Number, lng: Number },
    confidence_score: { type: Number, min: 0, max: 100 },
    severity:       { type: String, enum: ["CRITICAL", "WARNING", "INFO"], default: "WARNING" },
    classification: {
      type: String,
      enum: ["SEVERE PIRACY", "FAIR USE / FAN CONTENT", "PENDING", "UNREVIEWED"],
      default: "UNREVIEWED",
    },
    adjudicator_justification: { type: String },
    status: {
      type: String,
      enum: ["detected", "reviewing", "takedown_pending", "takedown_sent", "monetized", "cleared"],
      default: "detected",
    },
    dmca_record_id:     { type: mongoose.Schema.Types.ObjectId, ref: "DMCARecord" },
    contract_record_id: { type: mongoose.Schema.Types.ObjectId, ref: "ContractRecord" },
  },
  { timestamps: true }
);

export default mongoose.model("Incident", incidentSchema);
