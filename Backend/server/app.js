/**
 * app.js — MediaGuard Express Server
 *
 * Architecture:
 *   React UI → Express (Node, port 8000) → FastAPI (Python, port 8001)
 *
 * Express handles: routing, validation, Redis job queues, MongoDB logging, Socket.io
 * FastAPI handles: CLIP, FAISS, CrewAI agents, Gemini LLM
 */

import express from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import { isRedisAvailable } from "./config/redis.js";
import { initSocket } from "./config/socket.js";
import huntRouter from "./routes/hunt.js";
import errorHandler from "./middleware/errorHandler.js";
import ExpressError from "./utils/ExpressError.js";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

// Connect to MongoDB (non-blocking)
connectDB();

const app = express();
const httpServer = createServer(app); // Socket.io needs the raw HTTP server
const PORT = process.env.PORT || 8000;

// ─── Socket.io ───────────────────────────────────────────────────
// Must init before routes so getIO() works inside route handlers
initSocket(httpServer);

// ─── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
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
// Future: app.use("/api", adjudicateRouter);
// Future: app.use("/api", enforceRouter);
// Future: app.use("/api", brokerRouter);

// ─── 404 catch-all ───────────────────────────────────────────────
app.all("*", (req, res, next) => {
  next(new ExpressError(404, `Route ${req.method} ${req.path} not found`));
});

// ─── Global error handler (must be last) ─────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────
// Use httpServer.listen (not app.listen) so Socket.io works
httpServer.listen(PORT, () => {
  console.log(`\n🛡️  MediaGuard Server running on http://localhost:${PORT}`);
  console.log(`   POST /api/hunt  → Spider trigger`);
  console.log(`   WS   /          → Socket.io real-time feed`);
});

export default app;
