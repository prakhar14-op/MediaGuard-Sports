/**
 * Leak Source Detection Routes
 * Proxies /api/leak/* to FastAPI /leak/* endpoints.
 * These endpoints reconstruct the platform sharing chain for a suspect video.
 */
import { Router } from "express";
import axios       from "axios";
import wrapAsync   from "../utils/wrapAsync.js";
import ExpressError from "../utils/ExpressError.js";

const router      = Router();
const fastapiClient = axios.create({
  baseURL: process.env.FASTAPI_URL || "http://127.0.0.1:8001",
  timeout: 60_000,
});

// POST /api/leak/analyze — analyze a single suspect thumbnail for leak chain
router.post("/leak/analyze", wrapAsync(async (req, res) => {
  const { thumbnail_url, video_url, incident_id, account_handle, platform } = req.body;
  if (!thumbnail_url && !video_url) {
    throw new ExpressError(400, "thumbnail_url or video_url is required");
  }
  const { data } = await fastapiClient.post("/leak/analyze", {
    thumbnail_url:  thumbnail_url || "",
    video_url:      video_url     || "",
    incident_id:    incident_id   || "",
    account_handle: account_handle || "",
    platform:       platform       || "",
  });
  res.json(data);
}));

// POST /api/leak/batch — batch leak analysis for multiple suspects
router.post("/leak/batch", wrapAsync(async (req, res) => {
  const { threat_nodes } = req.body;
  if (!Array.isArray(threat_nodes) || threat_nodes.length === 0) {
    throw new ExpressError(400, "threat_nodes must be a non-empty array");
  }
  const { data } = await fastapiClient.post("/leak/batch", { threat_nodes });
  res.json(data);
}));

export default router;