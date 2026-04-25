import express from "express";
import { createServer } from "http";
import cors from "cors";
import axios from "axios";
import mongoose from "mongoose";
import { config } from "dotenv";

// Load .env in development; in production env vars come from Render
config({ path: "../.env" });

import connectDB from "./config/db.js";
import redis, { isRedisAvailable } from "./config/redis.js";
import { initSocket } from "./config/socket.js";
import huntRouter from "./routes/hunt.js";
import ingestRouter from "./routes/ingest.js";
import scanRouter from "./routes/scan.js";
import adjudicateRouter from "./routes/adjudicate.js";
import enforceRouter from "./routes/enforce.js";
import brokerRouter from "./routes/broker.js";
import swarmRouter from "./routes/swarm.js";
import errorHandler from "./middleware/errorHandler.js";
import ExpressError from "./utils/ExpressError.js";

connectDB();
global.redisClient = redis;

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8000;

initSocket(httpServer);

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    status: "MediaGuard API is Online and Listening.",
    redis:  isRedisAvailable() ? "connected" : "unavailable",
  });
});

app.get("/api/health", async (_req, res) => {
  const fastapiOk = await axios.get(`${process.env.FASTAPI_URL || "http://127.0.0.1:8001"}/`)
    .then(() => true).catch(() => false);
  res.json({
    node:    "ok",
    redis:   isRedisAvailable() ? "ok" : "unavailable",
    fastapi: fastapiOk ? "ok" : "unavailable",
    mongo:   mongoose.connection.readyState === 1 ? "ok" : "unavailable",
  });
});

app.use("/api", huntRouter);
app.use("/api", ingestRouter);
app.use("/api", scanRouter);
app.use("/api", adjudicateRouter);
app.use("/api", enforceRouter);
app.use("/api", brokerRouter);
app.use("/api", swarmRouter);

app.all("*", (_req, _res, next) => {
  next(new ExpressError(404, "Route not found"));
});

app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`🛡️  MediaGuard running on http://localhost:${PORT}`);
});

export default app;
