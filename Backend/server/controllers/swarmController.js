import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import HuntJob from "../models/HuntJob.js";
import Incident from "../models/Incident.js";
import DMCARecord from "../models/DMCARecord.js";
import ContractRecord from "../models/ContractRecord.js";
import { getIO } from "../config/socket.js";
import redis, { safeRedis } from "../config/redis.js";
import { generateHash } from "../utils/blockchain.js";

const FASTAPI = process.env.FASTAPI_URL || "http://127.0.0.1:8001";

const spider    = axios.create({ baseURL: FASTAPI, timeout: 5 * 60_000 });
const sentinel  = axios.create({ baseURL: FASTAPI, timeout: 90_000 });
const adjClient = axios.create({ baseURL: FASTAPI, timeout: 180_000 });
const enforcer  = axios.create({ baseURL: FASTAPI, timeout: 180_000 });
const broker    = axios.create({ baseURL: FASTAPI, timeout: 180_000 });

// Only adjudicate suspects above this confidence — avoids wasting Gemini quota on noise
const ADJ_CONFIDENCE_THRESHOLD = 55;

const velocityKey = (h) => `sentinel:velocity:${h}`;
const offenceKey  = (a, p) => `enforcer:offences:${p}:${a}`.toLowerCase();
const adjCacheKey = (a, p, t) => `adjudicator:${p}:${a}:${t}`.toLowerCase().replace(/\s+/g, "_");

async function incr(key, ttl) {
  return safeRedis(async () => {
    const n = await redis.incr(key);
    await redis.expire(key, ttl);
    return n;
  }, 1);
}

function escalateSeverity(base, velocity) {
  if (velocity >= 3) return "CRITICAL";
  if (velocity >= 2 && base === "WARNING") return "CRITICAL";
  return base;
}

// ─── SWARM ORCHESTRATOR ───────────────────────────────────────────────────────
export const runSwarm = async (req, res) => {
  const { official_video_url } = req.body;
  const jobId = uuidv4();
  const io    = getIO();

  const job = await HuntJob.create({ jobId, official_video_url, status: "queued" });
  // Respond immediately with jobId so frontend can join the socket room
  res.json({ success: true, jobId, huntJobId: job._id, message: "Swarm deployed." });

  try {
    // ── PHASE 1: SPIDER ──────────────────────────────────────────────────────
    await HuntJob.findOneAndUpdate({ jobId }, { status: "processing" });
    io.to(`hunt:${jobId}`).emit("swarm:phase", {
      jobId, phase: 1, agent: "Spider", message: "Crawling the web for suspects...",
    });

    let huntData;
    try {
      const r = await spider.post("/hunt", { official_video_url });
      huntData = r.data;
      if (!huntData.success) throw new Error("Spider returned failure");
    } catch (err) {
      throw new Error(`Spider failed: ${err.message}`);
    }

    const { official_source, threat_nodes = [], country_threat_counts = {} } = huntData.data;

    await HuntJob.findOneAndUpdate({ jobId }, {
      official_source: official_source
        ? { country: official_source.country, coordinates: official_source.coordinates }
        : undefined,
      threat_count: threat_nodes.length,
    });

    io.to(`hunt:${jobId}`).emit("spider:complete", {
      jobId, official_source, threat_nodes, country_threat_counts, total: threat_nodes.length,
    });

    if (threat_nodes.length === 0) {
      await HuntJob.findOneAndUpdate({ jobId }, { status: "complete", completed_at: new Date() });
      io.to(`hunt:${jobId}`).emit("swarm:complete", {
        jobId, total_suspects: 0, piracy_count: 0, fair_use_count: 0,
        dmca_drafted: 0, contracts_minted: 0, message: "No suspects found. Asset is clean.",
      });
      return;
    }

    // ── PHASE 2: SENTINEL ────────────────────────────────────────────────────
    io.to(`hunt:${jobId}`).emit("swarm:phase", {
      jobId, phase: 2, agent: "Sentinel", message: `Scanning ${threat_nodes.length} suspects...`,
    });

    let batchScanResults = [];
    try {
      const r = await sentinel.post("/scan/batch", { threat_nodes, jobId });
      if (r.data?.results) batchScanResults = r.data.results;
    } catch (err) {
      console.error("[Swarm] Sentinel batch failed:", err.message);
      // Continue with empty results — don't crash the whole swarm
    }

    const incidents = [];
    let piracy_count = 0, fair_use_count = 0;

    for (const { node, scan } of batchScanResults) {
      if (!scan || scan.error) continue;
      const velocity = await incr(velocityKey(node.account_handle || "unknown"), 60 * 60 * 24 * 7);
      const severity  = escalateSeverity(scan.severity || "INFO", velocity);

      const incident = await Incident.create({
        jobId,
        title:            node.title    || "Unknown",
        platform:         node.platform || "Other",
        account_handle:   node.account_handle || "unknown",
        url:              node.url || "",
        thumbnail_url:    node.thumbnail_url || "",
        country:          node.country || "",
        coordinates:      node.coordinates || { lat: 0, lng: 0 },
        confidence_score: scan.confidence_score || 0,
        severity,
        classification:   "UNREVIEWED",
        status:           "detected",
      });
      incidents.push({ incident, node, scan });

      io.to(`hunt:${jobId}`).emit("sentinel:threat_found", {
        incidentId:       incident._id,
        jobId,
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

    io.to(`hunt:${jobId}`).emit("sentinel:batch_complete", {
      jobId, total: incidents.length, piracy_count: 0, fair_use_count: 0,
    });

    // ── PHASE 3: ADJUDICATOR ─────────────────────────────────────────────────
    const adjudicatable = incidents.filter(({ scan }) => (scan.confidence_score || 0) >= ADJ_CONFIDENCE_THRESHOLD);
    const skipped       = incidents.filter(({ scan }) => (scan.confidence_score || 0) < ADJ_CONFIDENCE_THRESHOLD);

    // Auto-clear low-confidence suspects
    for (const { incident } of skipped) {
      await Incident.findByIdAndUpdate(incident._id, { status: "cleared" });
    }

    if (adjudicatable.length > 0) {
      io.to(`hunt:${jobId}`).emit("swarm:phase", {
        jobId, phase: 3, agent: "Adjudicator",
        message: `Adjudicating ${adjudicatable.length} suspects (${skipped.length} below threshold)...`,
      });

      io.to(`hunt:${jobId}`).emit("adjudicator:batch_started", {
        jobId, total: adjudicatable.length, skipped: skipped.length,
      });
    }

    const toEnforce = [];
    const toBroker  = [];

    for (const { incident, node, scan } of adjudicatable) {
      io.to(`hunt:${jobId}`).emit("adjudicator:thinking", {
        incident_id: incident._id,
        message: `Analysing @${node.account_handle} — "${node.title?.slice(0, 40)}"...`,
      });

      try {
        const cacheKey = adjCacheKey(node.account_handle, node.platform, node.title);
        let verdict;

        const cached = await safeRedis(async () => {
          const v = await redis.get(cacheKey);
          return v ? JSON.parse(v) : null;
        }, null);

        if (cached) {
          verdict = cached;
        } else {
          const sentinel_report = scan.match_confirmed
            ? `[CRITICAL ANOMALY DETECTED] Confidence: ${scan.confidence_score}% | L2: ${scan.l2_distance}`
            : `[SUSPECT] Confidence: ${scan.confidence_score}%`;

          const { data: adj } = await adjClient.post("/adjudicate", {
            sentinel_report,
            platform:         node.platform || "YouTube",
            account_handle:   node.account_handle || "Unknown",
            video_title:      node.title || "Unknown",
            description:      node.description || "",
            country:          node.country || "",
            confidence_score: scan.confidence_score || 50,
          });

          if (!adj.success || !adj.verdict) {
            await Incident.findByIdAndUpdate(incident._id, { status: "reviewing" });
            continue;
          }
          verdict = adj.verdict;

          await safeRedis(async () => {
            await redis.setex(cacheKey, 60 * 60 * 24, JSON.stringify(verdict));
          });
        }

        const newStatus = verdict.routing === "Enforcer" ? "takedown_pending" : "reviewing";
        await Incident.findByIdAndUpdate(incident._id, {
          classification:            verdict.classification,
          adjudicator_justification: verdict.justification,
          status:                    newStatus,
        });

        io.to(`hunt:${jobId}`).emit("adjudicator:verdict", {
          incident_id: incident._id,
          jobId,
          verdict,
          next_agent:  verdict.routing,
        });

        if (verdict.routing === "Enforcer") {
          piracy_count++;
          toEnforce.push({ incident, node, scan, verdict });
        } else {
          fair_use_count++;
          toBroker.push({ incident, node, scan, verdict });
        }
      } catch (err) {
        console.error(`[Swarm] Adjudicator failed for ${node.account_handle}:`, err.message);
        await Incident.findByIdAndUpdate(incident._id, { status: "reviewing" });
      }
    }

    await HuntJob.findOneAndUpdate({ jobId }, { piracy_count, fair_use_count });

    io.to(`hunt:${jobId}`).emit("adjudicator:batch_complete", {
      jobId, total: adjudicatable.length, enforcer_count: toEnforce.length, broker_count: toBroker.length,
    });

    // ── PHASE 4: ENFORCER ────────────────────────────────────────────────────
    if (toEnforce.length > 0) {
      io.to(`hunt:${jobId}`).emit("swarm:phase", {
        jobId, phase: 4, agent: "Enforcer", message: `Drafting ${toEnforce.length} DMCA notices...`,
      });

      for (const { incident, node, scan, verdict } of toEnforce) {
        try {
          const offence_number = await incr(offenceKey(node.account_handle, node.platform), 60 * 60 * 24 * 90);

          const { data: dmcaData } = await enforcer.post("/enforce", {
            target_account:   node.account_handle,
            platform:         node.platform || "YouTube",
            video_title:      node.title || "Unknown",
            video_url:        node.url || "",
            confidence_score: scan.confidence_score,
            classification:   verdict.classification,
            justification:    verdict.justification,
            integrity_hash:   "",
            offence_number,
          });

          const notice_hash = generateHash({
            notice_text:    dmcaData.notice_text,
            target_account: node.account_handle,
            platform:       node.platform,
          });

          const dmca = await DMCARecord.create({
            incident_id:      incident._id,
            target_account:   node.account_handle,
            platform:         node.platform,
            confidence_score: String(scan.confidence_score),
            notice_text:      dmcaData.notice_text,
            integrity_hash:   notice_hash,
            tier:             dmcaData.tier || "standard",
            offence_number,
            legal_contact:    dmcaData.legal_contact || "",
            status:           "drafted",
          });

          await Incident.findByIdAndUpdate(incident._id, {
            status:         "takedown_pending",
            dmca_record_id: dmca._id,
          });

          io.to(`hunt:${jobId}`).emit("enforcer:notice_ready", {
            incident_id:    incident._id,
            dmca_id:        dmca._id,
            jobId,
            tier:           dmcaData.tier,
            offence_number,
            legal_contact:  dmcaData.legal_contact,
            platform:       node.platform,
            notice_preview: (dmcaData.notice_text || "").slice(0, 300) + "...",
          });
        } catch (err) {
          console.error(`[Swarm] Enforcer failed for ${node.account_handle}:`, err.message);
        }
      }

      io.to(`hunt:${jobId}`).emit("enforcer:batch_complete", { jobId, total: toEnforce.length });
    }

    // ── PHASE 5: BROKER ──────────────────────────────────────────────────────
    if (toBroker.length > 0) {
      io.to(`hunt:${jobId}`).emit("swarm:phase", {
        jobId, phase: 5, agent: "Broker", message: `Minting ${toBroker.length} rev-share contracts...`,
      });

      for (const { incident, node, verdict } of toBroker) {
        try {
          const { data: contractData } = await broker.post("/broker", {
            target_account: node.account_handle,
            platform:       node.platform || "YouTube",
            video_title:    node.title || "Unknown",
            video_url:      node.url || "",
            justification:  verdict.justification || "Fair use content identified.",
            view_count:     node.view_count || 0,
            risk_score:     verdict.risk_score || 30,
          });

          const integrity_hash = generateHash({
            tx_hash:        contractData.tx_hash,
            target_account: node.account_handle,
            platform:       node.platform,
          });

          const contract = await ContractRecord.create({
            incident_id:              incident._id,
            target_account:           node.account_handle,
            platform:                 node.platform,
            video_title:              node.title || "",
            copyright_holder_share:   contractData.copyright_holder_share,
            creator_share:            contractData.creator_share,
            tx_hash:                  contractData.tx_hash,
            network:                  "Polygon (Mock)",
            receipt:                  JSON.stringify(contractData.contract_data || {}),
            integrity_hash,
            tier:                     contractData.tier || "Bronze",
            estimated_monthly_revenue: contractData.estimated_monthly_revenue || 0,
            status:                   "minted",
          });

          await Incident.findByIdAndUpdate(incident._id, {
            status:             "monetized",
            contract_record_id: contract._id,
          });

          io.to(`hunt:${jobId}`).emit("broker:contract_ready", {
            incident_id:              incident._id,
            contract_id:              contract._id,
            jobId,
            tier:                     contractData.tier,
            copyright_holder_share:   contractData.copyright_holder_share,
            creator_share:            contractData.creator_share,
            tx_hash:                  contractData.tx_hash,
            estimated_monthly_revenue: contractData.estimated_monthly_revenue,
          });
        } catch (err) {
          console.error(`[Swarm] Broker failed for ${node.account_handle}:`, err.message);
        }
      }

      io.to(`hunt:${jobId}`).emit("broker:batch_complete", { jobId, total: toBroker.length });
    }

    // ── COMPLETE ─────────────────────────────────────────────────────────────
    await HuntJob.findOneAndUpdate({ jobId }, { status: "complete", completed_at: new Date() });

    io.to(`hunt:${jobId}`).emit("swarm:complete", {
      jobId,
      total_suspects:   incidents.length,
      piracy_count,
      fair_use_count,
      dmca_drafted:     toEnforce.length,
      contracts_minted: toBroker.length,
      message:          "Swarm mission complete. Awaiting human approval.",
    });

  } catch (err) {
    console.error("[Swarm] Fatal error:", err.message);
    await HuntJob.findOneAndUpdate({ jobId }, { status: "failed", error_message: err.message });
    io.to(`hunt:${jobId}`).emit("swarm:error", { jobId, message: err.message });
  }
};
