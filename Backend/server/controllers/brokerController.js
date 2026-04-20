import axios from "axios";
import ContractRecord from "../models/ContractRecord.js";
import Incident from "../models/Incident.js";
import { getIO } from "../config/socket.js";
import { generateHash } from "../utils/blockchain.js";
import ExpressError from "../utils/ExpressError.js";

const FASTAPI = process.env.FASTAPI_URL || "http://127.0.0.1:8001";
const fastapiClient = axios.create({ baseURL: FASTAPI, timeout: 120_000 });

export const brokerIncident = async (req, res) => {
  const {
    incident_id, target_account, platform, video_title,
    video_url, justification, view_count, risk_score,
  } = req.body;

  const io = getIO();

  io.emit("broker:minting", { incident_id, message: "Broker calculating optimal rev-share..." });

  const { data } = await fastapiClient.post("/broker", {
    target_account,
    platform,
    video_title,
    video_url:    video_url    || "",
    justification: justification || "",
    view_count:   view_count   || 0,
    risk_score:   risk_score   || 30,
  });

  if (!data.success) throw new ExpressError(500, "Broker failed to deploy contract");

  const contract_data = data.contract_data || {};
  const integrity_hash = generateHash({
    tx_hash:        data.tx_hash,
    target_account,
    platform,
    holder_share:   data.copyright_holder_share,
    creator_share:  data.creator_share,
  });

  const contract = await ContractRecord.create({
    incident_id,
    target_account,
    platform,
    copyright_holder_share: data.copyright_holder_share,
    creator_share:          data.creator_share,
    tx_hash:                data.tx_hash,
    network:                data.network || "Polygon (Mock)",
    receipt:                JSON.stringify(contract_data),
    integrity_hash,
    status:                 "minted",
  });

  await Incident.findByIdAndUpdate(incident_id, {
    status:             "monetized",
    contract_record_id: contract._id,
  });

  io.emit("broker:contract_ready", {
    incident_id,
    contract_id:              contract._id,
    tier:                     data.tier,
    copyright_holder_share:   data.copyright_holder_share,
    creator_share:            data.creator_share,
    tx_hash:                  data.tx_hash,
    estimated_monthly_revenue: data.estimated_monthly_revenue,
    ip_holder_monthly_cut:    contract_data.ip_holder_monthly_cut_usd,
    contract_title:           contract_data.contract_title,
    duration_months:          contract_data.duration_months,
  });

  res.json({
    success:                  true,
    contract_id:              contract._id,
    tier:                     data.tier,
    copyright_holder_share:   data.copyright_holder_share,
    creator_share:            data.creator_share,
    tx_hash:                  data.tx_hash,
    integrity_hash,
    estimated_monthly_revenue: data.estimated_monthly_revenue,
    contract_data,
    status:                   "minted",
  });
};

// Human-in-the-loop: "Deploy Rev-Share Smart Contract" button in the dashboard
export const activateContract = async (req, res) => {
  const contract = await ContractRecord.findById(req.params.id);
  if (!contract) throw new ExpressError(404, "Contract not found");
  if (contract.status !== "minted") throw new ExpressError(400, `Cannot activate contract with status: ${contract.status}`);

  const io = getIO();

  await ContractRecord.findByIdAndUpdate(contract._id, { status: "active" });

  io.emit("broker:contract_activated", {
    contract_id:    contract._id,
    incident_id:    contract.incident_id,
    target_account: contract.target_account,
    platform:       contract.platform,
    tx_hash:        contract.tx_hash,
  });

  res.json({ success: true, message: "Contract activated. Creator notified.", contract_id: contract._id });
};

export const disputeContract = async (req, res) => {
  const contract = await ContractRecord.findById(req.params.id);
  if (!contract) throw new ExpressError(404, "Contract not found");

  await ContractRecord.findByIdAndUpdate(contract._id, { status: "disputed" });
  await Incident.findByIdAndUpdate(contract.incident_id, { status: "reviewing" });

  res.json({ success: true, message: "Contract disputed. Incident returned to review.", contract_id: contract._id });
};

export const batchBroker = async (req, res) => {
  const { incidents, jobId } = req.body;
  const io = getIO();

  if (!Array.isArray(incidents) || incidents.length === 0) {
    throw new ExpressError(400, "incidents must be a non-empty array");
  }

  const results = [];

  for (const inc of incidents) {
    try {
      const { data } = await fastapiClient.post("/broker", {
        target_account: inc.target_account,
        platform:       inc.platform,
        video_title:    inc.video_title    || "Unknown",
        video_url:      inc.video_url      || "",
        justification:  inc.justification  || "",
        view_count:     inc.view_count     || 0,
        risk_score:     inc.risk_score     || 30,
      });

      const integrity_hash = generateHash({
        tx_hash:       data.tx_hash,
        target_account: inc.target_account,
        platform:       inc.platform,
      });

      const contract = await ContractRecord.create({
        incident_id:            inc.incident_id,
        target_account:         inc.target_account,
        platform:               inc.platform,
        copyright_holder_share: data.copyright_holder_share,
        creator_share:          data.creator_share,
        tx_hash:                data.tx_hash,
        network:                "Polygon (Mock)",
        receipt:                JSON.stringify(data.contract_data || {}),
        integrity_hash,
        status:                 "minted",
      });

      await Incident.findByIdAndUpdate(inc.incident_id, {
        status:             "monetized",
        contract_record_id: contract._id,
      });

      io.to(`hunt:${jobId}`).emit("broker:contract_ready", {
        incident_id:  inc.incident_id,
        contract_id:  contract._id,
        tier:         data.tier,
        tx_hash:      data.tx_hash,
      });

      results.push({ incident_id: inc.incident_id, contract_id: contract._id, tier: data.tier, error: null });
    } catch (err) {
      results.push({ incident_id: inc.incident_id, contract_id: null, error: err.message });
    }
  }

  io.to(`hunt:${jobId}`).emit("broker:batch_complete", { jobId, total: results.length });

  res.json({ success: true, total: results.length, results });
};

export const getContracts = async (req, res) => {
  const { status, platform, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status)   filter.status   = status;
  if (platform) filter.platform = platform;

  const [contracts, total] = await Promise.all([
    ContractRecord.find(filter)
      .populate("incident_id", "title account_handle confidence_score")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    ContractRecord.countDocuments(filter),
  ]);

  res.json({ success: true, data: contracts, total, page: Number(page) });
};

export const getContractById = async (req, res) => {
  const contract = await ContractRecord.findById(req.params.id).populate("incident_id");
  if (!contract) throw new ExpressError(404, "Contract not found");
  res.json({ success: true, data: contract });
};
