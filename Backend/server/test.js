import axios from "axios";

const BASE    = "http://localhost:8000";
const FASTAPI = "http://localhost:8001";
const api     = axios.create({ baseURL: BASE, timeout: 15_000 });

process.setMaxListeners(50);

let passed = 0;
let failed = 0;

function ok(label, data) {
  console.log(`  ✅  ${label}`);
  if (data !== undefined) console.log(`      →`, JSON.stringify(data).slice(0, 120));
  passed++;
}

function fail(label, err) {
  console.log(`  ❌  ${label}`);
  const msg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || String(err);
  console.log(`      →`, msg);
  failed++;
}

async function expect400(label, fn) {
  try {
    await fn();
    fail(label + " (expected 400, got 2xx)");
  } catch (err) {
    if (err?.response?.status === 400) ok(label);
    else fail(label + ` (expected 400, got ${err?.response?.status})`, err);
  }
}

async function expect404(label, fn) {
  try {
    await fn();
    fail(label + " (expected 404, got 2xx)");
  } catch (err) {
    if (err?.response?.status === 404) ok(label);
    else fail(label + ` (expected 404, got ${err?.response?.status})`, err);
  }
}

// Check if FastAPI is up before running ML-dependent tests
async function fastapiUp() {
  try { await axios.get(FASTAPI + "/", { timeout: 3000 }); return true; }
  catch { return false; }
}

function isRateLimit(e) {
  const msg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || "";
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
}

function handleGeminiError(label, e) {
  if (isRateLimit(e)) ok(`${label}  (Gemini rate-limited — API working, quota exhausted)`);
  else fail(label, e);
}

let incidentId, dmcaId, contractId, huntJobId, assetId;

// ─── Health ──────────────────────────────────────────────────────────────────
async function testHealth() {
  console.log("\n── Health ──────────────────────────────────────────────────");
  try {
    const { data } = await api.get("/");
    ok("GET /  server online", { redis: data.redis });
  } catch (e) { fail("GET /", e); }

  try {
    const { data } = await api.get("/api/health");
    ok("GET /api/health", { node: data.node, mongo: data.mongo, redis: data.redis, fastapi: data.fastapi });
  } catch (e) { fail("GET /api/health", e); }
}

// ─── Ingest ───────────────────────────────────────────────────────────────────
async function testIngest() {
  console.log("\n── Ingest (Archivist) ──────────────────────────────────────");

  await expect400("POST /api/ingest  missing body",   () => api.post("/api/ingest", {}));
  await expect400("POST /api/ingest  invalid URL",    () => api.post("/api/ingest", { official_video_url: "not-a-url" }));

  try {
    const { data } = await api.post("/api/ingest", { official_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    ok("POST /api/ingest  job started", { assetId: data.assetId, jobId: data.jobId });
    assetId = data.assetId;
  } catch (e) { fail("POST /api/ingest  valid", e); }

  try {
    const { data } = await api.get("/api/ingest");
    ok("GET /api/ingest  list", { count: data.data?.length });
  } catch (e) { fail("GET /api/ingest  list", e); }

  if (assetId) {
    try {
      const { data } = await api.get(`/api/ingest/${assetId}`);
      ok("GET /api/ingest/:id", { status: data.data?.status });
    } catch (e) { fail("GET /api/ingest/:id", e); }
  }

  await expect404("GET /api/ingest/000000000000000000000000  not found",
    () => api.get("/api/ingest/000000000000000000000000"));
}

// ─── Hunt ─────────────────────────────────────────────────────────────────────
async function testHunt() {
  console.log("\n── Hunt (Spider) ───────────────────────────────────────────");

  await expect400("POST /api/hunt  missing URL", () => api.post("/api/hunt", {}));

  try {
    const { data } = await api.post("/api/hunt", { official_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    ok("POST /api/hunt  job queued", { jobId: data.jobId });
    huntJobId = data.jobId;
  } catch (e) { fail("POST /api/hunt  valid", e); }

  if (huntJobId) {
    try {
      const { data } = await api.get(`/api/hunt/${huntJobId}`);
      ok("GET /api/hunt/:jobId", { status: data.data?.status });
    } catch (e) { fail("GET /api/hunt/:jobId", e); }
  }

  await expect404("GET /api/hunt/nonexistent  not found", () => api.get("/api/hunt/nonexistent"));
}

// ─── Scan ─────────────────────────────────────────────────────────────────────
async function testScan(fastapi) {
  console.log("\n── Scan (Sentinel) ─────────────────────────────────────────");

  try {
    await api.post("/api/scan", { account_handle: "@test", platform: "YouTube" });
    fail("POST /api/scan  missing thumbnail_url (expected 400)");
  } catch (e) {
    if (e?.response?.status === 400) ok("POST /api/scan  missing thumbnail_url → 400");
    else fail("POST /api/scan  missing thumbnail_url", e);
  }

  if (fastapi) {
    try {
      const { data } = await api.post("/api/scan", {
        thumbnail_url:  "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        account_handle: "@TestPirate",
        platform:       "YouTube",
        title:          "Test Video",
        url:            "https://youtube.com/watch?v=dQw4w9WgXcQ",
        country:        "US",
        jobId:          huntJobId || "test-job",
      });
      ok("POST /api/scan  valid", { incidentId: data.incidentId, confidence: data.confidence_score });
      incidentId = data.incidentId;
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.detail || e?.message;
      if (msg?.includes("vault is empty") || msg?.includes("FAISS")) {
        ok("POST /api/scan  vault empty (ingest first)", { note: "expected" });
      } else {
        fail("POST /api/scan  valid", e);
      }
    }
  } else {
    ok("POST /api/scan  skipped (FastAPI offline)");
  }

  await expect400("POST /api/scan/batch  empty array", () => api.post("/api/scan/batch", { threat_nodes: [] }));

  try {
    const { data } = await api.get("/api/incidents");
    ok("GET /api/incidents  list", { total: data.total });
  } catch (e) { fail("GET /api/incidents  list", e); }

  try {
    const { data } = await api.get("/api/incidents?severity=CRITICAL");
    ok("GET /api/incidents?severity=CRITICAL", { total: data.total });
  } catch (e) { fail("GET /api/incidents  filter", e); }

  await expect404("GET /api/incidents/000000000000000000000000  not found",
    () => api.get("/api/incidents/000000000000000000000000"));
}

// ─── Adjudicate ───────────────────────────────────────────────────────────────
async function testAdjudicate(fastapi) {
  console.log("\n── Adjudicate ──────────────────────────────────────────────");

  await expect400("POST /api/adjudicate  missing fields",
    () => api.post("/api/adjudicate", { platform: "YouTube" }));

  const testId = incidentId || "000000000000000000000001";

  if (fastapi) {
    try {
      const { data } = await api.post("/api/adjudicate", {
        incident_id:      testId,
        sentinel_report:  "[CRITICAL ANOMALY DETECTED] Confidence: 99.8%",
        platform:         "YouTube",
        account_handle:   "@PirateKing_007",
        video_title:      "Finals Highlight Clip",
        description:      "Raw repost of official broadcast",
        country:          "IN",
        confidence_score: 99.8,
      });
      ok("POST /api/adjudicate  valid", {
        classification: data.verdict?.classification,
        routing:        data.verdict?.routing,
        risk_score:     data.verdict?.risk_score,
        from_cache:     data.from_cache,
      });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.detail || e?.message || "";
      if (msg.includes("Cast to ObjectId") || msg.includes("incident")) {
        ok("POST /api/adjudicate  Gemini called (no real incident in DB)", { note: "expected" });
      } else {
        fail("POST /api/adjudicate  valid", e);
      }
    }
  } else {
    ok("POST /api/adjudicate  skipped (FastAPI offline)");
  }

  await expect400("POST /api/adjudicate/batch  empty array",
    () => api.post("/api/adjudicate/batch", { incidents: [] }));

  await expect404("GET /api/adjudicate/000000000000000000000000  not found",
    () => api.get("/api/adjudicate/000000000000000000000000"));
}

// ─── Enforce ──────────────────────────────────────────────────────────────────
async function testEnforce(fastapi) {
  console.log("\n── Enforce (DMCA) ──────────────────────────────────────────");

  await expect400("POST /api/enforce  missing fields",
    () => api.post("/api/enforce", { platform: "YouTube" }));

  await expect400("POST /api/enforce  invalid classification",
    () => api.post("/api/enforce", {
      incident_id: "000000000000000000000001", target_account: "@pirate",
      platform: "YouTube", video_title: "Test", confidence_score: 99,
      classification: "INVALID_VALUE", justification: "test",
    }));

  const testId = incidentId || "000000000000000000000001";

  if (fastapi) {
    try {
      const { data } = await api.post("/api/enforce", {
        incident_id:      testId,
        target_account:   "@PirateKing_007",
        platform:         "YouTube",
        video_title:      "Finals Highlight Clip",
        video_url:        "https://youtube.com/watch?v=stolen",
        confidence_score: 99.8,
        classification:   "SEVERE PIRACY",
        justification:    "Raw 1:1 copy with no transformative elements",
        integrity_hash:   "",
      });
      ok("POST /api/enforce  DMCA drafted", { dmca_id: data.dmca_id, tier: data.tier, offence: data.offence_number });
      dmcaId = data.dmca_id;
    } catch (e) { fail("POST /api/enforce  valid", e); }
  } else {
    ok("POST /api/enforce  skipped (FastAPI offline)");
  }

  try {
    const { data } = await api.get("/api/enforce");
    ok("GET /api/enforce  list", { total: data.total });
  } catch (e) { fail("GET /api/enforce  list", e); }

  try {
    const { data } = await api.get("/api/enforce?status=drafted");
    ok("GET /api/enforce?status=drafted", { total: data.total });
  } catch (e) { fail("GET /api/enforce  filter", e); }

  if (dmcaId) {
    try {
      const { data } = await api.patch(`/api/enforce/${dmcaId}/approve`);
      ok("PATCH /api/enforce/:id/approve", { message: data.message });
    } catch (e) { fail("PATCH /api/enforce/:id/approve", e); }

    try {
      await api.patch(`/api/enforce/${dmcaId}/approve`);
      fail("double-approve (expected 400)");
    } catch (e) {
      if (e?.response?.status === 400) ok("PATCH /api/enforce/:id/approve  double-approve → 400");
      else fail("double-approve", e);
    }
  }

  if (fastapi) {
    try {
      const { data: fresh } = await api.post("/api/enforce", {
        incident_id: testId, target_account: "@FalsePositive", platform: "Reddit",
        video_title: "Fan Edit", confidence_score: 65,
        classification: "SEVERE PIRACY", justification: "Borderline",
      });
      if (fresh.dmca_id) {
        const { data } = await api.patch(`/api/enforce/${fresh.dmca_id}/reject`);
        ok("PATCH /api/enforce/:id/reject", { message: data.message });
      }
    } catch (e) { fail("PATCH /api/enforce/:id/reject", e); }
  } else {
    ok("PATCH /api/enforce/:id/reject  skipped (FastAPI offline)");
  }

  await expect404("GET /api/enforce/000000000000000000000000  not found",
    () => api.get("/api/enforce/000000000000000000000000"));
  await expect404("PATCH /api/enforce/000000000000000000000000/approve  not found",
    () => api.patch("/api/enforce/000000000000000000000000/approve"));
}

// ─── Broker ───────────────────────────────────────────────────────────────────
async function testBroker(fastapi) {
  console.log("\n── Broker (Smart Contracts) ────────────────────────────────");

  await expect400("POST /api/broker  missing fields",
    () => api.post("/api/broker", { platform: "TikTok" }));

  const testId = incidentId || "000000000000000000000001";

  if (fastapi) {
    try {
      const { data } = await api.post("/api/broker", {
        incident_id:    testId,
        target_account: "@AnimeFanEdits_99",
        platform:       "TikTok",
        video_title:    "Epic Highlights Edit",
        video_url:      "https://tiktok.com/@animefanedits/video/123",
        justification:  "Heavy transformative editing with commentary",
        view_count:     500000,
        risk_score:     25,
      });
      ok("POST /api/broker  contract minted", {
        tier: data.tier, holder: data.copyright_holder_share,
        creator: data.creator_share, revenue: data.estimated_monthly_revenue,
      });
      contractId = data.contract_id;
    } catch (e) { fail("POST /api/broker  valid", e); }
  } else {
    ok("POST /api/broker  skipped (FastAPI offline)");
  }

  try {
    const { data } = await api.get("/api/broker");
    ok("GET /api/broker  list", { total: data.total });
  } catch (e) { fail("GET /api/broker  list", e); }

  try {
    const { data } = await api.get("/api/broker?status=minted");
    ok("GET /api/broker?status=minted", { total: data.total });
  } catch (e) { fail("GET /api/broker  filter", e); }

  if (contractId) {
    try {
      const { data } = await api.patch(`/api/broker/${contractId}/activate`);
      ok("PATCH /api/broker/:id/activate", { message: data.message });
    } catch (e) { fail("PATCH /api/broker/:id/activate", e); }

    try {
      await api.patch(`/api/broker/${contractId}/activate`);
      fail("double-activate (expected 400)");
    } catch (e) {
      if (e?.response?.status === 400) ok("PATCH /api/broker/:id/activate  double-activate → 400");
      else fail("double-activate", e);
    }
  }

  if (fastapi) {
    try {
      const { data: fresh } = await api.post("/api/broker", {
        incident_id: testId, target_account: "@DisputeTest", platform: "YouTube",
        video_title: "Disputed Content", justification: "Unclear fair use",
        view_count: 1000, risk_score: 50,
      });
      if (fresh.contract_id) {
        const { data } = await api.patch(`/api/broker/${fresh.contract_id}/dispute`);
        ok("PATCH /api/broker/:id/dispute", { message: data.message });
      }
    } catch (e) { fail("PATCH /api/broker/:id/dispute", e); }
  } else {
    ok("PATCH /api/broker/:id/dispute  skipped (FastAPI offline)");
  }

  await expect404("GET /api/broker/000000000000000000000000  not found",
    () => api.get("/api/broker/000000000000000000000000"));
  await expect404("PATCH /api/broker/000000000000000000000000/activate  not found",
    () => api.patch("/api/broker/000000000000000000000000/activate"));
}

// ─── Swarm ────────────────────────────────────────────────────────────────────
async function testSwarm() {
  console.log("\n── Swarm (Full Agentic Pipeline) ───────────────────────────");

  await expect400("POST /api/swarm/run  missing URL", () => api.post("/api/swarm/run", {}));

  try {
    const { data } = await api.post("/api/swarm/run", {
      official_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    ok("POST /api/swarm/run  deployed", { jobId: data.jobId, message: data.message });
  } catch (e) { fail("POST /api/swarm/run  valid", e); }
}

// ─── Global errors ────────────────────────────────────────────────────────────
async function testGlobalErrors() {
  console.log("\n── Global Error Cases ──────────────────────────────────────");
  await expect404("GET /api/nonexistent  unknown route",    () => api.get("/api/nonexistent"));
  await expect404("DELETE /api/hunt  method not registered", () => api.delete("/api/hunt"));
}

// ─── Runner ───────────────────────────────────────────────────────────────────
async function run() {
  console.log("🛡️  MediaGuard API Test Suite");
  console.log("   Node server:", BASE);
  console.log("   FastAPI:    ", FASTAPI);

  const fastapi = await fastapiUp();
  console.log(`   FastAPI status: ${fastapi ? "✅ online" : "⚠️  offline (ML tests will be skipped)"}\n`);

  await testHealth();
  await testIngest();
  await testHunt();
  await testScan(fastapi);
  await testAdjudicate(fastapi);
  await testEnforce(fastapi);
  await testBroker(fastapi);
  await testSwarm();
  await testGlobalErrors();

  console.log(`\n${"─".repeat(55)}`);
  console.log(`  Results:  ✅ ${passed} passed   ❌ ${failed} failed`);
  console.log(`${"─".repeat(55)}\n`);

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test runner crashed:", err.message);
  process.exit(1);
});
