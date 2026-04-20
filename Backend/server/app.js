import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import redis, { isRedisAvailable } from "./config/redis.js";
import huntRouter from "./routes/hunt.js";
import errorHandler from "./middleware/errorHandler.js";
import ExpressError from "./utils/ExpressError.js";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

// Connect to MongoDB (non-blocking — server starts even if DB is down)
connectDB();

const app = express();
const PORT = process.env.PORT || 8000;

// ─── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: "*" })); // tighten to your Vercel URL in production
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "MediaGuard API is Online and Listening.",
    redis: isRedisAvailable() ? "connected" : "unavailable",
  });
});

// ─── Routes ──────────────────────────────────────────────────────
app.use("/api", huntRouter);

// ─── 404 catch-all ───────────────────────────────────────────────
app.all("*", (req, res, next) => {
  next(new ExpressError(404, `Route ${req.method} ${req.path} not found`));
});

// ─── Global error handler (must be last) ─────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🛡️  MediaGuard Server running on http://localhost:${PORT}`);
  console.log(`   POST /api/hunt  → Spider trigger`);
});

export default app;
