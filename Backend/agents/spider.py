import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import yt_dlp
import random
import json
import re
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM
from crewai.tools import tool

load_dotenv()

gemini_brain = LLM(
    model="gemini/gemini-2.5-flash",
    temperature=0.4,
    api_key=os.getenv("GEMINI_API_KEY"),
)

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

spider_agent = Agent(
    role="Threat Intelligence Crawler",
    goal="Generate optimized OSINT search queries and map piracy suspects to geographic coordinates for the UI.",
    backstory=(
        "You are a silent, sprawling global OSINT specialist. "
        "You generate smart search variants, scour platforms, deduplicate results, "
        "and map every suspect to a country centroid. Zero disk usage. Maximum coverage."
    ),
    verbose=True,
    allow_delegation=False,
    tools=[],
    llm=gemini_brain,
)


def _generate_search_queries(title: str, official_country: str) -> list[str]:
    prompt = f"""
You are an OSINT specialist hunting for pirated copies of a video titled: "{title}"
The original is from country: {official_country}

Generate exactly 4 search query strings that would find pirated/reposted versions on YouTube.
Think about: common repost title patterns, highlight/clip keywords, language variants, hashtag patterns.
Return ONLY a JSON array of 4 strings. No explanation.
Example: ["query 1", "query 2", "query 3", "query 4"]
"""
    task = Task(
        description=prompt,
        expected_output="A JSON array of 4 search query strings.",
        agent=spider_agent,
    )
    crew   = Crew(agents=[spider_agent], tasks=[task], verbose=False)
    result = str(crew.kickoff())

    match = re.search(r"\[.*?\]", result, re.DOTALL)
    if match:
        try:
            queries = json.loads(match.group())
            return queries[:4] if isinstance(queries, list) else [title]
        except Exception:
            pass
    return [title, f"{title} highlights", f"{title} full video", f"{title} leaked"]


def crawl(official_video_url: str, official_country: str = "US") -> dict:
    ydl_opts = {"quiet": True, "noplaylist": True, "extract_flat": False}

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info             = ydl.extract_info(official_video_url, download=False)
            title            = info.get("title", "Unknown Video")
            official_country = info.get("channel_country") or official_country
    except Exception as e:
        return {"error": f"Could not extract official video metadata: {e}"}

    search_queries  = _generate_search_queries(title, official_country)
    official_coords = COUNTRY_CENTROIDS.get(official_country, COUNTRY_CENTROIDS["US"])

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

    for query in search_queries:
        search_string = f"ytsearch5:{query}"
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
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
                        "search_query":   query,
                    }
                    map_payload["threat_nodes"].append(node)

        except Exception:
            continue

    with open(PAYLOAD_PATH, "w") as f:
        json.dump(map_payload, f, indent=2)

    return map_payload


@tool("Crawl and Extract Metadata")
def tool_crawl_web(search_query: str) -> str:
    try:
        result = crawl(search_query)
        if "error" in result:
            return f"[ERROR] {result['error']}"
        count = len(result.get("threat_nodes", []))
        return f"[SUCCESS] Found {count} unique suspects across {len(result.get('search_queries_used', []))} search variants. Payload saved."
    except Exception as e:
        return f"[ERROR] Crawl failed: {e}"


spider_agent.tools = [tool_crawl_web]
