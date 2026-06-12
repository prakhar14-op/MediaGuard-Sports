import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    platform:         { type: String, required: true },
    handle:           { type: String, required: true },
    // Unique index to prevent duplicates
    platform_handle:  {
      type: String,
      required: true,
      unique: true,
    },
    // Offense tracking
    total_incidents:  { type: Number, default: 0 },
    total_piracy:     { type: Number, default: 0 },
    total_fair_use:   { type: Number, default: 0 },
    dmca_notices:     { type: Number, default: 0 },
    // Risk score
    risk_score:       { type: Number, default: 10 }, // 0-100
    // First/last seen
    first_detected:   { type: Date },
    last_detected:    { type: Date },
    // Notes
    notes:            { type: String },
  },
  { timestamps: true }
);

// Pre-save hook to set platform_handle
accountSchema.pre("save", function(next) {
  this.platform_handle = `${this.platform}:${this.handle}`.toLowerCase();
  next();
});

// Indexes for fast queries
accountSchema.index({ platform: 1, handle: 1 });
accountSchema.index({ risk_score: -1 });

export default mongoose.model("Account", accountSchema);
