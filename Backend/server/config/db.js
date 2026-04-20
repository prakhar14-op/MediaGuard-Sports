/**
 * db.js — MongoDB connection for MediaGuard
 *
 * Stores:
 *  - Incident logs    (every threat the Spider finds)
 *  - Agent decisions  (Adjudicator rulings: PIRACY / FAIR USE)
 *  - DMCA records     (Enforcer notices — what was sent, when, to whom)
 *  - Smart contracts  (Broker receipts — tx hash, rev split, platform)
 *  - Hunt jobs        (job status: pending → processing → complete)
 *
 * These feed the Dashboard's Live Incident Feed and make it real instead of hardcoded.
 */

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mediaguard",
      {
        serverSelectionTimeoutMS: 5000, // fail fast during dev
      }
    );
    console.log(`✅ [MongoDB] Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ [MongoDB] Connection failed:", err.message);
    // Don't crash the server — run in degraded mode (no persistence)
    console.warn("⚠️ [MongoDB] Running without persistence. Logs will not be saved.");
  }
};

export default connectDB;
