/**
 * Live Stream Monitoring Routes
 * Proxies to FastAPI live_stream endpoints and emits Socket.IO events
 * when detections arrive.
 */
import { Router } from "express";
import axios       from "axios";
import wrapAsync   from "../utils/wrapAsync.js";
import { getIO }   from "../config/socket.js";
import ExpressError from "../utils/ExpressError.js";

const router      = Router();
const fastapiClient = axios.create({
  baseURL: process.env.FASTAPI_URL || "http://127.0.0.1:8001",
  timeout: 30_000,
});

// POST /api/stream/start — start monitoring a live stream
router.post("/stream/start", wrapAsync(async (req, res) => {
  const { stream_url, stream_id = "" } = req.body;
  if (!stream_url) throw new ExpressError(400, "stream_url is required");

  const io = getIO();
  const { data } = await fastapiClient.post("/stream/start", { stream_url, stream_id });

  // Poll for results and emit Socket.IO events every 10s
  // (FastAPI background threads can't emit directly to Node's Socket.IO)
  const sid = data.stream_id;
  const pollInterval = setInterval(async () => {
    try {
      const r = await fastapiClient.get(`/stream/${sid}/results`);
      const results = r.data?.results || [];
      const newDetections = results.filter(r => r.match_confirmed);
      if (newDetections.length > 0) {
        io.emit("stream:detection", {
          stream_id:  sid,
          stream_url,
          detections: newDetections,
          total_detections: r.data?.detections || 0,
        });
      }
    } catch {
      // Stream may have ended
      clearInterval(pollInterval);
    }
  }, 10_000);

  // Auto-stop polling after 4 hours
  setTimeout(() => clearInterval(pollInterval), 4 * 60 * 60 * 1000);

  res.json({ success: true, stream_id: sid, message: "Stream monitoring started" });
}));

// DELETE /api/stream/:stream_id — stop monitoring
router.delete("/stream/:stream_id", wrapAsync(async (req, res) => {
  await fastapiClient.delete(`/stream/${req.params.stream_id}`).catch(() => {});
  res.json({ success: true, message: "Stream monitoring stopped" });
}));

// GET /api/stream/:stream_id/results — get detection results
router.get("/stream/:stream_id/results", wrapAsync(async (req, res) => {
  const { data } = await fastapiClient.get(`/stream/${req.params.stream_id}/results`);
  res.json(data);
}));

// GET /api/stream/active — list active monitors
router.get("/stream/active", wrapAsync(async (req, res) => {
  const { data } = await fastapiClient.get("/stream/active");
  res.json(data);
}));

export default router;
