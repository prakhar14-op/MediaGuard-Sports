/**
 * Watchdog — Continuous Monitoring Routes
 * Receives alerts from FastAPI watchdog and broadcasts via Socket.IO.
 * Also proxies watchdog API calls to FastAPI.
 */
import { Router } from "express";
import axios from "axios";
import wrapAsync from "../utils/wrapAsync.js";
import { getIO } from "../config/socket.js";

const router = Router();
const fastapiClient = axios.create({
  baseURL: process.env.FASTAPI_URL || "http://127.0.0.1:8001",
  timeout: 30_000,
});

// POST /api/watchdog/alert — called by FastAPI watchdog when piracy found
router.post("/watchdog/alert", wrapAsync(async (req, res) => {
  const { asset_title, alerts, total_found, platforms } = req.body;
  const io = getIO();

  // Broadcast to all connected clients
  io.emit("watchdog:alert", {
    asset_title,
    alerts,
    total_found,
    platforms,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Watchdog] Alert: ${alerts?.length || 0} new detections for "${asset_title}"`);
  res.json({ success: true, broadcasted: alerts?.length || 0 });
}));

// GET /api/watchdog/status — get watchdog status
router.get("/watchdog/status", wrapAsync(async (req, res) => {
  const { data } = await fastapiClient.get("/watchdog/status");
  res.json(data);
}));

// POST /api/watchdog/trigger — trigger immediate scan
router.post("/watchdog/trigger", wrapAsync(async (req, res) => {
  const { asset_title, asset_url } = req.body || {};
  const { data } = await fastapiClient.post(
    `/watchdog/trigger?asset_title=${encodeURIComponent(asset_title || "")}&asset_url=${encodeURIComponent(asset_url || "")}`,
  );
  res.json(data);
}));

// GET /api/watchdog/history — get scan history
router.get("/watchdog/history", wrapAsync(async (req, res) => {
  const limit = req.query.limit || 50;
  const { data } = await fastapiClient.get(`/watchdog/history?limit=${limit}`);
  res.json(data);
}));

// POST /api/watchdog/stop — stop watchdog
router.post("/watchdog/stop", wrapAsync(async (req, res) => {
  const { data } = await fastapiClient.post("/watchdog/stop");
  res.json(data);
}));

// POST /api/watchdog/start — start watchdog
router.post("/watchdog/start", wrapAsync(async (req, res) => {
  const { data } = await fastapiClient.post("/watchdog/start");
  res.json(data);
}));

export default router;
