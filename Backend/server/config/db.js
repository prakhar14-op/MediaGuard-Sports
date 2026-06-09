import mongoose from "mongoose";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// ESM imports are hoisted — load .env before process.env.MONGO_URI is read.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../../.env") });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mediaguard",
      { serverSelectionTimeoutMS: 5000 }
    );
    console.log(`✅ [MongoDB] Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ [MongoDB] Connection failed:", err.message);
    console.warn("⚠️  Running without persistence.");
  }
};

export default connectDB;
