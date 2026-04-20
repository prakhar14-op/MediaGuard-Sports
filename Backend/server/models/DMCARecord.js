import mongoose from "mongoose";

const dmcaRecordSchema = new mongoose.Schema(
  {
    incident_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Incident", required: true },
    target_account: { type: String, required: true },
    platform:       { type: String, required: true },
    confidence_score: { type: String },
    notice_text:    { type: String },   // Full DMCA notice drafted by Enforcer
    status: {
      type: String,
      enum: ["drafted", "sent", "acknowledged", "rejected"],
      default: "drafted",
    },
    sent_at: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("DMCARecord", dmcaRecordSchema);
