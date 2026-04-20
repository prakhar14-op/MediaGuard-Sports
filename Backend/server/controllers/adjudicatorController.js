import axios from "axios";
import Incident from "../models/Incident.js";
import { getIO } from "../config/socket.js";
import redis, { safeRedis } from "../config/redis.js";
import ExpressError from "../utils/ExpressError.js";

const FASTAPI = process.env.FASTAPI_URL || "http://127.0.0.1:8001";
// Adjudicator calls Gemini — give it enough time
const fastapiClient = axios.create({ baseURL: FASTAPI, timeout: 120_000 });

const CACHE_TTL = 60 * 60 * 24; // 24 hours

function _cacheKey(account_handle, platform, video_title) {
  return `adjudicator:${platform}:${account_handle}:${video_title}`.toLowerCase().replace(/\s+/g, "_");
}

async function _getCached(key) {
  return safeRedis(async () => {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  }, null);
}

async function _setCache(key, verdict) {
  await safeRedis(async () => {
    await redis.setex(key, CACHE_TTL, JSON.stringify(verdict));
  });
}

export const adjudicateIncident = async (req, res) => {
  const {
    incident_id,
    sentinel_report,
    platform,
    account_handle,
    video_title,
    description,
    country,
    confidence_score,
  } = req.body;

  if (!incident_id)     throw new ExpressError(400, "incident_id is required");
  if (!sentinel_report) throw new ExpressError(400, "sentinel_report is required");
  if (!platform)        throw new ExpressError(400, "platform is required");
  if (!account_handle)  throw new ExpressError(400, "account_handle is required");
  if (!video_title)     throw new ExpressError(400, "video_title is required");

  const io = getIO();

  io.emit("adjudicator:thinking", { incident_id, message: "Adjudicator analysing context..." });

  // Check Redis cache first — same account+platform+title = same ruling
  const cacheKey    = _cacheKey(account_handle, platform, video_title);
  const cachedVerdict = await _getCached(cacheKey);

  let verdict;
  let fromCache = false;

  if (cachedVerdict) {
    verdict   = cachedVerdict;
    fromCache = true;
  } else {
    const { data } = await fastapiClient.post("/adjudicate", {
      sentinel_report,
      platform,
      account_handle,
      video_title,
      description:      description || "",
      country:          country     || "",
      confidence_score: confidence_score ?? 100,
    });

    if (!data.success) throw new ExpressError(500, "Adjudicator failed");
    verdict = data.verdict;
    await _setCache(cacheKey, verdict);
  }

  const newStatus = verdict.routing === "Enforcer" ? "takedown_pending" : "reviewing";

  await Incident.findByIdAndUpdate(incident_id, {
    classification:            verdict.classification,
    adjudicator_justification: verdict.justification,
    status:                    newStatus,
  });

  io.emit("adjudicator:verdict", {
    incident_id,
    verdict,
    from_cache: fromCache,
    next_agent: verdict.routing,
  });

  res.json({
    success:    true,
    incident_id,
    verdict,
    from_cache: fromCache,
    next_agent: verdict.routing,
  });
};

export const batchAdjudicate = async (req, res) => {
  const { incidents, jobId } = req.body;
  const io = getIO();

  if (!Array.isArray(incidents) || incidents.length === 0) {
    throw new ExpressError(400, "incidents must be a non-empty array");
  }

  io.to(`hunt:${jobId}`).emit("adjudicator:batch_started", {
    jobId, total: incidents.length,
  });

  // Split into cached and uncached
  const toProcess = [];
  const cached    = [];

  for (const inc of incidents) {
    const key    = _cacheKey(inc.account_handle, inc.platform, inc.video_title);
    const cached_verdict = await _getCached(key);
    if (cached_verdict) {
      cached.push({ incident_id: inc.incident_id, verdict: cached_verdict, from_cache: true });
    } else {
      toProcess.push(inc);
    }
  }

  let freshResults = [];
  if (toProcess.length > 0) {
    const { data } = await fastapiClient.post("/adjudicate/batch", { incidents: toProcess });
    freshResults = data.results;

    for (const r of freshResults) {
      if (r.verdict) {
        const key = _cacheKey(
          toProcess.find((i) => i.incident_id === r.incident_id)?.account_handle || "",
          toProcess.find((i) => i.incident_id === r.incident_id)?.platform || "",
          toProcess.find((i) => i.incident_id === r.incident_id)?.video_title || "",
        );
        await _setCache(key, r.verdict);
      }
    }
  }

  const allResults = [
    ...cached.map((c) => ({ incident_id: c.incident_id, verdict: c.verdict, error: null, from_cache: true })),
    ...freshResults.map((r) => ({ ...r, from_cache: false })),
  ];

  let enforcer_count = 0;
  let broker_count   = 0;

  for (const result of allResults) {
    if (!result.verdict) continue;

    const newStatus = result.verdict.routing === "Enforcer" ? "takedown_pending" : "reviewing";

    await Incident.findByIdAndUpdate(result.incident_id, {
      classification:            result.verdict.classification,
      adjudicator_justification: result.verdict.justification,
      status:                    newStatus,
    });

    if (result.verdict.routing === "Enforcer") enforcer_count++;
    else broker_count++;

    io.to(`hunt:${jobId}`).emit("adjudicator:verdict", {
      incident_id: result.incident_id,
      verdict:     result.verdict,
      from_cache:  result.from_cache,
      next_agent:  result.verdict.routing,
    });
  }

  io.to(`hunt:${jobId}`).emit("adjudicator:batch_complete", {
    jobId, total: allResults.length, enforcer_count, broker_count,
  });

  res.json({
    success:        true,
    total:          allResults.length,
    enforcer_count,
    broker_count,
    results:        allResults,
  });
};

export const getVerdict = async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) throw new ExpressError(404, "Incident not found");

  res.json({
    success:        true,
    classification: incident.classification,
    justification:  incident.adjudicator_justification,
    status:         incident.status,
  });
};
