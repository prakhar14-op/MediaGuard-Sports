import axios from "axios";
import DMCARecord from "../models/DMCARecord.js";
import Incident from "../models/Incident.js";
import { getIO } from "../config/socket.js";
import redis, { safeRedis } from "../config/redis.js";
import { generateHash } from "../utils/blockchain.js";
import ExpressError from "../utils/ExpressError.js";

const FASTAPI = process.env.FASTAPI_URL || "http://127.0.0.1:8001";
const fastapiClient = axios.create({ baseURL: FASTAPI, timeout: 120_000 });

const offenceKey = (account, platform) => `enforcer:offences:${platform}:${account}`.toLowerCase();

async function _incrementOffences(account, platform) {
  return await safeRedis(async () => {
    const count = await redis.incr(offenceKey(account, platform));
    await redis.expire(offenceKey(account, platform), 60 * 60 * 24 * 90);
    return count;
  }, 1);
}

export const enforceIncident = async (req, res) => {
  const {
    incident_id, target_account, platform, video_title,
    video_url, confidence_score, classification, justification, integrity_hash,
  } = req.body;

  const io = getIO();

  io.emit("enforcer:drafting", { incident_id, message: "Enforcer drafting DMCA notice..." });

  const offence_number = await _incrementOffences(target_account, platform);

  const { data } = await fastapiClient.post("/enforce", {
    target_account,
    platform,
    video_title,
    video_url:        video_url || "",
    confidence_score,
    classification,
    justification,
    integrity_hash:   integrity_hash || "",
    offence_number,
  });

  if (!data.success) throw new ExpressError(500, "Enforcer failed to draft notice");

  const notice_hash = generateHash({ notice_text: data.notice_text, target_account, platform });

  const dmca = await DMCARecord.create({
    incident_id,
    target_account,
    platform,
    confidence_score: String(confidence_score),
    notice_text:      data.notice_text,
    integrity_hash:   notice_hash,
    tier:             data.tier || "standard",
    offence_number,
    legal_contact:    data.legal_contact || "",
    status:           "drafted",
  });

  await Incident.findByIdAndUpdate(incident_id, {
    status:        "takedown_pending",
    dmca_record_id: dmca._id,
  });

  io.emit("enforcer:notice_ready", {
    incident_id,
    dmca_id:        dmca._id,
    tier:           data.tier,
    offence_number,
    legal_contact:  data.legal_contact,
    platform,
    target_account,
    notice_preview: data.notice_text.slice(0, 300) + "...",
  });

  res.json({
    success:        true,
    dmca_id:        dmca._id,
    tier:           data.tier,
    offence_number,
    legal_contact:  data.legal_contact,
    notice_text:    data.notice_text,
    integrity_hash: notice_hash,
    status:         "drafted",
  });
};

// Human-in-the-loop: the "Approve & Send DMCA" button in the dashboard
export const approveDMCA = async (req, res) => {
  const dmca = await DMCARecord.findById(req.params.id);
  if (!dmca) throw new ExpressError(404, "DMCA record not found");
  if (dmca.status !== "drafted") throw new ExpressError(400, `Cannot approve a notice with status: ${dmca.status}`);

  const io = getIO();

  await DMCARecord.findByIdAndUpdate(dmca._id, { status: "sent", sent_at: new Date() });
  await Incident.findByIdAndUpdate(dmca.incident_id, { status: "takedown_sent" });

  io.emit("enforcer:dmca_sent", {
    dmca_id:        dmca._id,
    incident_id:    dmca.incident_id,
    target_account: dmca.target_account,
    platform:       dmca.platform,
    legal_contact:  dmca.notice_text?.match(/To:\s*(.+)/)?.[1]?.trim() || "platform legal",
  });

  res.json({ success: true, message: "DMCA notice approved and sent.", dmca_id: dmca._id });
};

export const rejectDMCA = async (req, res) => {
  const dmca = await DMCARecord.findById(req.params.id);
  if (!dmca) throw new ExpressError(404, "DMCA record not found");

  await DMCARecord.findByIdAndUpdate(dmca._id, { status: "rejected" });
  await Incident.findByIdAndUpdate(dmca.incident_id, { status: "cleared" });

  // Decrement offence count since this was a false positive
  await safeRedis(async () => {
    const key = offenceKey(dmca.target_account, dmca.platform);
    const current = await redis.get(key);
    if (current && parseInt(current) > 0) await redis.decr(key);
  });

  res.json({ success: true, message: "DMCA notice rejected. Incident cleared.", dmca_id: dmca._id });
};

export const batchEnforce = async (req, res) => {
  const { incidents, jobId } = req.body;
  const io = getIO();

  if (!Array.isArray(incidents) || incidents.length === 0) {
    throw new ExpressError(400, "incidents must be a non-empty array");
  }

  const results = [];

  for (const inc of incidents) {
    try {
      const offence_number = await _incrementOffences(inc.target_account, inc.platform);

      const { data } = await fastapiClient.post("/enforce", {
        target_account:   inc.target_account,
        platform:         inc.platform,
        video_title:      inc.video_title || "Unknown",
        video_url:        inc.video_url   || "",
        confidence_score: inc.confidence_score,
        classification:   inc.classification,
        justification:    inc.justification || "",
        integrity_hash:   inc.integrity_hash || "",
        offence_number,
      });

      const notice_hash = generateHash({ notice_text: data.notice_text, target_account: inc.target_account });

      const dmca = await DMCARecord.create({
        incident_id:      inc.incident_id,
        target_account:   inc.target_account,
        platform:         inc.platform,
        confidence_score: String(inc.confidence_score),
        notice_text:      data.notice_text,
        integrity_hash:   notice_hash,
        status:           "drafted",
      });

      await Incident.findByIdAndUpdate(inc.incident_id, {
        status:         "takedown_pending",
        dmca_record_id: dmca._id,
      });

      io.to(`hunt:${jobId}`).emit("enforcer:notice_ready", {
        incident_id:    inc.incident_id,
        dmca_id:        dmca._id,
        tier:           data.tier,
        offence_number,
      });

      results.push({ incident_id: inc.incident_id, dmca_id: dmca._id, tier: data.tier, error: null });
    } catch (err) {
      results.push({ incident_id: inc.incident_id, dmca_id: null, error: err.message });
    }
  }

  io.to(`hunt:${jobId}`).emit("enforcer:batch_complete", { jobId, total: results.length });

  res.json({ success: true, total: results.length, results });
};

export const getDMCARecords = async (req, res) => {
  const { status, platform, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status)   filter.status   = status;
  if (platform) filter.platform = platform;

  const [records, total] = await Promise.all([
    DMCARecord.find(filter)
      .populate("incident_id", "title account_handle confidence_score")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    DMCARecord.countDocuments(filter),
  ]);

  res.json({ success: true, data: records, total, page: Number(page) });
};

export const getDMCAById = async (req, res) => {
  const dmca = await DMCARecord.findById(req.params.id).populate("incident_id");
  if (!dmca) throw new ExpressError(404, "DMCA record not found");
  res.json({ success: true, data: dmca });
};
