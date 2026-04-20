import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
  {
    // Hunt job this incident belongs to
    jobId: { type: String, required: true, index: true },

    // Threat details from Spider
    title:          { type: String, required: true },
    platform:       { type: String, enum: ["YouTube", "TikTok", "Twitter", "Instagram", "Telegram", "Reddit", "Other"] },
    account_handle: { type: String },
    url:            { type: String },
    thumbnail_url:  { type: String },
    country:        { type: String },
    coordinates:    { lat: Number, lng: Number },

    // Sentinel result
    confidence_score: { type: Number, min: 0, max: 100 }, // e.g. 99.8
    severity: {
      type: String,
      enum: ["CRITICAL", "WARNING", "INFO"],
      default: "WARNING",
    },

    // Adjudicator ruling
    classification: {
      type: String,
      enum: ["SEVERE PIRACY", "FAIR USE / FAN CONTENT", "PENDING", "UNREVIEWED"],
      default: "UNREVIEWED",
    },
    adjudicator_justification: { type: String },

    // Action taken
    status: {
      type: String,
      enum: ["detected", "reviewing", "takedown_pending", "takedown_sent", "monetized", "cleared"],
      default: "detected",
    },

    // Links to action records
    dmca_record_id:     { type: mongoose.Schema.Types.ObjectId, ref: "DMCARecord" },
    contract_record_id: { type: mongoose.Schema.Types.ObjectId, ref: "ContractRecord" },
  },
  { timestamps: true }
);

export default mongoose.model("Incident", incidentSchema);
