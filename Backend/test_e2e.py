"""
MediaGuard End-to-End Test Suite
=================================
Tests every agent and endpoint using: https://youtu.be/afiNbSxg7aw

Flow:
  1.  Health check         — all services
  2.  Vault status         — FAISS + audio + temporal
  3.  Ingest               — download + CLIP embed + audio FP + forensic sig
  4.  Ingest poll          — wait for completion
  5.  Vault after ingest   — vectors grew
  6.  Spider / Hunt        — multi-platform crawl
  7.  Sentinel scan        — thumbnail CLIP + pHash + temporal + audio + forensics
  8.  Batch scan           — parallel scan of spider results
  9.  Adjudicator          — LLM verdict
  10. Enforcer             — DMCA draft
  11. Broker               — rev-share contract
  12. Evidence vault       — package + custody chain
  13. Forensics analyze    — platform chain
  14. Leak analyze         — leak source
  15. Swarm (full)         — orchestrated 5-phase pipeline via Node API
"""

import requests
import json
import time
import sys

FASTAPI = "http://127.0.0.1:8001"
NODE    = "http://localhost:8000/api"
YT_URL  = "https://youtu.be/afiNbSxg7aw?si=VfrX5D31DRz-K-tu"
YT_ID   = "afiNbSxg7aw"
THUMB   = f"https://i.ytimg.com/vi/{YT_ID}/maxresdefault.jpg"

PASS = "✅ PASS"
FAIL = "❌ FAIL"
SKIP = "⏭  SKIP"
INFO = "ℹ️  INFO"

results = []

def log(status, name, detail=""):
    icon = {"PASS": "✅", "FAIL": "❌", "SKIP": "⏭ ", "INFO": "ℹ️ "}.get(status, "  ")
    msg = f"  {icon} [{name}]"
    if detail:
        msg += f"  →  {detail}"
    print(msg)
    results.append({"test": name, "status": status, "detail": str(detail)[:200]})

def section(title):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")

def post(url, body, timeout=120):
    return requests.post(url, json=body, timeout=timeout)

def get(url, timeout=30):
    return requests.get(url, timeout=timeout)

# ══════════════════════════════════════════════════════════════════
# 1. HEALTH
# ══════════════════════════════════════════════════════════════════
section("1. HEALTH CHECKS")

try:
    r = get(f"{FASTAPI}/")
    d = r.json()
    log("PASS", "FastAPI health", f"vault_size={d.get('vault_size')}")
except Exception as e:
    log("FAIL", "FastAPI health", str(e)); sys.exit(1)

try:
    r = get(f"{NODE}/health")
    d = r.json()
    for svc in ["node","redis","mongo","fastapi"]:
        st = d.get(svc,"?")
        log("PASS" if st=="ok" else "FAIL", f"Health:{svc}", st)
except Exception as e:
    log("FAIL", "Node health", str(e))

# ══════════════════════════════════════════════════════════════════
# 2. VAULT STATUS
# ══════════════════════════════════════════════════════════════════
section("2. VAULT STATUS")

try:
    r = get(f"{FASTAPI}/vault/status")
    d = r.json()
    log("PASS", "Vault status", json.dumps(d))
    initial_vault_size = d.get("vault_size", 0)
except Exception as e:
    log("FAIL", "Vault status", str(e))
    initial_vault_size = 0

# ══════════════════════════════════════════════════════════════════
# 3. INGEST
# ══════════════════════════════════════════════════════════════════
section("3. INGEST — YouTube Video")

import uuid
job_id = f"test_{uuid.uuid4().hex[:8]}"
print(f"  {INFO} job_id = {job_id}")
print(f"  {INFO} URL    = {YT_URL}")

try:
    r = post(f"{FASTAPI}/ingest", {
        "official_video_url": YT_URL,
        "job_id":             job_id,
        "video_title":        "Test Video afiNbSxg7aw",
    }, timeout=30)
    d = r.json()
    if d.get("success"):
        log("PASS", "Ingest start", f"status={d.get('status')}")
    else:
        log("FAIL", "Ingest start", str(d))
except Exception as e:
    log("FAIL", "Ingest start", str(e))

# ══════════════════════════════════════════════════════════════════
# 4. INGEST POLL — wait up to 8 min
# ══════════════════════════════════════════════════════════════════
section("4. INGEST POLL — Waiting for completion (max 8 min)")

ingest_result = {}
max_wait = 480   # 8 minutes
poll_interval = 10
elapsed = 0
frame_count = 0

while elapsed < max_wait:
    try:
        r = get(f"{FASTAPI}/ingest/status/{job_id}")
        d = r.json()
        status  = d.get("status","?")
        message = d.get("message","")[:80]
        print(f"  ⏳ [{elapsed:3d}s] {status} — {message}")

        if status == "complete":
            frame_count    = d.get("frame_count", 0)
            vault_after    = d.get("vault_size",  0)
            ingest_result  = d
            log("PASS", "Ingest complete",
                f"frames={frame_count}, vault_size={vault_after}, "
                f"audio_fp={d.get('message','')}")
            break
        elif status == "failed":
            log("FAIL", "Ingest failed", message)
            break
    except Exception as e:
        print(f"  ⚠️  Poll error: {e}")

    time.sleep(poll_interval)
    elapsed += poll_interval
else:
    log("FAIL", "Ingest timeout", f"Did not complete within {max_wait}s")

# ══════════════════════════════════════════════════════════════════
# 5. VAULT AFTER INGEST
# ══════════════════════════════════════════════════════════════════
section("5. VAULT AFTER INGEST")

try:
    r = get(f"{FASTAPI}/vault/status")
    d = r.json()
    new_size = d.get("vault_size", 0)
    grew = new_size > initial_vault_size
    log("PASS" if grew else "FAIL", "Vault grew",
        f"{initial_vault_size} → {new_size} vectors | "
        f"temporal_sigs={d.get('temporal_signatures',0)} | "
        f"audio_fp={d.get('audio_fingerprints',0)}")
except Exception as e:
    log("FAIL", "Vault after ingest", str(e))

# ══════════════════════════════════════════════════════════════════
# 6. FORENSICS STATUS
# ══════════════════════════════════════════════════════════════════
section("6. FORENSICS STATUS")

try:
    r = get(f"{FASTAPI}/forensics/status")
    d = r.json()
    log("PASS", "Forensics status", f"mode={d.get('mode','?')} model_ready={d.get('model_ready','?')}")
except Exception as e:
    log("FAIL", "Forensics status", str(e))

# ══════════════════════════════════════════════════════════════════
# 7. SENTINEL SCAN — single thumbnail
# ══════════════════════════════════════════════════════════════════
section("7. SENTINEL SCAN — Single Thumbnail")

scan_result = {}
try:
    r = post(f"{FASTAPI}/scan", {
        "thumbnail_url":  THUMB,
        "account_handle": "@test_account",
        "platform":       "YouTube",
        "title":          "Test Video",
        "url":            YT_URL,
        "country":        "US",
    }, timeout=120)
    d = r.json()
    if d.get("success"):
        scan_result = d
        log("PASS", "Sentinel scan",
            f"match={d.get('match_confirmed')} | "
            f"confidence={d.get('confidence_score')}% | "
            f"clip={d.get('clip_confidence')}% | "
            f"audio={d.get('audio_confidence')}% | "
            f"temporal={d.get('temporal_score')} | "
            f"phash={d.get('phash_match')} | "
            f"forensics_chain={d.get('forensics_chain')} | "
            f"leak_risk={d.get('forensics_leak_risk')}")
        # Sub-layer results
        log("INFO", "  Layer1 CLIP",     f"similarity={d.get('clip_similarity')} confidence={d.get('clip_confidence')}%")
        log("INFO", "  Layer2 pHash",    f"match={d.get('phash_match')} score={d.get('phash_score')}")
        log("INFO", "  Layer3 Temporal", f"score={d.get('temporal_score')} match={d.get('temporal_match')}")
        log("INFO", "  Layer4 Audio",    f"match={d.get('audio_match')} confidence={d.get('audio_confidence')}% skipped={d.get('audio_skipped')}")
        log("INFO", "  Layer5 Forensics",f"chain={d.get('forensics_chain')} first_platform={d.get('forensics_first_platform')} method={d.get('forensics_method')}")
    else:
        log("FAIL", "Sentinel scan", str(d))
except Exception as e:
    log("FAIL", "Sentinel scan", str(e))

# ══════════════════════════════════════════════════════════════════
# 8. FORENSICS ANALYZE
# ══════════════════════════════════════════════════════════════════
section("8. FORENSICS ANALYZE — Leak Chain")

try:
    r = post(f"{FASTAPI}/forensics/analyze", {"thumbnail_url": THUMB}, timeout=30)
    d = r.json()
    log("PASS" if d.get("success") else "FAIL", "Forensics analyze",
        f"chain={d.get('chain')} | confidence={d.get('confidence')} | "
        f"jpeg_q={d.get('jpeg_quality')} | method={d.get('method')}")
except Exception as e:
    log("FAIL", "Forensics analyze", str(e))

# ══════════════════════════════════════════════════════════════════
# 9. LEAK ANALYZE
# ══════════════════════════════════════════════════════════════════
section("9. LEAK SOURCE ANALYZE")

try:
    r = post(f"{FASTAPI}/leak/analyze", {
        "thumbnail_url":  THUMB,
        "video_url":      YT_URL,
        "account_handle": "@test_account",
        "platform":       "YouTube",
    }, timeout=30)
    d = r.json()
    log("PASS" if d.get("success") else "FAIL", "Leak analyze",
        f"first_leak={d.get('first_leak_platform')} | "
        f"risk={d.get('leak_risk')} | "
        f"chain={d.get('leak_chain')} | "
        f"confidence={d.get('confidence')}")
    log("INFO", "  Leak summary", d.get("leak_summary","")[:120])
except Exception as e:
    log("FAIL", "Leak analyze", str(e))

# ══════════════════════════════════════════════════════════════════
# 10. SPIDER / HUNT — multi-platform crawl
# ══════════════════════════════════════════════════════════════════
section("10. SPIDER — Multi-Platform Crawl")

spider_nodes = []
try:
    print(f"  ⏳ Running spider (may take 60-90s for all platforms)…")
    r = post(f"{FASTAPI}/hunt", {
        "official_video_url": YT_URL,
        "official_title":     "Test Video afiNbSxg7aw",
    }, timeout=180)
    d = r.json()
    if d.get("success"):
        data         = d.get("data", {})
        spider_nodes = data.get("threat_nodes", [])
        platforms    = list(set(n.get("platform","?") for n in spider_nodes))
        queries_used = data.get("search_queries_used", [])
        platforms_searched = data.get("platforms_searched", [])
        log("PASS", "Spider crawl",
            f"found={len(spider_nodes)} suspects | platforms={platforms} | "
            f"queries={len(queries_used)}")
        log("INFO", "  Platforms searched", ", ".join(platforms_searched) if platforms_searched else "see nodes")
        log("INFO", "  Queries used",       str(queries_used[:2]))
        for n in spider_nodes[:3]:
            log("INFO", f"  Suspect", f"[{n.get('platform')}] {n.get('title','?')[:50]} — {n.get('account_handle','?')}")
    else:
        log("FAIL", "Spider crawl", str(d))
except Exception as e:
    log("FAIL", "Spider crawl", str(e))

# ══════════════════════════════════════════════════════════════════
# 11. BATCH SCAN — sentinel on spider results
# ══════════════════════════════════════════════════════════════════
section("11. BATCH SCAN — Sentinel on Spider Results")

batch_results = []
if spider_nodes:
    nodes_to_scan = [n for n in spider_nodes if n.get("thumbnail_url")][:5]  # limit to 5
    try:
        print(f"  ⏳ Batch scanning {len(nodes_to_scan)} suspects (CLIP×{len(nodes_to_scan)})…")
        r = post(f"{FASTAPI}/scan/batch", {"threat_nodes": nodes_to_scan}, timeout=300)
        d = r.json()
        if d.get("success"):
            batch_results = d.get("results", [])
            confirmed = sum(1 for x in batch_results if x.get("scan",{}).get("match_confirmed"))
            suspects  = sum(1 for x in batch_results if x.get("scan",{}).get("confidence_score",0) >= 55 and not x.get("scan",{}).get("match_confirmed"))
            log("PASS", "Batch scan",
                f"scanned={len(batch_results)} | confirmed={confirmed} | suspects={suspects}")
            for br in batch_results[:3]:
                sc = br.get("scan",{})
                nd = br.get("node",{})
                log("INFO", f"  [{nd.get('platform','?')}] {nd.get('title','?')[:40]}",
                    f"conf={sc.get('confidence_score',0):.1f}% match={sc.get('match_confirmed')}")
        else:
            log("FAIL", "Batch scan", str(d))
    except Exception as e:
        log("FAIL", "Batch scan", str(e))
else:
    log("SKIP", "Batch scan", "No spider nodes available")

# ══════════════════════════════════════════════════════════════════
# 12. ADJUDICATOR
# ══════════════════════════════════════════════════════════════════
section("12. ADJUDICATOR — LLM Verdict")

verdict = {}
try:
    conf = scan_result.get("confidence_score", 85.0)
    r = post(f"{FASTAPI}/adjudicate", {
        "sentinel_report":  f"[CRITICAL] Confidence: {conf}% | CLIP: {scan_result.get('clip_confidence',85)}%",
        "platform":         "YouTube",
        "account_handle":   "@test_pirate_account",
        "video_title":      "Test Video afiNbSxg7aw",
        "description":      "Unauthorized re-upload of official video",
        "country":          "US",
        "confidence_score": conf,
    }, timeout=120)
    d = r.json()
    if d.get("success"):
        verdict = d.get("verdict", {})
        log("PASS", "Adjudicator",
            f"classification={verdict.get('classification')} | "
            f"risk={verdict.get('risk_score')} | "
            f"routing={verdict.get('routing')} | "
            f"legal={verdict.get('legal_basis')}")
        log("INFO", "  Justification", verdict.get("justification","")[:120])
        log("INFO", "  Action",        verdict.get("recommended_action","")[:100])
    else:
        log("FAIL", "Adjudicator", str(d))
except Exception as e:
    log("FAIL", "Adjudicator", str(e))

# ══════════════════════════════════════════════════════════════════
# 13. ENFORCER — DMCA Draft
# ══════════════════════════════════════════════════════════════════
section("13. ENFORCER — DMCA Notice Draft")

dmca_result = {}
try:
    r = post(f"{FASTAPI}/enforce", {
        "target_account":   "@test_pirate_account",
        "platform":         "YouTube",
        "video_title":      "Test Video afiNbSxg7aw",
        "video_url":        YT_URL,
        "confidence_score": scan_result.get("confidence_score", 85.0),
        "classification":   verdict.get("classification", "SEVERE PIRACY"),
        "justification":    verdict.get("justification", "Unauthorized re-upload detected by MediaGuard"),
        "integrity_hash":   "0xdeadbeef12345678",
        "offence_number":   1,
    }, timeout=120)
    d = r.json()
    if d.get("success"):
        dmca_result = d
        notice_preview = (d.get("notice_text","") or "")[:200]
        log("PASS", "Enforcer DMCA",
            f"tier={d.get('tier')} | legal_contact={d.get('legal_contact')} | "
            f"offence={d.get('offence_number')}")
        log("INFO", "  Notice preview", notice_preview + "…")
    else:
        log("FAIL", "Enforcer DMCA", str(d))
except Exception as e:
    log("FAIL", "Enforcer DMCA", str(e))

# ══════════════════════════════════════════════════════════════════
# 14. BROKER — Rev-share contract
# ══════════════════════════════════════════════════════════════════
section("14. BROKER — Rev-share Contract")

try:
    r = post(f"{FASTAPI}/broker", {
        "target_account": "@test_fair_use_creator",
        "platform":       "YouTube",
        "video_title":    "Test Video afiNbSxg7aw (Fan Edit)",
        "video_url":      YT_URL,
        "justification":  "Fair use fan compilation, monetized via rev-share",
        "view_count":     150000,
        "risk_score":     28,
    }, timeout=120)
    d = r.json()
    if d.get("success"):
        log("PASS", "Broker contract",
            f"tier={d.get('tier')} | "
            f"holder_share={d.get('copyright_holder_share')}% | "
            f"creator_share={d.get('creator_share')}% | "
            f"est_revenue=${d.get('estimated_monthly_revenue')}/mo | "
            f"tx={d.get('tx_hash','')[:20]}…")
        cd = d.get("contract_data",{})
        log("INFO", "  Contract title",  cd.get("contract_title","?")[:80])
        log("INFO", "  Duration",        f"{cd.get('duration_months','?')} months")
        log("INFO", "  Terms",           (cd.get("terms","") or "")[:100])
    else:
        log("FAIL", "Broker contract", str(d))
except Exception as e:
    log("FAIL", "Broker contract", str(e))

# ══════════════════════════════════════════════════════════════════
# 15. EVIDENCE VAULT
# ══════════════════════════════════════════════════════════════════
section("15. EVIDENCE VAULT — Package + Custody Chain")

incident_id = f"test_{uuid.uuid4().hex[:8]}"
try:
    # Package detection evidence
    r = post(f"{FASTAPI}/evidence/{incident_id}/package_detection", {
        "scan_result":   scan_result,
        "thumbnail_url": THUMB,
        "audio_result":  {"audio_confidence": scan_result.get("audio_confidence", 0)},
        "forensics":     {"chain": scan_result.get("forensics_chain", [])},
    }, timeout=30)
    d = r.json()
    log("PASS" if d.get("success") else "FAIL", "Evidence package", str(d))
except Exception as e:
    log("FAIL", "Evidence package", str(e))

try:
    r = get(f"{FASTAPI}/evidence/{incident_id}", timeout=15)
    d = r.json()
    log("PASS" if d.get("success") else "FAIL", "Evidence summary",
        f"artifacts={d.get('artifact_count')} | "
        f"chain_valid={d.get('chain_valid')} | "
        f"custody_events={d.get('custody_events')}")
except Exception as e:
    log("FAIL", "Evidence summary", str(e))

try:
    r = get(f"{FASTAPI}/evidence/{incident_id}/custody", timeout=15)
    d = r.json()
    chain = d.get("chain", [])
    log("PASS" if chain else "FAIL", "Custody chain",
        f"events={len(chain)} | integrity={d.get('integrity',{}).get('valid')} | "
        f"last_action={chain[-1].get('action') if chain else 'none'}")
except Exception as e:
    log("FAIL", "Custody chain", str(e))

# ══════════════════════════════════════════════════════════════════
# 16. SWARM — Full 5-Phase Pipeline via Node API
# ══════════════════════════════════════════════════════════════════
section("16. SWARM — Full 5-Phase Pipeline (Node API)")

swarm_job_id = None
try:
    r = post(f"{NODE}/swarm/run", {
        "official_video_url": YT_URL,
        "official_title":     "Test Video afiNbSxg7aw",
    }, timeout=30)
    d = r.json()
    if d.get("success"):
        swarm_job_id = d.get("jobId")
        log("PASS", "Swarm launched", f"jobId={swarm_job_id}")
    else:
        log("FAIL", "Swarm launch", str(d))
except Exception as e:
    log("FAIL", "Swarm launch", str(e))

# Poll swarm job status via Node
if swarm_job_id:
    print(f"  ⏳ Polling swarm job (max 10 min)…")
    max_swarm = 600
    swarm_elapsed = 0
    while swarm_elapsed < max_swarm:
        try:
            r = get(f"{NODE}/hunt/{swarm_job_id}", timeout=15)
            d = r.json()
            job = d.get("data", {}) if d.get("success") else {}
            status = job.get("status","?")
            tc     = job.get("threat_count", 0)
            pc     = job.get("piracy_count", 0)
            fc     = job.get("fair_use_count", 0)
            print(f"  ⏳ [{swarm_elapsed:3d}s] status={status} | threats={tc} | piracy={pc} | fair_use={fc}")
            if status in ("complete","failed"):
                if status == "complete":
                    log("PASS", "Swarm complete",
                        f"threats={tc} | piracy={pc} | fair_use={fc}")
                else:
                    log("FAIL", "Swarm failed", job.get("error_message","?"))
                break
        except Exception as e:
            print(f"  ⚠️  Poll error: {e}")
        time.sleep(15)
        swarm_elapsed += 15
    else:
        log("FAIL", "Swarm timeout", "Did not complete within 10 min")

# ══════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ══════════════════════════════════════════════════════════════════
print(f"\n{'═'*60}")
print(f"  MEDIAGUARD TEST RESULTS")
print(f"{'═'*60}")

passed = [r for r in results if r["status"] == "PASS"]
failed = [r for r in results if r["status"] == "FAIL"]
skipped= [r for r in results if r["status"] == "SKIP"]

for r in results:
    if r["status"] in ("PASS","FAIL","SKIP"):
        icon = {"PASS":"✅","FAIL":"❌","SKIP":"⏭ "}.get(r["status"],"  ")
        print(f"  {icon} {r['test']}")
        if r["status"] == "FAIL" and r["detail"]:
            print(f"      ↳ {r['detail'][:120]}")

print(f"\n{'─'*60}")
print(f"  ✅ PASSED : {len(passed)}")
print(f"  ❌ FAILED : {len(failed)}")
print(f"  ⏭  SKIPPED: {len(skipped)}")
print(f"{'═'*60}\n")

if failed:
    print("  FAILED TESTS:")
    for f in failed:
        print(f"    ❌ {f['test']}: {f['detail'][:150]}")
    print()
