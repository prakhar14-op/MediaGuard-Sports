import axios from "axios";
import Incident from "../models/Incident.js";
import HuntJob from "../models/HuntJob.js";
import { getIO } from "../config/socket.js";
import { safeRedis } from "../config/redis.js";
import ExpressError from "../utils/ExpressError.js";

const FASTAPI = process.env.FASTAPI_URL || "http://127.0.0.1:8001";
const fastapiClient = axios.create({ baseURL: FASTAPI, timeout: 60_000 });

// Redis key for tracking how many times an account has been flagged across all hunts
const velocityKey = (handle) => `sentinel:velocity:${handle}`;

async function _incrementVelocity(account_handle) {
  const count = await safeRedis(async () => {
    const r = await global.redisClient?.incr(velocityKey(account_handle));
    await global.redisClient?.expire(velocityKey(account_handle), 60 * 60 * 24 * 7); // 7 days
    return r;
  }, 1);
  return count || 1;
}

function _escalateSeverity(baseSeverity, velocity) {
  if (velocity >= 3) return "CRITICAL";
  if (velocity >= 2 && baseSeverity === "WARNING") return "CRITICAL";
  return baseSeverity;
}

export const scanSuspect = async (req, res) => {
  const { thumbnail_url, account_handle, platform, title, url, country, coordinates, jobId } = req.body;
  const io = getIO();

  const { data: scanResult } = await fastapiClient.post("/scan", {
    thumbnail_url, account_handle, platform, title, url, country,
  });

  if (!scanResult.success) throw new ExpressError(500, "Sentinel scan failed");

  const velocity = await _incrementVelocity(account_handle || "unknown");
  const severity = _escalateSeverity(scanResult.severity, velocity);

  const incident = await Incident.create({
    jobId:            jobId || "manual",
    title:            title || "Unknown",
    platform,
    account_handle,
    url,
    thumbnail_url,
    country,
    coordinates,
    confidence_score: scanResult.confidence_score,
    severity,
    status:           "detected",
  });

  io.emit("sentinel:scan_result", {
    incidentId:      incident._id,
    jobId,
    title,
    platform,
    account_handle,
    confidence_score: scanResult.confidence_score,
    severity,
    match_confirmed:  scanResult.match_confirmed,
    phash_match:      scanResult.phash_match,
    top_matches:      scanResult.top_matches,
    velocity,
  });

  res.json({
    success:          true,
    incidentId:       incident._id,
    match_confirmed:  scanResult.match_confirmed,
    confidence_score: scanResult.confidence_score,
    severity,
    phash_match:      scanResult.phash_match,
    top_matches:      scanResult.top_matches,
    velocity,
  });
};

export const batchScan = async (req, res) => {
  const { threat_nodes, jobId } = req.body;
  const io = getIO();

  if (!Array.isArray(threat_nodes) || threat_nodes.length === 0) {
    throw new ExpressError(400, "threat_nodes must be a non-empty array");
  }

  // Update job status
  if (jobId) {
    await HuntJob.findOneAndUpdate({ jobId }, { status: "processing" });
  }

  io.to(`hunt:${jobId}`).emit("sentinel:batch_started", {
    jobId, total: threat_nodes.length,
  });

  const { data: batchResult } = await fastapiClient.post("/scan/batch", { threat_nodes });

  const incidents = [];
  let piracy_count = 0;
  let fair_use_count = 0;

  for (const { node, scan } of batchResult.results) {
    if (scan.error) continue;

    const velocity = await _incrementVelocity(node.account_handle || "unknown");
    const severity = _escalateSeverity(scan.severity, velocity);

    const incident = await Incident.create({
      jobId:            jobId || "batch",
      title:            node.title || "Unknown",
      platform:         node.platform || "Other",
      account_handle:   node.account_handle,
      url:              node.url,
      thumbnail_url:    node.thumbnail_url,
      country:          node.country,
      coordinates:      node.coordinates,
      confidence_score: scan.confidence_score,
      severity,
      status:           "detected",
    });

    incidents.push(incident);

    if (scan.match_confirmed) piracy_count++;

    // Emit each result live so the dashboard table updates in real-time
    io.to(`hunt:${jobId}`).emit("sentinel:threat_found", {
      incidentId:       incident._id,
      title:            node.title,
      platform:         node.platform,
      account_handle:   node.account_handle,
      confidence_score: scan.confidence_score,
      severity,
      match_confirmed:  scan.match_confirmed,
      coordinates:      node.coordinates,
      velocity,
    });
  }

  if (jobId) {
    await HuntJob.findOneAndUpdate({ jobId }, {
      threat_count:  incidents.length,
      piracy_count,
      fair_use_count,
    });
  }

  io.to(`hunt:${jobId}`).emit("sentinel:batch_complete", {
    jobId,
    total:         incidents.length,
    piracy_count,
  });

  res.json({
    success:       true,
    total:         incidents.length,
    piracy_count,
    incidents:     incidents.map((i) => i._id),
  });
};

export const getIncidents = async (req, res) => {
  const { jobId, severity, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (jobId)   filter.jobId    = jobId;
  if (severity) filter.severity = severity;
  if (status)   filter.status   = status;

  const incidents = await Incident.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Incident.countDocuments(filter);

  res.json({ success: true, data: incidents, total, page: Number(page) });
};

export const getIncidentById = async (req, res) => {
  const incident = await Incident.findById(req.params.id)
    .populate("dmca_record_id")
    .populate("contract_record_id");
  if (!incident) throw new ExpressError(404, "Incident not found");
  res.json({ success: true, data: incident });
};
