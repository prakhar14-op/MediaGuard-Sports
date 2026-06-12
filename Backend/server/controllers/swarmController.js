import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import HuntJob from "../models/HuntJob.js";
import Incident from "../models/Incident.js";
import DMCARecord from "../models/DMCARecord.js";
import ContractRecord from "../models/ContractRecord.js";
import IngestedAsset from "../models/IngestedAsset.js";
import Account from "../models/Account.js";
import { getIO } from "../config/socket.js";
import redis, { safeRedis } from "../config/redis.js";
import { generateHash } from "../utils/blockchain.js";

const FASTAPI = process.env.FASTAPI_URL || "http://127.0.0.1:8001";

const spider    = axios.create({ baseURL: FASTAPI, timeout: 5 * 60_000 });
const sentinel  = axios.create({ baseURL: FASTAPI, timeout: 5 * 60_000 });
const adjClient = axios.create({ baseURL: FASTAPI, timeout: 180_000 });
const enforcer  = axios.create({ baseURL: FASTAPI, timeout: 180_000 });
const broker    = axios.create({ baseURL: FASTAPI, timeout: 180_000 });

// ─── Thresholds ────────────────────────────────────────────────────────────────
// ADJ_CONFIDENCE_THRESHOLD: only adjudicate suspects at or above this score.
// Lowered from 55 → 40 so we don't miss real threats with degraded thumbnails.
// Below threshold → auto-cleared as "CLEAN" without wasting LLM quota.
const ADJ_CONFIDENCE_THRESHOLD = 40;

// PIRACY_CONFIRM_THRESHOLD: match_confirmed OR above this score → likely piracy
const PIRACY_CONFIRM_THRESHOLD = 70;

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

/**
 * Build a rich Sentinel report for the Adjudicator.
 * The LLM needs ALL detection layers to make an accurate classification.
 * Previously only CLIP confidence was passed — audio, temporal, forensics were missing.
 */
function buildSentinelReport(scan, node) {
  const lines = [];

  // Primary classification
  if (scan.match_confirmed) {
    lines.push(`[CRITICAL ANOMALY DETECTED] MediaGuard Sentinel has confirmed this as a piracy match.`);
  } else if ((scan.confidence_score || 0) >= PIRACY_CONFIRM_THRESHOLD) {
    lines.push(`[HIGH CONFIDENCE SUSPECT] Strong signals of copyright infringement detected.`);
  } else {
    lines.push(`[MODERATE SUSPECT] Partial match signals detected. Requires adjudication.`);
  }

  lines.push(`Fused Confidence Score: ${scan.confidence_score}%`);

  // Layer 1: CLIP
  lines.push(`CLIP Visual Similarity: ${scan.clip_confidence}% (cosine=${scan.clip_similarity})`);
  if (scan.top_matches?.[0]) {
    const m = scan.top_matches[0];
    lines.push(`  → Best match: vault frame at ${m.timestamp_sec}s, FAISS index ${m.vault_index}`);
  }

  // Layer 2: pHash
  if (scan.phash_match) {
    lines.push(`pHash (pixel fingerprint): MATCH — hash distance confirms identical frames`);
  } else {
    lines.push(`pHash: no direct pixel match (may be re-encoded or cropped)`);
  }

  // Layer 3: Temporal
  if (scan.temporal_score > 0.5) {
    lines.push(`Temporal DNA: ${(scan.temporal_score * 100).toFixed(1)}% sequence match — content follows original video timeline`);
  } else {
    lines.push(`Temporal DNA: ${(scan.temporal_score * 100).toFixed(1)}% — no strong sequence match`);
  }

  // Layer 4: Audio
  if (!scan.audio_skipped) {
    if (scan.audio_match) {
      lines.push(`Audio Fingerprint: MATCH — ${scan.audio_confidence}% confidence (fp=${scan.audio_fp_score}, mel=${scan.audio_mel_score})`);
      lines.push(`  → Audio match is the strongest piracy signal — very hard to fake`);
    } else {
      lines.push(`Audio Fingerprint: no match (${scan.audio_confidence}% confidence)`);
    }
  } else {
    lines.push(`Audio Fingerprint: skipped (batch mode)`);
  }

  // Layer 5: Text/OCR
  if (scan.text_score > 0) {
    const textScorePct = (scan.text_score * 100).toFixed(1);
    const hasSubtitles = scan.text_result?.has_subtitles ? "YES" : "NO";
    const hasWatermark = scan.text_result?.has_watermark ? "YES" : "NO";
    lines.push(`Text/OCR Analysis: ${textScorePct}% (subtitles=${hasSubtitles}, watermark=${hasWatermark})`);
    if (scan.text_result?.detected_text?.length > 0) {
      lines.push(`  → Detected text sample: "${scan.text_result.detected_text.slice(0, 3).join('", "')}"`);
    }
  } else {
    lines.push(`Text/OCR Analysis: not performed`);
  }

  // Layer 6: Forensics chain
  if (scan.forensics_chain?.length > 0) {
    const chain = scan.forensics_chain.join(" → ");
    lines.push(`Forensic Leak Chain: ${chain} (first leak: ${scan.forensics_first_platform}, risk: ${scan.forensics_leak_risk})`);
    lines.push(`  → Chain reconstruction confidence: ${(scan.forensics_confidence * 100).toFixed(0)}% [${scan.forensics_method}]`);
  }

  // Suspect metadata
  lines.push(`Platform: ${node.platform}`);
  lines.push(`Account: ${node.account_handle}`);
  lines.push(`View Count: ${(node.view_count || 0).toLocaleString()}`);
  if (node.description) {
    lines.push(`Description snippet: "${node.description.slice(0, 200)}"`);
  }

  return lines.join("\n");
}

// ─── SWARM ORCHESTRATOR ───────────────────────────────────────────────────────
export const runSwarm = async (req, res) => {
  const { official_video_url, official_title: providedTitle = "" } = req.body;
  const jobId = uuidv4();
  const io    = getIO();

  const job = await HuntJob.create({ jobId, official_video_url, status: "queued" });
  res.json({ success: true, jobId, huntJobId: job._id, message: "Swarm deployed." });

  try {
    // ── PHASE 1: SPIDER ──────────────────────────────────────────────────────
    await HuntJob.findOneAndUpdate({ jobId }, { status: "processing" });
    io.to(`hunt:${jobId}`).emit("swarm:phase", {
      jobId, phase: 1, agent: "Spider", message: "Crawling the web for suspects…",
    });

    let huntData;
    try {
      const ingestedAsset = await IngestedAsset.findOne({ official_video_url }).sort({ createdAt: -1 });
      const official_title = providedTitle || ingestedAsset?.title || "";

      const r = await spider.post("/hunt", { official_video_url, official_title });
      huntData = r.data;
      if (!huntData.success) throw new Error("Spider returned failure");
    } catch (err) {
      throw new Error(`Spider failed: ${err.message}`);
    }

    const { official_source, threat_nodes = [], country_threat_counts = {} } = huntData.data;
    const platforms_searched = huntData.data?.platforms_searched || [];

    await HuntJob.findOneAndUpdate({ jobId }, {
      official_source: official_source
        ? { country: official_source.country, coordinates: official_source.coordinates }
        : undefined,
      threat_count: threat_nodes.length,
    });

    io.to(`hunt:${jobId}`).emit("spider:complete", {
      jobId,
      official_source,
      threat_nodes,
      country_threat_counts,
      total:              threat_nodes.length,
      platforms_searched,
      queries_used:       huntData.data?.search_queries_used || [],
    });

    if (threat_nodes.length === 0) {
      await HuntJob.findOneAndUpdate({ jobId }, { status: "complete", completed_at: new Date() });
      io.to(`hunt:${jobId}`).emit("swarm:complete", {
        jobId, total_suspects: 0, piracy_count: 0, fair_use_count: 0,
        dmca_drafted: 0, contracts_minted: 0,
        message: "No suspects found across all platforms. Asset appears clean.",
      });
      return;
    }

    // ── PHASE 2: SENTINEL ────────────────────────────────────────────────────
    io.to(`hunt:${jobId}`).emit("swarm:phase", {
      jobId, phase: 2, agent: "Sentinel",
      message: `Scanning ${threat_nodes.length} suspects across ${platforms_searched.length} platforms…`,
    });

    let batchScanResults = [];
    try {
      // Only scan nodes that have a thumbnail — others can't be CLIP-scanned
      const sentinelNodes = threat_nodes
        .map(({ search_query, ...node }) => node)
        .filter(n => n.thumbnail_url);   // skip nodes with no thumbnail
      const skippedNoThumb = threat_nodes.length - sentinelNodes.length;

      if (skippedNoThumb > 0) {
        console.log(`[Swarm] Skipping ${skippedNoThumb} nodes with no thumbnail (Telegram/Reddit)`);
      }

      const r = await sentinel.post("/scan/batch", { threat_nodes: sentinelNodes, jobId });
      if (r.data?.results) batchScanResults = r.data.results;
    } catch (err) {
      console.error("[Swarm] Sentinel batch failed:", err.message);
    }

    // ── PHASE 2b: FULL VIDEO SCAN for high-confidence batch results ──────────
    // After batch scan, re-scan confirmed suspects using full video pipeline.
    // This downloads the actual video, extracts scene frames, runs all 5 layers.
    // Only run for suspects above SUSPECT_THRESHOLD to avoid downloading junk.
    const confirmedForFullScan = batchScanResults.filter(
      ({ scan }) => (scan?.confidence_score || 0) >= 55 && !scan?.error && scan?.suspect_video_url
    );

    if (confirmedForFullScan.length > 0) {
      io.to(`hunt:${jobId}`).emit("swarm:phase", {
        jobId, phase: "2b", agent: "Sentinel",
        message: `Running full video scan on ${confirmedForFullScan.length} high-confidence suspects…`,
      });
      console.log(`[Swarm] Full video scan: ${confirmedForFullScan.length} suspects`);

      // Run full scans sequentially to avoid OOM (each downloads a video)
      for (const item of confirmedForFullScan) {
        const { node } = item;
        if (!node.url) continue;
        try {
          const fullR = await axios.post(`${FASTAPI}/scan/full`, {
            url:           node.url,
            thumbnail_url: node.thumbnail_url || "",
            platform:      node.platform || "",
            account_handle: node.account_handle || "",
          }, { timeout: 180_000 });  // 3 min timeout

          if (fullR.data?.success) {
            // Replace batch result with full scan result for this node
            const idx = batchScanResults.findIndex(r => r.node?.url === node.url);
            if (idx !== -1) {
              batchScanResults[idx].scan = fullR.data;
              console.log(`[Swarm] Full scan upgraded ${node.platform}:${node.account_handle} → ${fullR.data.confidence_score}% (${fullR.data.frames_scanned} frames)`);
            }
          }
        } catch (err) {
          console.log(`[Swarm] Full scan failed for ${node.url?.slice(0,50)}: ${err.message}`);
          // Keep batch result — don't fail the swarm
        }
      }
    }

    const incidents = [];
    let detected_count = 0;

    for (const { node, scan } of batchScanResults) {
      // Skip scan errors entirely — don't create incidents for failed scans
      if (!scan || scan.error) {
        console.log(`[Swarm] Skipping scan error for ${node.account_handle}: ${scan?.error}`);
        continue;
      }

      const velocity = await incr(velocityKey(node.account_handle || "unknown"), 60 * 60 * 24 * 7);
      const severity  = escalateSeverity(scan.severity || "INFO", velocity);

      detected_count++;

      // ── Account tracking ───────────────────────────────────────────────────
      let account;
      try {
        const platform = node.platform || "Other";
        const handle = node.account_handle || "unknown";
        const platform_handle = `${platform}:${handle}`.toLowerCase();
        
        // Find or create account
        account = await Account.findOneAndUpdate(
          { platform_handle },
          {
            $setOnInsert: {
              platform,
              handle,
              platform_handle,
              first_detected: new Date(),
            },
            $set: {
              last_detected: new Date(),
            },
            $inc: { total_incidents: 1 },
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.log(`[Swarm] Account tracking failed: ${err.message}`);
        account = null;
      }

      // ── Check for reupload ─────────────────────────────────────────────────
      let isReupload = false;
      if (node.url) {
        const existingIncident = await Incident.findOne({
          url: node.url,
          jobId: { $ne: jobId },
        });
        isReupload = !!existingIncident;
      }

      // ── Check for repeat offender ──────────────────────────────────────────
      const isRepeatOffender = account ? account.total_piracy > 0 : false;
      const uploaderRiskScore = account ? account.risk_score : 10;

      const incident = await Incident.create({
        jobId,
        title:            node.title    || "Unknown",
        platform:         node.platform || "Other",
        account_handle:   node.account_handle || "unknown",
        account_id:       account?._id,
        url:              node.url || "",
        thumbnail_url:    node.thumbnail_url || "",
        country:          node.country || "",
        coordinates:      node.coordinates || { lat: 0, lng: 0 },
        confidence_score: scan.confidence_score || 0,
        severity,
        classification:   "UNREVIEWED",
        status:           "detected",
        is_reupload:      isReupload,
        is_repeat_offender: isRepeatOffender,
        uploader_risk_score: uploaderRiskScore,
      });
      incidents.push({ incident, node, scan, account });

      // ── Evidence vault: package ALL detection artifacts ───────────────────
      try {
        await axios.post(`${FASTAPI}/evidence/${incident._id}/package_detection`, {
          scan_result:   scan,
          thumbnail_url: node.thumbnail_url || "",
          audio_result:  scan.audio_match ? {
            audio_confidence:   scan.audio_confidence,
            fp_score:           scan.audio_fp_score,
            embedding_score:    scan.audio_mel_score,
            best_video_id:      scan.audio_best_video,
            best_timestamp_sec: scan.audio_best_ts,
          } : null,
          forensics: scan.forensics_chain !== undefined ? {
            chain:          scan.forensics_chain,
            chain_length:   scan.forensics_chain_length,
            confidence:     scan.forensics_confidence,
            first_platform: scan.forensics_first_platform,
            leak_risk:      scan.forensics_leak_risk,
            method:         scan.forensics_method,
            jpeg_quality:   scan.forensics_jpeg_quality,
          } : null,
          text_result: scan.text_result ? scan.text_result : null,
        }).catch(() => {});
      } catch { /* non-blocking */ }

      // ── Leak chain analysis — fire-and-forget ────────────────────────────
      if (node.thumbnail_url && (scan.confidence_score || 0) >= ADJ_CONFIDENCE_THRESHOLD) {
        axios.post(`${FASTAPI}/leak/analyze`, {
          thumbnail_url:  node.thumbnail_url,
          video_url:      node.url || "",
          incident_id:    String(incident._id),
          account_handle: node.account_handle || "",
          platform:       node.platform || "",
        }).then(leakRes => {
          if (leakRes.data?.success) {
            const leak = leakRes.data;
            io.to(`hunt:${jobId}`).emit("leak:chain_detected", {
              incident_id:             String(incident._id),
              jobId,
              first_leak_platform:     leak.first_leak_platform,
              leak_chain:              leak.leak_chain,
              leak_risk:               leak.leak_risk,
              confidence:              leak.confidence,
              leak_summary:            leak.leak_summary,
              first_platform_guidance: leak.first_platform_guidance,
            });
          }
        }).catch(() => {});
      }

      // ── Emit full detection event to frontend ─────────────────────────────
      io.to(`hunt:${jobId}`).emit("sentinel:threat_found", {
        incidentId:       incident._id,
        jobId,
        title:            node.title,
        platform:         node.platform,
        account_handle:   node.account_handle,
        url:              node.url,
        thumbnail_url:    node.thumbnail_url,
        confidence_score: scan.confidence_score,
        severity,
        match_confirmed:  scan.match_confirmed,
        coordinates:      node.coordinates,
        velocity,
        view_count:       node.view_count || 0,
        // Suspect identification fields
        is_reupload:      isReupload,
        is_repeat_offender: isRepeatOffender,
        uploader_risk_score: uploaderRiskScore,
        // All detection layers
        clip_confidence:          scan.clip_confidence,
        clip_similarity:          scan.clip_similarity,
        audio_match:              scan.audio_match,
        audio_confidence:         scan.audio_confidence,
        audio_skipped:            scan.audio_skipped,
        temporal_score:           scan.temporal_score,
        phash_match:              scan.phash_match,
        phash_score:              scan.phash_score,
        text_score:               scan.text_score,
        text_result:              scan.text_result,
        // Forensics chain
        forensics_chain:          scan.forensics_chain,
        forensics_chain_length:   scan.forensics_chain_length,
        forensics_first_platform: scan.forensics_first_platform,
        forensics_leak_risk:      scan.forensics_leak_risk,
        forensics_confidence:     scan.forensics_confidence,
        forensics_method:         scan.forensics_method,
      });
    }

    // Classify before adjudication for accurate batch_complete numbers
    const adjudicatable = incidents.filter(({ scan }) => (scan.confidence_score || 0) >= ADJ_CONFIDENCE_THRESHOLD);
    const autoCleared   = incidents.filter(({ scan }) => (scan.confidence_score || 0) < ADJ_CONFIDENCE_THRESHOLD);

    io.to(`hunt:${jobId}`).emit("sentinel:batch_complete", {
      jobId,
      total:              incidents.length,
      adjudicatable:      adjudicatable.length,
      auto_cleared:       autoCleared.length,
      match_confirmed:    incidents.filter(({ scan }) => scan.match_confirmed).length,
    });

    // ── PHASE 3: ADJUDICATOR ─────────────────────────────────────────────────
    // Auto-clear below threshold
    for (const { incident } of autoCleared) {
      await Incident.findByIdAndUpdate(incident._id, {
        status:         "cleared",
        classification: "CLEAN",
        adjudicator_justification: `Auto-cleared: confidence score ${incident.confidence_score}% below threshold (${ADJ_CONFIDENCE_THRESHOLD}%)`,
      });
    }

    // Always emit adjudicator phase event (even if nothing to adjudicate)
    io.to(`hunt:${jobId}`).emit("swarm:phase", {
      jobId, phase: 3, agent: "Adjudicator",
      message: adjudicatable.length > 0
        ? `Adjudicating ${adjudicatable.length} suspects (${autoCleared.length} auto-cleared below ${ADJ_CONFIDENCE_THRESHOLD}%)…`
        : `No suspects above threshold. ${autoCleared.length} auto-cleared as clean.`,
    });

    io.to(`hunt:${jobId}`).emit("adjudicator:batch_started", {
      jobId,
      total:   adjudicatable.length,
      skipped: autoCleared.length,
    });

    const toEnforce = [];
    const toBroker  = [];
    let piracy_count = 0, fair_use_count = 0;

    for (const { incident, node, scan, account } of adjudicatable) {
      io.to(`hunt:${jobId}`).emit("adjudicator:thinking", {
        incident_id: incident._id,
        message: `Analysing @${node.account_handle} [${node.platform}] — "${node.title?.slice(0, 40)}"…`,
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
          console.log(`[Swarm] Using cached verdict for ${node.account_handle}`);
        } else {
          // Build rich sentinel report with ALL detection layers
          const sentinel_report = buildSentinelReport(scan, node);

          const { data: adj } = await adjClient.post("/adjudicate", {
            sentinel_report,
            platform:         node.platform || "YouTube",
            account_handle:   node.account_handle || "Unknown",
            video_title:      node.title || "Unknown",
            description:      node.description || "",
            country:          node.country || "",
            confidence_score: scan.confidence_score || 0,
            text_ocr:         scan.text_result || null,
          });

          if (!adj.success || !adj.verdict) {
            console.error(`[Swarm] Adjudicator returned no verdict for ${node.account_handle}`);
            await Incident.findByIdAndUpdate(incident._id, { status: "reviewing" });
            continue;
          }
          verdict = adj.verdict;

          // Cache for 24h — same account/title combo won't re-adjudicate
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

        // ── Update account stats ─────────────────────────────────────────────────
        if (account) {
          let update = {};
          if (verdict.classification === "SEVERE PIRACY") {
            update.$inc = { total_piracy: 1 };
            // Increase risk score by 20, max 100
            update.$set = { risk_score: Math.min(100, account.risk_score + 20) };
          } else if (verdict.classification === "FAIR USE / FAN CONTENT") {
            update.$inc = { total_fair_use: 1 };
            // Slightly decrease risk score (good behavior), min 0
            update.$set = { risk_score: Math.max(0, account.risk_score - 5) };
          }
          if (Object.keys(update).length > 0) {
            await Account.findByIdAndUpdate(account._id, update);
          }
        }

        io.to(`hunt:${jobId}`).emit("adjudicator:verdict", {
          incident_id:      incident._id,
          jobId,
          verdict,
          next_agent:       verdict.routing,
          risk_score:       verdict.risk_score,
          legal_basis:      verdict.legal_basis,
          recommended_action: verdict.recommended_action,
        });

        if (verdict.routing === "Enforcer") {
          piracy_count++;
          toEnforce.push({ incident, node, scan, verdict, account });
        } else {
          fair_use_count++;
          toBroker.push({ incident, node, scan, verdict, account });
        }
      } catch (err) {
        console.error(`[Swarm] Adjudicator failed for ${node.account_handle}:`, err.message);
        await Incident.findByIdAndUpdate(incident._id, { status: "reviewing" });
      }
    }

    await HuntJob.findOneAndUpdate({ jobId }, { piracy_count, fair_use_count });

    io.to(`hunt:${jobId}`).emit("adjudicator:batch_complete", {
      jobId,
      total:          adjudicatable.length,
      enforcer_count: toEnforce.length,
      broker_count:   toBroker.length,
      piracy_count,
      fair_use_count,
      auto_cleared:   autoCleared.length,
    });

    // ── PHASE 4: ENFORCER ────────────────────────────────────────────────────
    if (toEnforce.length > 0) {
      io.to(`hunt:${jobId}`).emit("swarm:phase", {
        jobId, phase: 4, agent: "Enforcer",
        message: `Drafting ${toEnforce.length} DMCA notices…`,
      });

      for (const { incident, node, scan, verdict } of toEnforce) {
        try {
          const offence_number = await incr(
            offenceKey(node.account_handle, node.platform),
            60 * 60 * 24 * 90,   // 90-day TTL for repeat-offence tracking
          );

          // Build FAISS integrity hash from actual scan evidence
          const faissProof = scan.top_matches?.[0]
            ? generateHash({
                vault_index:     scan.top_matches[0].vault_index,
                similarity:      scan.top_matches[0].similarity,
                source_video:    scan.top_matches[0].source_video,
                timestamp_sec:   scan.top_matches[0].timestamp_sec,
                clip_confidence: scan.clip_confidence,
                audio_match:     scan.audio_match,
                phash_match:     scan.phash_match,
              })
            : generateHash({
                account:    node.account_handle,
                platform:   node.platform,
                confidence: scan.confidence_score,
              });

          const { data: dmcaData } = await enforcer.post("/enforce", {
            target_account:   node.account_handle,
            platform:         node.platform || "YouTube",
            video_title:      node.title || "Unknown",
            video_url:        node.url || "",
            confidence_score: scan.confidence_score,
            classification:   verdict.classification,
            justification:    verdict.justification,
            integrity_hash:   faissProof,
            offence_number,
          });

          // Hash the notice itself for tamper-proof storage
          const notice_hash = generateHash({
            notice_text:    dmcaData.notice_text,
            target_account: node.account_handle,
            platform:       node.platform,
            integrity_hash: faissProof,
          });

          const dmca = await DMCARecord.create({
            incident_id:      incident._id,
            target_account:   node.account_handle,
            platform:         node.platform,
            confidence_score: String(scan.confidence_score),
            notice_text:      dmcaData.notice_text,
            integrity_hash:   notice_hash,
            faiss_proof:      faissProof,
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
            faiss_proof:    faissProof.slice(0, 16) + "…",
            notice_preview: (dmcaData.notice_text || "").slice(0, 400) + "…",
          });
        } catch (err) {
          console.error(`[Swarm] Enforcer failed for ${node.account_handle}:`, err.message);
        }
      }

      io.to(`hunt:${jobId}`).emit("enforcer:batch_complete", {
        jobId, total: toEnforce.length,
      });
    }

    // ── PHASE 5: BROKER ──────────────────────────────────────────────────────
    if (toBroker.length > 0) {
      io.to(`hunt:${jobId}`).emit("swarm:phase", {
        jobId, phase: 5, agent: "Broker",
        message: `Minting ${toBroker.length} rev-share contracts for fair-use content…`,
      });

      for (const { incident, node, verdict } of toBroker) {
        try {
          const { data: contractData } = await broker.post("/broker", {
            target_account: node.account_handle,
            platform:       node.platform || "YouTube",
            video_title:    node.title || "Unknown",
            video_url:      node.url || "",
            justification:  verdict.justification || "Fair use content identified by MediaGuard.",
            view_count:     node.view_count || 0,
            risk_score:     verdict.risk_score || 30,
          });

          const integrity_hash = generateHash({
            tx_hash:        contractData.tx_hash,
            target_account: node.account_handle,
            platform:       node.platform,
            timestamp:      Date.now(),
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
            platform:                 node.platform,
          });
        } catch (err) {
          console.error(`[Swarm] Broker failed for ${node.account_handle}:`, err.message);
        }
      }

      io.to(`hunt:${jobId}`).emit("broker:batch_complete", {
        jobId, total: toBroker.length,
      });
    }

    // ── COMPLETE ─────────────────────────────────────────────────────────────
    await HuntJob.findOneAndUpdate({ jobId }, {
      status:        "complete",
      completed_at:  new Date(),
      piracy_count,
      fair_use_count,
    });

    io.to(`hunt:${jobId}`).emit("swarm:complete", {
      jobId,
      total_suspects:   incidents.length,
      piracy_count,
      fair_use_count,
      auto_cleared:     autoCleared.length,
      dmca_drafted:     toEnforce.length,
      contracts_minted: toBroker.length,
      platforms_searched,
      message: `Swarm mission complete. ${piracy_count} piracy cases, ${fair_use_count} fair-use contracts, ${autoCleared.length} cleared. Awaiting human approval.`,
    });

  } catch (err) {
    console.error("[Swarm] Fatal error:", err.message, err.stack);
    await HuntJob.findOneAndUpdate({ jobId }, { status: "failed", error_message: err.message });
    io.to(`hunt:${jobId}`).emit("swarm:error", { jobId, message: err.message });
  }
};
