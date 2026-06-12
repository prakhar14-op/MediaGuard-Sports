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

// Track polling intervals per stream so we can clear them on stop
const _activePolls = {};

// POST /api/stream/start — start monitoring a live stream
router.post("/stream/start", wrapAsync(async (req, res) => {
  const { stream_url, stream_id = "" } = req.body;
  if (!stream_url) throw new ExpressError(400, "stream_url is required");

  const io = getIO();
  const { data } = await fastapiClient.post("/stream/start", { stream_url, stream_id });

  const sid = data.stream_id;
  let lastSegCount = 0;

  const pollInterval = setInterval(async () => {
    try {
      const r = await fastapiClient.get(`/stream/${sid}/results`);
      const results = r.data?.results || [];

      if (results.length > lastSegCount) {
        const newResults = results.slice(lastSegCount);
        lastSegCount = results.length;

        io.emit("stream:detection", {
          stream_id:        sid,
          stream_url,
          detections:       newResults,
          total_segments:   results.length,
          total_detections: results.filter(s => s.match_confirmed).length,
          latest_confidence: newResults[newResults.length - 1]?.confidence_score || 0,
        });
      }
    } catch {
      // Stream ended or error — stop polling
      clearInterval(pollInterval);
      delete _activePolls[sid];
    }
  }, 8_000);

  _activePolls[sid] = pollInterval;

  // Auto-stop after 4 hours
  setTimeout(() => {
    clearInterval(pollInterval);
    delete _activePolls[sid];
  }, 4 * 60 * 60 * 1000);

  res.json({ success: true, stream_id: sid, message: "Stream monitoring started" });
}));

// DELETE /api/stream/:stream_id — stop monitoring
router.delete("/stream/:stream_id", wrapAsync(async (req, res) => {
  const sid = req.params.stream_id;

  // Clear Node.js polling interval
  if (_activePolls[sid]) {
    clearInterval(_activePolls[sid]);
    delete _activePolls[sid];
    console.log(`[Stream] Polling stopped for ${sid}`);
  }

  // Stop FastAPI monitor
  await fastapiClient.delete(`/stream/${sid}`).catch(() => {});

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
