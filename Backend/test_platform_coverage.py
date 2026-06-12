"""
Platform Coverage Audit — verifies ACTUAL execution of each scraper.
Tests every scraper independently with a real query.
Run: python test_platform_coverage.py
"""
import sys, os, time, json, requests, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

TEST_QUERY = "rick astley never gonna give you up"  # well-known, widely re-uploaded

PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️  WARN"
SKIP = "⏭  SKIP"

results = {}

def check(platform, scraper_fn, queries=[TEST_QUERY]):
    print(f"\n{'─'*55}")
    print(f"  Testing: {platform}")
    print(f"{'─'*55}")
    r = {
        "platform":             platform,
        "scraper_exists":       True,
        "scraper_executes":     False,
        "returns_nodes":        False,
        "media_url":            False,
        "thumbnail":            False,
        "metadata":             False,
        "url_normalized":       False,
        "node_count":           0,
        "error":                None,
        "sample_node":          None,
        "elapsed_sec":          0,
    }
    try:
        t0 = time.time()
        nodes = scraper_fn(queries)
        r["elapsed_sec"] = round(time.time() - t0, 1)
        r["scraper_executes"] = True

        if nodes:
            r["returns_nodes"] = True
            r["node_count"] = len(nodes)
            n = nodes[0]
            r["sample_node"] = {k: str(v)[:80] for k, v in n.items() if k != "coordinates"}

            r["media_url"]   = bool(n.get("url", ""))
            r["thumbnail"]   = bool(n.get("thumbnail_url", ""))
            r["metadata"]    = bool(n.get("title") and n.get("account_handle"))
            r["url_normalized"] = bool(n.get("url", "").startswith("http"))

            print(f"  Nodes returned: {len(nodes)}")
            print(f"  Sample URL: {n.get('url','')[:70]}")
            print(f"  Thumbnail:  {n.get('thumbnail_url','(none)')[:70]}")
            print(f"  Title:      {n.get('title','')[:60]}")
            print(f"  Account:    {n.get('account_handle','')[:40]}")
            print(f"  Views:      {n.get('view_count', 0)}")
        else:
            print(f"  ⚠️  No nodes returned (0 results)")

        print(f"  Time: {r['elapsed_sec']}s")
    except Exception as e:
        r["error"] = str(e)[:200]
        r["elapsed_sec"] = round(time.time() - t0, 1)
        print(f"  ERROR: {e}")

    results[platform] = r
    return r

# ── Import scrapers ──────────────────────────────────────────────────────────
from agents.spider import (
    _scrape_youtube, _scrape_dailymotion, _scrape_reddit,
    _scrape_rumble, _scrape_tiktok, _scrape_instagram,
    _scrape_twitter, _scrape_facebook, _scrape_telegram,
    _ydl_opts, PLATFORM_SCRAPERS
)

print("=" * 55)
print("  MediaGuard Platform Coverage Audit")
print(f"  Test query: '{TEST_QUERY}'")
print("=" * 55)

# ── 1. YouTube ───────────────────────────────────────────────────────────────
check("YouTube", _scrape_youtube)

# ── 2. Dailymotion ───────────────────────────────────────────────────────────
check("Dailymotion", _scrape_dailymotion)

# ── 3. Reddit ────────────────────────────────────────────────────────────────
check("Reddit", _scrape_reddit)

# ── 4. Rumble ────────────────────────────────────────────────────────────────
check("Rumble", _scrape_rumble)

# ── 5. TikTok ────────────────────────────────────────────────────────────────
check("TikTok", _scrape_tiktok)

# ── 6. Instagram ─────────────────────────────────────────────────────────────
check("Instagram", _scrape_instagram)

# ── 7. Twitter/X ─────────────────────────────────────────────────────────────
check("Twitter/X", _scrape_twitter)

# ── 8. Facebook ──────────────────────────────────────────────────────────────
check("Facebook", _scrape_facebook)

# ── 9. Telegram ──────────────────────────────────────────────────────────────
check("Telegram", _scrape_telegram)

# ── 10-17. Not-implemented platforms: check manually ─────────────────────────
NOT_IMPLEMENTED = {
    "Vimeo":    {"scraper_exists": False, "note": "No _scrape_vimeo() function"},
    "Twitch":   {"scraper_exists": False, "note": "No _scrape_twitch() function"},
    "Discord":  {"scraper_exists": False, "note": "No _scrape_discord() function"},
    "Torrents": {"scraper_exists": False, "note": "No torrent index scraper"},
    "Dropbox":  {"scraper_exists": "partial", "note": "URL normalization in main.py ingest only — not searchable"},
    "GDrive":   {"scraper_exists": "partial", "note": "URL normalization in main.py ingest only — not searchable"},
    "Instagram Stories": {"scraper_exists": False, "note": "Stories require auth — not implemented"},
    "Instagram Posts": {"scraper_exists": "partial", "note": "Google fallback finds /p/ URLs but no account info"},
    "Facebook Reels": {"scraper_exists": False, "note": "Facebook scraper uses /search/videos/ which may miss Reels format"},
}

# ── INGEST URL normalization test (Dropbox + GDrive) ─────────────────────────
print(f"\n{'─'*55}")
print("  Testing: Ingest URL Normalization (Dropbox / Google Drive)")
print(f"{'─'*55}")

test_urls = {
    "Dropbox (dl=0 → dl=1)": (
        "https://www.dropbox.com/s/abc123/video.mp4?dl=0",
        "dl=1",
    ),
    "Dropbox (no dl param)": (
        "https://www.dropbox.com/s/abc123/video.mp4",
        "dl=1",
    ),
    "Dropbox (domain swap)": (
        "https://www.dropbox.com/s/abc123/video.mp4?dl=0",
        "dl.dropboxusercontent.com",
    ),
    "Google Drive /file/d/": (
        "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view",
        "drive.google.com/uc?export=download",
    ),
    "Google Drive share URL": (
        "https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
        "export=download",
    ),
}

for name, (url, expected_in_result) in test_urls.items():
    # Simulate the normalization logic from main.py
    result_url = url
    if 'dropbox.com' in url:
        result_url = re.sub(r'([?&])dl=\d+', r'\1', url).rstrip('?&')
        sep = '&' if '?' in result_url else '?'
        result_url = result_url + sep + 'dl=1'
        result_url = result_url.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
    elif '/file/d/' in url:
        file_id = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
        if file_id:
            result_url = f"https://drive.google.com/uc?export=download&confirm=t&id={file_id.group(1)}"
    elif 'open?id=' in url or 'id=' in url:
        id_match = re.search(r'id=([a-zA-Z0-9_-]+)', url)
        if id_match:
            result_url = f"https://drive.google.com/uc?export=download&confirm=t&id={id_match.group(1)}"

    ok = expected_in_result in result_url
    print(f"  {'✅' if ok else '❌'} {name}")
    print(f"       Input:  {url[:70]}")
    print(f"       Output: {result_url[:70]}")

# ── yt-dlp extractor verification for key platforms ──────────────────────────
print(f"\n{'─'*55}")
print("  yt-dlp Extractor Support Check")
print(f"{'─'*55}")

import yt_dlp
ie_names = [ie.IE_NAME for ie in yt_dlp.YoutubeDL()._ies]
platform_ie_check = {
    "YouTube":    any("youtube" in n.lower() for n in ie_names),
    "Vimeo":      any("vimeo" in n.lower() for n in ie_names),
    "Dailymotion":any("dailymotion" in n.lower() for n in ie_names),
    "TikTok":     any("tiktok" in n.lower() for n in ie_names),
    "Twitter/X":  any("twitter" in n.lower() or "x.com" in n.lower() for n in ie_names),
    "Instagram":  any("instagram" in n.lower() for n in ie_names),
    "Facebook":   any("facebook" in n.lower() for n in ie_names),
    "Twitch":     any("twitch" in n.lower() for n in ie_names),
    "Reddit":     any("reddit" in n.lower() for n in ie_names),
    "Rumble":     any("rumble" in n.lower() for n in ie_names),
    "Telegram":   any("telegram" in n.lower() for n in ie_names),
}
for plat, supported in platform_ie_check.items():
    print(f"  {'✅' if supported else '❌'} {plat}")

# ── FINAL COVERAGE MATRIX ────────────────────────────────────────────────────
print(f"\n{'='*55}")
print("  PLATFORM COVERAGE MATRIX")
print(f"{'='*55}")
print(f"  {'Platform':<20} {'Scraper':<8} {'Executes':<9} {'Results':<8} {'URL':<5} {'Thumb':<6} {'Meta':<5} {'Time':>6}")
print(f"  {'-'*80}")

all_platforms = dict(results)
for p, d in NOT_IMPLEMENTED.items():
    all_platforms[p] = {
        "scraper_exists": d["scraper_exists"],
        "scraper_executes": False,
        "returns_nodes": False,
        "media_url": False,
        "thumbnail": False,
        "metadata": False,
        "node_count": 0,
        "error": d["note"],
        "elapsed_sec": 0,
    }

for platform, r in all_platforms.items():
    se = "✅" if r["scraper_exists"] == True else ("⚠️" if r["scraper_exists"] == "partial" else "❌")
    ex = "✅" if r["scraper_executes"] else "❌"
    rn = f"✅ {r['node_count']}" if r["returns_nodes"] else "❌ 0"
    mu = "✅" if r["media_url"] else "❌"
    th = "✅" if r["thumbnail"] else "❌"
    me = "✅" if r["metadata"] else "❌"
    t  = f"{r['elapsed_sec']}s" if r['elapsed_sec'] else "-"
    print(f"  {platform:<20} {se:<8} {ex:<9} {rn:<8} {mu:<5} {th:<6} {me:<5} {t:>6}")

print(f"\n{'='*55}")
print("  LEGEND: ✅=Working  ❌=Not Working  ⚠️=Partial")
print(f"{'='*55}")

# Show errors
print("\n  ERRORS / NOTES:")
for platform, r in all_platforms.items():
    if r.get("error"):
        print(f"  [{platform}] {r['error'][:120]}")

# Save results
with open("platform_coverage_results.json", "w") as f:
    json.dump(all_platforms, f, indent=2, default=str)
print("\n  Full results saved to platform_coverage_results.json")
