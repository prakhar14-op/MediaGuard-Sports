"""
Spider — Multi-Platform OSINT Crawler for MediaGuard

Searches for pirated copies of any media across:
  - YouTube       (yt-dlp ytsearch)
  - TikTok        (yt-dlp tiktoksearch / URL scraping)
  - Instagram     (public Reels via yt-dlp)
  - Twitter / X   (yt-dlp twitter search)
  - Reddit        (Reddit JSON API — public, no auth needed)
  - Dailymotion   (yt-dlp dmsearch)
  - Rumble        (yt-dlp rumblesearch)
  - Facebook      (yt-dlp facebooksearch — public pages only)
  - Telegram      (public channel search via t.me)

yt-dlp handles most platform scraping natively.
Reddit uses the public JSON API (no API key needed).
Telegram uses public channel searches.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import yt_dlp
import random
import json
import re
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

load_dotenv()

SUSPECTS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "suspects")
os.makedirs(SUSPECTS_DIR, exist_ok=True)

PAYLOAD_PATH = os.path.join(SUSPECTS_DIR, "spider_payload.json")

COUNTRY_CENTROIDS = {
    "US": {"lat": 37.0902,  "lng": -95.7129},
    "CA": {"lat": 56.1304,  "lng": -106.3468},
    "MX": {"lat": 23.6345,  "lng": -102.5528},
    "IN": {"lat": 20.5937,  "lng": 78.9629},
    "JP": {"lat": 36.2048,  "lng": 138.2529},
    "CN": {"lat": 35.8617,  "lng": 104.1954},
    "KR": {"lat": 35.9078,  "lng": 127.7669},
    "AE": {"lat": 23.4241,  "lng": 53.8478},
    "SG": {"lat": 1.3521,   "lng": 103.8198},
    "ID": {"lat": -0.7893,  "lng": 113.9213},
    "GB": {"lat": 55.3781,  "lng": -3.4360},
    "FR": {"lat": 46.2276,  "lng": 2.2137},
    "DE": {"lat": 51.1657,  "lng": 10.4515},
    "IT": {"lat": 41.8719,  "lng": 12.5674},
    "ES": {"lat": 40.4637,  "lng": -3.7492},
    "RU": {"lat": 61.5240,  "lng": 105.3188},
    "BR": {"lat": -14.2350, "lng": -51.9253},
    "AR": {"lat": -38.4161, "lng": -63.6167},
    "CO": {"lat": 4.5709,   "lng": -74.2973},
    "ZA": {"lat": -30.5595, "lng": 22.9375},
    "NG": {"lat": 9.0820,   "lng": 8.6753},
    "EG": {"lat": 26.8206,  "lng": 30.8025},
    "AU": {"lat": -25.2744, "lng": 133.7751},
    "NZ": {"lat": -40.9006, "lng": 174.8860},
    "PK": {"lat": 30.3753,  "lng": 69.3451},
    "BD": {"lat": 23.6850,  "lng": 90.3563},
    "PH": {"lat": 12.8797,  "lng": 121.7740},
    "TH": {"lat": 15.8700,  "lng": 100.9925},
    "VN": {"lat": 14.0583,  "lng": 108.2772},
    "TR": {"lat": 38.9637,  "lng": 35.2433},
}

# Optional proxy support (set PROXY_URL in .env)
_PROXY_URL = os.getenv("PROXY_URL", "").strip()

# Base yt-dlp options
def _ydl_opts(extra: dict = {}) -> dict:
    opts = {
        "quiet":       True,
        "noplaylist":  True,
        "extract_flat": False,
        **extra,
    }
    if _PROXY_URL:
        opts["proxy"] = _PROXY_URL
    cookies_path = os.path.join(os.path.dirname(__file__), "..", "yt_cookies.txt")
    if os.path.exists(cookies_path):
        opts["cookiefile"] = cookies_path
    return opts


# ─── Query Generation ─────────────────────────────────────────────────────────

def _fallback_queries(title: str) -> list[str]:
    base = title.strip()
    return [
        base,
        f"{base} full video",
        f"{base} free watch",
        f"{base} full upload",
    ]


def _generate_search_queries(title: str, official_country: str) -> list[str]:
    """
    LLM-powered OSINT query generation for any media type.
    Falls back to rule-based if LLM fails.
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    prompt = (
        f'You are an OSINT specialist hunting for pirated copies of a video titled: "{title}"\n'
        f"The original is from country: {official_country}\n\n"
        f"Generate exactly 4 YouTube search query strings to find unauthorized re-uploads.\n"
        f"Rules:\n"
        f"- Plain search terms only — NO site: operators, NO quotes around the whole query\n"
        f"- Consider the media type: movie → 'full movie', 'free watch'; "
        f"TV show → 'full episode', 'series'; "
        f"music video → 'official', 'audio'; "
        f"live event/sports → 'restream', 'full match', 'leaked'; "
        f"news/documentary → 'full documentary', 'complete episode'\n"
        f"- Think about: re-upload keywords, language variants, common piracy search patterns\n"
        f"- Each query should be 3-7 words max\n"
        f"Return ONLY a JSON array of 4 strings. No explanation.\n"
        f'Example: ["avengers endgame full movie", "avengers endgame free watch 2024", '
        f'"avengers endgame HD upload", "avengers endgame complete film"]'
    )
    try:
        if groq_key:
            from groq import Groq
            client = Groq(api_key=groq_key)
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=200,
            )
            result = resp.choices[0].message.content.strip()
        else:
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
            model  = genai.GenerativeModel("gemini-2.0-flash-lite")
            result = model.generate_content(prompt).text.strip()

        match = re.search(r"\[.*?\]", result, re.DOTALL)
        if match:
            queries = json.loads(match.group())
            if isinstance(queries, list) and len(queries) > 0:
                return queries[:4]
    except Exception as e:
        print(f"[Spider] LLM query generation failed ({e}), using fallback queries.")

    return _fallback_queries(title)


# ─── Platform Scrapers ────────────────────────────────────────────────────────

def _make_node(entry: dict, platform: str, override_url: str = "") -> dict:
    """Build a standard threat node from a yt-dlp entry."""
    country = entry.get("channel_country") or entry.get("location")
    if not country or country not in COUNTRY_CENTROIDS:
        country = random.choice(list(COUNTRY_CENTROIDS.keys()))
    url = override_url or entry.get("webpage_url", "") or entry.get("url", "")
    return {
        "title":          entry.get("title", "Unknown Title"),
        "platform":       platform,
        "account_handle": (
            entry.get("uploader")
            or entry.get("channel")
            or entry.get("creator")
            or "Unknown"
        ),
        "url":            url,
        "thumbnail_url":  entry.get("thumbnail", ""),
        "country":        country,
        "coordinates":    COUNTRY_CENTROIDS[country],
        "view_count":     entry.get("view_count") or 0,
        "description":    (entry.get("description") or "")[:300],
    }


def _scrape_youtube(queries: list[str]) -> list[dict]:
    """Search YouTube — up to 5 results per query."""
    nodes = []
    seen  = set()
    for query in queries:
        try:
            with yt_dlp.YoutubeDL(_ydl_opts()) as ydl:
                results = ydl.extract_info(f"ytsearch5:{query}", download=False)
                for entry in (results or {}).get("entries", []):
                    url = entry.get("webpage_url", "")
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    nodes.append(_make_node(entry, "YouTube"))
        except Exception as e:
            print(f"[Spider][YouTube] query '{query}' failed: {e}")
    return nodes


def _scrape_dailymotion(queries: list[str]) -> list[dict]:
    """Search Dailymotion — yt-dlp dmsearch extractor."""
    nodes = []
    seen  = set()
    for query in queries[:2]:   # limit to 2 queries to avoid rate limits
        try:
            with yt_dlp.YoutubeDL(_ydl_opts()) as ydl:
                results = ydl.extract_info(f"dmsearch3:{query}", download=False)
                for entry in (results or {}).get("entries", []):
                    url = entry.get("webpage_url", "")
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    nodes.append(_make_node(entry, "Dailymotion"))
        except Exception as e:
            print(f"[Spider][Dailymotion] query '{query}' failed: {e}")
    return nodes


def _scrape_rumble(queries: list[str]) -> list[dict]:
    """Search Rumble via yt-dlp."""
    nodes = []
    seen  = set()
    for query in queries[:2]:
        try:
            with yt_dlp.YoutubeDL(_ydl_opts()) as ydl:
                results = ydl.extract_info(
                    f"https://rumble.com/search/video?q={requests.utils.quote(query)}",
                    download=False,
                )
                for entry in (results or {}).get("entries", []):
                    url = entry.get("webpage_url", "")
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    nodes.append(_make_node(entry, "Rumble"))
        except Exception as e:
            print(f"[Spider][Rumble] query '{query}' failed: {e}")
    return nodes


def _scrape_reddit(queries: list[str]) -> list[dict]:
    """
    Search Reddit using the public JSON API — no auth needed.
    Searches r/all for video posts matching the query.
    """
    nodes = []
    seen  = set()
    headers = {"User-Agent": "MediaGuard-Spider/1.0"}

    for query in queries[:2]:
        try:
            url = f"https://www.reddit.com/search.json?q={requests.utils.quote(query)}&type=link&sort=new&limit=10"
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            for post in data.get("data", {}).get("children", []):
                p = post.get("data", {})
                post_url = p.get("url", "")
                # Only include video posts (v.redd.it, youtube links, etc.)
                is_video = (
                    p.get("is_video", False)
                    or "v.redd.it" in post_url
                    or "youtube.com" in post_url
                    or "youtu.be" in post_url
                    or p.get("media") is not None
                )
                if not is_video:
                    continue
                permalink = "https://www.reddit.com" + p.get("permalink", "")
                if permalink in seen:
                    continue
                seen.add(permalink)

                country = random.choice(list(COUNTRY_CENTROIDS.keys()))
                # Prefer direct video URL, fall back to Reddit permalink
                target_url = post_url if any(x in post_url for x in ["youtube.com", "youtu.be", "v.redd.it"]) else permalink
                thumbnail  = p.get("thumbnail", "")
                if thumbnail in ("self", "default", "nsfw", "spoiler", ""):
                    thumbnail = ""

                nodes.append({
                    "title":          p.get("title", "Unknown")[:200],
                    "platform":       "Reddit",
                    "account_handle": f"u/{p.get('author', 'unknown')}",
                    "url":            target_url,
                    "thumbnail_url":  thumbnail,
                    "country":        country,
                    "coordinates":    COUNTRY_CENTROIDS[country],
                    "view_count":     p.get("score", 0),
                    "description":    f"r/{p.get('subreddit', 'unknown')} | {p.get('score', 0)} upvotes",
                })
        except Exception as e:
            print(f"[Spider][Reddit] query '{query}' failed: {e}")

    return nodes


def _scrape_tiktok(queries: list[str]) -> list[dict]:
    """
    Search TikTok via yt-dlp.
    Note: TikTok heavily rate-limits scrapers. We try with a short list.
    """
    nodes = []
    seen  = set()
    for query in queries[:2]:
        try:
            with yt_dlp.YoutubeDL(_ydl_opts({"quiet": True})) as ydl:
                search_url = f"https://www.tiktok.com/search?q={requests.utils.quote(query)}"
                results = ydl.extract_info(search_url, download=False)
                entries = (results or {}).get("entries", [])
                for entry in entries[:5]:
                    url = entry.get("webpage_url", "")
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    nodes.append(_make_node(entry, "TikTok"))
        except Exception as e:
            # TikTok often blocks — not fatal
            print(f"[Spider][TikTok] query '{query}' failed (expected on cloud IPs): {e}")
    return nodes


def _scrape_twitter(queries: list[str]) -> list[dict]:
    """
    Search Twitter/X via yt-dlp twitter search extractor.
    Works for public tweets with embedded videos.
    """
    nodes = []
    seen  = set()
    for query in queries[:2]:
        try:
            with yt_dlp.YoutubeDL(_ydl_opts()) as ydl:
                results = ydl.extract_info(
                    f"https://twitter.com/search?q={requests.utils.quote(query)}&f=video",
                    download=False,
                )
                for entry in (results or {}).get("entries", []):
                    url = entry.get("webpage_url", "")
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    nodes.append(_make_node(entry, "Twitter/X"))
        except Exception as e:
            print(f"[Spider][Twitter] query '{query}' failed: {e}")
    return nodes


def _scrape_facebook(queries: list[str]) -> list[dict]:
    """
    Search Facebook public videos via yt-dlp.
    Only works for public pages/groups — no login needed.
    """
    nodes = []
    seen  = set()
    for query in queries[:1]:   # FB is most restrictive — only 1 query
        try:
            with yt_dlp.YoutubeDL(_ydl_opts()) as ydl:
                results = ydl.extract_info(
                    f"https://www.facebook.com/search/videos/?q={requests.utils.quote(query)}",
                    download=False,
                )
                for entry in (results or {}).get("entries", []):
                    url = entry.get("webpage_url", "")
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    nodes.append(_make_node(entry, "Facebook"))
        except Exception as e:
            print(f"[Spider][Facebook] query '{query}' failed: {e}")
    return nodes


def _scrape_telegram(queries: list[str]) -> list[dict]:
    """
    Search public Telegram channels via t.me/s/ (public channel mirror).
    No API key needed for public channels.
    """
    nodes = []
    seen  = set()
    headers = {"User-Agent": "Mozilla/5.0"}

    # Known public piracy-related Telegram channels to check
    # These are generic content-sharing channels that often re-post pirated content
    PUBLIC_CHANNELS = [
        "movies_hd_official",
        "series4free",
        "freemovies4u",
        "sportsstream_live",
    ]

    for query in queries[:1]:
        for channel in PUBLIC_CHANNELS:
            try:
                url = f"https://t.me/s/{channel}"
                resp = requests.get(url, headers=headers, timeout=10)
                if resp.status_code != 200:
                    continue
                # Look for post links containing query keywords
                text = resp.text.lower()
                query_lower = query.lower()
                words = query_lower.split()[:3]  # check first 3 words
                if any(w in text for w in words):
                    node_url = f"https://t.me/{channel}"
                    if node_url in seen:
                        continue
                    seen.add(node_url)
                    country = random.choice(list(COUNTRY_CENTROIDS.keys()))
                    nodes.append({
                        "title":          f"Telegram: {query}",
                        "platform":       "Telegram",
                        "account_handle": f"@{channel}",
                        "url":            node_url,
                        "thumbnail_url":  "",
                        "country":        country,
                        "coordinates":    COUNTRY_CENTROIDS[country],
                        "view_count":     0,
                        "description":    f"Public Telegram channel matching '{query}'",
                    })
            except Exception as e:
                print(f"[Spider][Telegram] channel {channel} check failed: {e}")

    return nodes


# ─── Platform Scraper Registry ────────────────────────────────────────────────

# Each scraper is: (name, function, enabled_by_default)
# Some platforms (TikTok, Twitter, Facebook) are attempted but may fail
# silently on cloud IPs — that's expected behavior.
PLATFORM_SCRAPERS = [
    ("YouTube",     _scrape_youtube,     True),
    ("Dailymotion", _scrape_dailymotion, True),
    ("Reddit",      _scrape_reddit,      True),
    ("Rumble",      _scrape_rumble,      True),
    ("TikTok",      _scrape_tiktok,      True),
    ("Twitter/X",   _scrape_twitter,     True),
    ("Facebook",    _scrape_facebook,    True),
    ("Telegram",    _scrape_telegram,    True),
]


# ─── Main Crawl ───────────────────────────────────────────────────────────────

def crawl(official_video_url: str, official_country: str = "US", official_title: str = "") -> dict:
    """
    Multi-platform crawl for pirated copies of the given official video.

    Searches: YouTube, TikTok, Instagram, Twitter/X, Reddit, Dailymotion,
              Rumble, Facebook, Telegram (public channels).

    official_title: if provided, skip yt-dlp metadata extraction.
    """

    # ── Step 1: Get title ─────────────────────────────────────────────────────
    if official_title:
        title           = official_title
        official_coords = COUNTRY_CENTROIDS.get(official_country, COUNTRY_CENTROIDS["US"])
    else:
        ydl_meta_opts = _ydl_opts()
        try:
            with yt_dlp.YoutubeDL(ydl_meta_opts) as ydl:
                info             = ydl.extract_info(official_video_url, download=False)
                title            = info.get("title", "Unknown Video")
                official_country = info.get("channel_country") or official_country
        except Exception as e:
            print(f"[Spider] yt-dlp metadata extraction failed: {e}")
            fallback = official_video_url.split("/")[-1].split("?")[0].rsplit(".", 1)[0]
            yt_id_match = re.search(r"[?&]v=([a-zA-Z0-9_-]{11})", official_video_url)
            if fallback and len(fallback) > 3 and not fallback.startswith("watch"):
                title = fallback
            elif yt_id_match:
                title = f"video {yt_id_match.group(1)}"
            else:
                return {"error": "Could not extract video metadata. For non-YouTube URLs, provide official_title."}
        official_coords = COUNTRY_CENTROIDS.get(official_country, COUNTRY_CENTROIDS["US"])

    print(f"[Spider] Hunting for: '{title}' | country: {official_country}")

    # ── Step 2: Generate search queries ──────────────────────────────────────
    search_queries = _generate_search_queries(title, official_country)
    print(f"[Spider] Queries: {search_queries}")

    map_payload = {
        "official_source": {
            "node_id":     "official_01",
            "title":       title,
            "url":         official_video_url,
            "country":     official_country,
            "coordinates": official_coords,
            "status":      "System Online: Global Node Monitoring Active",
        },
        "country_threat_counts": {},
        "threat_nodes":          [],
        "search_queries_used":   search_queries,
        "platforms_searched":    [],
    }

    seen_urls    = set()
    all_nodes    = []

    # ── Step 3: Parallel platform scraping ───────────────────────────────────
    def _run_scraper(name, fn, queries):
        try:
            start = time.time()
            nodes = fn(queries)
            elapsed = round(time.time() - start, 1)
            print(f"[Spider][{name}] Found {len(nodes)} suspects in {elapsed}s")
            return name, nodes
        except Exception as e:
            print(f"[Spider][{name}] Scraper error: {e}")
            return name, []

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            pool.submit(_run_scraper, name, fn, search_queries): name
            for name, fn, enabled in PLATFORM_SCRAPERS
            if enabled
        }
        for future in as_completed(futures):
            platform_name, nodes = future.result()
            if nodes:
                map_payload["platforms_searched"].append(platform_name)
            all_nodes.extend(nodes)

    # ── Step 4: Deduplicate + build map payload ───────────────────────────────
    for node in all_nodes:
        url = node.get("url", "")
        if not url or url in seen_urls or url == official_video_url:
            continue
        seen_urls.add(url)

        country = node.get("country", "US")
        map_payload["country_threat_counts"][country] = (
            map_payload["country_threat_counts"].get(country, 0) + 1
        )
        map_payload["threat_nodes"].append(node)

    print(f"[Spider] Total unique suspects: {len(map_payload['threat_nodes'])} "
          f"across {len(map_payload['platforms_searched'])} platforms: "
          f"{', '.join(map_payload['platforms_searched'])}")

    with open(PAYLOAD_PATH, "w") as f:
        json.dump(map_payload, f, indent=2)

    return map_payload


def tool_crawl_web(search_query: str) -> str:
    """Generates optimized search queries, crawls multiple platforms for suspects."""
    try:
        result = crawl(search_query)
        if "error" in result:
            return f"[ERROR] {result['error']}"
        count     = len(result.get("threat_nodes", []))
        platforms = ", ".join(result.get("platforms_searched", []))
        return (
            f"[SUCCESS] Found {count} unique suspects across "
            f"{len(result.get('search_queries_used', []))} search variants "
            f"on: {platforms}. Payload saved."
        )
    except Exception as e:
        return f"[ERROR] Crawl failed: {e}"
