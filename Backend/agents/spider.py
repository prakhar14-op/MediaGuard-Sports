import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import yt_dlp
import random
import json
import re
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

# yt-dlp options reused for both metadata extraction and search
_YDL_OPTS = {"quiet": True, "noplaylist": True, "extract_flat": False}


def _fallback_queries(title: str) -> list[str]:
    """Rule-based query generation — used when LLM is unavailable."""
    base = title.strip()
    return [
        base,
        f"{base} full video",
        f"{base} highlights",
        f"{base} leaked stream",
    ]


def _generate_search_queries(title: str, official_country: str) -> list[str]:
    """Ask the LLM for smart OSINT queries. Falls back to rule-based if LLM fails."""
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    prompt = (
        f'You are an OSINT specialist hunting for pirated copies of a video titled: "{title}"\n'
        f"The original is from country: {official_country}\n\n"
        f"Generate exactly 4 YouTube search query strings to find pirated/reposted versions.\n"
        f"Rules:\n"
        f"- Plain search terms only — NO site: operators, NO quotes around the whole query\n"
        f"- Think: restream keywords, 'full match', 'full video', 'leaked', language variants\n"
        f"- Each query should be 3-6 words max\n"
        f"Return ONLY a JSON array of 4 strings. No explanation.\n"
        f'Example: ["champions league final full", "ucl final restream 2024", "champions league leaked stream", "final match full hd"]'
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


def crawl(official_video_url: str, official_country: str = "US", official_title: str = "") -> dict:
    """
    Crawl YouTube for pirated copies of the given official video.

    official_title: if provided (e.g. from a Drive/direct link ingest), skip yt-dlp
                    metadata extraction and use this title directly for search queries.
    """
    # ── Step 1: Get title and country ─────────────────────────────────────────
    if official_title:
        # Title provided externally — no yt-dlp metadata needed
        title           = official_title
        official_coords = COUNTRY_CENTROIDS.get(official_country, COUNTRY_CENTROIDS["US"])
    else:
        # Extract title from the URL via yt-dlp
        try:
            with yt_dlp.YoutubeDL(_YDL_OPTS) as ydl:
                info             = ydl.extract_info(official_video_url, download=False)
                title            = info.get("title", "Unknown Video")
                official_country = info.get("channel_country") or official_country
        except Exception as e:
            # Non-YouTube URL or yt-dlp failed — use URL filename as fallback
            print(f"[Spider] yt-dlp metadata extraction failed: {e}")
            fallback = official_video_url.split("/")[-1].split("?")[0].rsplit(".", 1)[0]
            title = fallback if fallback and len(fallback) > 3 else None
            if not title:
                return {"error": "Could not extract video metadata. For non-YouTube URLs, provide official_title."}
        official_coords = COUNTRY_CENTROIDS.get(official_country, COUNTRY_CENTROIDS["US"])

    # ── Step 2: Generate search queries ──────────────────────────────────────
    search_queries = _generate_search_queries(title, official_country)

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
    }

    seen_urls = set()

    # ── Step 3: Search YouTube for suspects ───────────────────────────────────
    for query in search_queries:
        search_string = f"ytsearch5:{query}"
        try:
            with yt_dlp.YoutubeDL(_YDL_OPTS) as ydl:
                results = ydl.extract_info(search_string, download=False)
                entries = results.get("entries", []) if results else []

                for entry in entries:
                    url = entry.get("webpage_url", "")
                    if not url or url in seen_urls or url == official_video_url:
                        continue
                    seen_urls.add(url)

                    country = entry.get("channel_country")
                    if not country or country not in COUNTRY_CENTROIDS:
                        country = random.choice(list(COUNTRY_CENTROIDS.keys()))

                    map_payload["country_threat_counts"][country] = (
                        map_payload["country_threat_counts"].get(country, 0) + 1
                    )

                    description = entry.get("description") or ""
                    node = {
                        "title":          entry.get("title", "Unknown Title"),
                        "platform":       "YouTube",
                        "account_handle": entry.get("uploader", "Unknown_Uploader"),
                        "url":            url,
                        "thumbnail_url":  entry.get("thumbnail", ""),
                        "country":        country,
                        "coordinates":    COUNTRY_CENTROIDS[country],
                        "view_count":     entry.get("view_count", 0),
                        "description":    description[:300],
                        # search_query intentionally omitted — swarmController strips it anyway
                    }
                    map_payload["threat_nodes"].append(node)

        except Exception:
            continue

    with open(PAYLOAD_PATH, "w") as f:
        json.dump(map_payload, f, indent=2)

    return map_payload


def tool_crawl_web(search_query: str) -> str:
    """Generates optimized search queries, crawls YouTube for suspects, maps them to country centroids."""
    try:
        result = crawl(search_query)
        if "error" in result:
            return f"[ERROR] {result['error']}"
        count = len(result.get("threat_nodes", []))
        return f"[SUCCESS] Found {count} unique suspects across {len(result.get('search_queries_used', []))} search variants. Payload saved."
    except Exception as e:
        return f"[ERROR] Crawl failed: {e}"
