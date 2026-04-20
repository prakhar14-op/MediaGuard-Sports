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
import ingestRouter from "./routes/ingest.js";
import scanRouter from "./routes/scan.js";
import errorHandler from "./middleware/errorHandler.js";
import ExpressError from "./utils/ExpressError.js";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

connectDB();

// Make Redis client globally accessible for velocity tracking in controllers
import redis from "./config/redis.js";
global.redisClient = redis;

const app = express();
const httpServer = createServer(app); // Socket.io requires the raw http.Server
const PORT = process.env.PORT || 8000;

initSocket(httpServer);

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    status: "MediaGuard API is Online and Listening.",
    redis: isRedisAvailable() ? "connected" : "unavailable",
  });
});

app.use("/api", huntRouter);
app.use("/api", ingestRouter);
app.use("/api", scanRouter);

app.all("*", (_req, _res, next) => {
  next(new ExpressError(404, "Route not found"));
});

app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`🛡️  MediaGuard running on http://localhost:${PORT}`);
});

export default app;
