"""
End-to-end pipeline test script for MediaGuard.
Tests: Spider → Forensics thumbnail analysis → Vault status
Usage: python test_pipeline.py
"""
import sys
import json
import os
sys.path.insert(0, os.path.dirname(__file__))

VIDEO_URL    = "https://youtu.be/tCGjOyAptdg"
OFFICIAL_TITLE = "Test IPL Match Highlights"  # provide title to bypass yt-dlp bot detection

SEP = "=" * 60


# ────────────────────────────────────────────────────────────────────────────
# TEST 0: Import check
# ────────────────────────────────────────────────────────────────────────────
print(SEP)
print("TEST 0: Import check")
print(SEP)

try:
    from agents.archivist      import vector_db, EMBEDDING_DIM, temporal_store
    from agents.sentinel       import scan_thumbnail, MATCH_THRESHOLD, SUSPECT_THRESHOLD
    from agents.forensics      import get_forensics_status, analyze_thumbnail_url
    from agents.audio_fingerprint import get_audio_vault_status
    from agents.spider         import crawl
    print("[OK] All imports successful")
    print(f"     FAISS vault   : {vector_db.ntotal} vectors  (dim={EMBEDDING_DIM})")
    print(f"     Thresholds    : match={MATCH_THRESHOLD}, suspect={SUSPECT_THRESHOLD}")
    print(f"     Temporal sigs : {sum(len(v) for k,v in temporal_store.items() if '__forensics' not in k)}")
    fs = get_forensics_status()
    print(f"     Forensics     : mode={fs['mode']}, model_ready={fs['model_ready']}")
    av = get_audio_vault_status()
    print(f"     Audio vault   : {av['fingerprints_stored']} fingerprints, {av['audio_vectors']} mel vectors")
except Exception as e:
    print(f"[FAIL] Import error: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)

print()


# ────────────────────────────────────────────────────────────────────────────
# TEST 1: Spider crawl
# ────────────────────────────────────────────────────────────────────────────
print(SEP)
print("TEST 1: Spider crawl")
print(f"  URL   : {VIDEO_URL}")
print(f"  Title : {OFFICIAL_TITLE}")
print(SEP)

try:
    result = crawl(VIDEO_URL, official_title=OFFICIAL_TITLE)

    if "error" in result:
        print(f"[WARN] Spider returned error: {result['error']}")
    else:
        src    = result.get("official_source", {})
        nodes  = result.get("threat_nodes", [])
        print(f"[OK] Official source  : {src.get('title', '?')} ({src.get('country', '?')})")
        print(f"     Search queries   : {result.get('search_queries_used', [])}")
        print(f"     Suspects found   : {len(nodes)}")
        print(f"     Country spread   : {result.get('country_threat_counts', {})}")

        if nodes:
            print()
            print("  Top 3 suspects:")
            for i, node in enumerate(nodes[:3]):
                print(f"    [{i+1}] {node['title'][:60]}")
                print(f"         Platform : {node['platform']} | @{node['account_handle']}")
                print(f"         Views    : {node.get('view_count', 0):,}")
                print(f"         Country  : {node.get('country', '?')}")
                print(f"         Thumb    : {node.get('thumbnail_url', '')[:80]}")
                print()
        else:
            print("  (No suspects found — likely YouTube bot detection on cloud IP)")
            print("  Tip: provide a more specific title for better search results")
except Exception as e:
    print(f"[FAIL] Spider error: {e}")
    import traceback; traceback.print_exc()

print()


# ────────────────────────────────────────────────────────────────────────────
# TEST 2: Forensics thumbnail analysis
# ────────────────────────────────────────────────────────────────────────────
print(SEP)
print("TEST 2: Forensics — YouTube thumbnail analysis")
print(SEP)

# Extract video ID from URL and build thumbnail URL
import re
vid_match = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})", VIDEO_URL)
if vid_match:
    vid_id    = vid_match.group(1)
    thumb_url = f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"
    print(f"  Video ID  : {vid_id}")
    print(f"  Thumb URL : {thumb_url}")
    print()

    try:
        forensics = analyze_thumbnail_url(thumb_url)
        if forensics.get("error"):
            print(f"[WARN] Forensics error: {forensics['error']}")
        else:
            print(f"[OK] Method         : {forensics['method']}")
            print(f"     JPEG quality    : {forensics.get('jpeg_quality', 0):.1f}")
            print(f"     Chain detected  : {forensics.get('chain', [])}")
            print(f"     Chain length    : {forensics.get('chain_length', 0)}")
            print(f"     Confidence      : {forensics.get('confidence', 0):.3f}")
            print(f"     First platform  : {forensics.get('first_platform')}")
            print(f"     Leak risk       : {forensics.get('leak_risk')}")
            ps = forensics.get("platform_scores", {})
            if ps:
                print(f"     Platform scores :")
                for p, s in sorted(ps.items(), key=lambda x: x[1], reverse=True):
                    bar = "█" * int(s * 20)
                    print(f"       {p:<12} {s:.3f} {bar}")
    except Exception as e:
        print(f"[FAIL] Forensics error: {e}")
        import traceback; traceback.print_exc()
else:
    print("[SKIP] Could not extract video ID from URL")

print()


# ────────────────────────────────────────────────────────────────────────────
# TEST 3: Sentinel scan (vault must be non-empty to get real results)
# ────────────────────────────────────────────────────────────────────────────
print(SEP)
print("TEST 3: Sentinel thumbnail scan")
print(SEP)

if vector_db.ntotal == 0:
    print("[SKIP] Vault is empty — ingest an official video first.")
    print("       Run: POST /ingest with a Google Drive URL")
else:
    if vid_match:
        try:
            scan = scan_thumbnail(thumb_url, suspect_video_url=VIDEO_URL)
            if "error" in scan:
                print(f"[WARN] {scan['error']}")
            else:
                print(f"[OK] Match confirmed    : {scan['match_confirmed']}")
                print(f"     Fused confidence   : {scan['confidence_score']}%")
                print(f"     CLIP similarity    : {scan['clip_similarity']:.4f}")
                print(f"     Temporal score     : {scan['temporal_score']:.4f}")
                print(f"     pHash match        : {scan['phash_match']}")
                print(f"     Audio skipped      : {scan['audio_skipped']}")
                print(f"     Severity           : {scan['severity']}")
                print(f"     Forensics chain    : {scan.get('forensics_chain', [])}")
                print(f"     Forensics risk     : {scan.get('forensics_leak_risk')}")
        except Exception as e:
            print(f"[FAIL] Scan error: {e}")
            import traceback; traceback.print_exc()

print()
print(SEP)
print("ALL TESTS COMPLETE")
print(SEP)
print()
print("Next steps:")
print("  1. Ingest official video: POST /ingest {official_video_url: '<Google Drive link>'}")
print("  2. Run swarm: POST /swarm/run {official_video_url: '<YouTube URL>', official_title: '<title>'}")
print("  3. Check vault: GET /vault/status")
print("  4. Check forensics: GET /forensics/status")
