import yt_dlp
ydl = yt_dlp.YoutubeDL({"quiet": True})
ie_list = ydl._ies
platforms = ["youtube", "vimeo", "dailymotion", "tiktok", "twitter", "x.com",
             "instagram", "facebook", "twitch", "reddit", "rumble", "telegram"]
print("yt-dlp extractor support:")
for p in platforms:
    found = any(p in str(ie).lower() for ie in ie_list)
    status = "YES" if found else "NO "
    print(f"  [{status}] {p}")

# Also check YouTube
print()
print("Testing YouTube search (1 result):")
try:
    with yt_dlp.YoutubeDL({"quiet": True, "noplaylist": True}) as ydl2:
        r = ydl2.extract_info("ytsearch1:rick astley never gonna give", download=False)
        entries = r.get("entries", [])
        if entries:
            e = entries[0]
            print(f"  Title: {e.get('title')}")
            print(f"  URL: {e.get('webpage_url')}")
            print(f"  Thumbnail: {e.get('thumbnail', '')[:60]}")
            print("  YOUTUBE: WORKING")
        else:
            print("  YOUTUBE: no results")
except Exception as ex:
    print(f"  YOUTUBE ERROR: {ex}")

# Test Vimeo search
print()
print("Testing Vimeo search:")
try:
    with yt_dlp.YoutubeDL({"quiet": True, "noplaylist": True}) as ydl3:
        r = ydl3.extract_info("https://vimeo.com/search?q=rick+astley", download=False)
        entries = r.get("entries", []) if r else []
        print(f"  VIMEO: {len(entries)} results")
except Exception as ex:
    print(f"  VIMEO ERROR: {ex}")

# Test Dailymotion
print()
print("Testing Dailymotion search (correct URL format):")
try:
    with yt_dlp.YoutubeDL({"quiet": True, "noplaylist": True}) as ydl4:
        r = ydl4.extract_info("https://www.dailymotion.com/search/rick+astley/videos", download=False)
        entries = r.get("entries", []) if r else []
        print(f"  DAILYMOTION URL format: {len(entries)} results")
except Exception as ex:
    print(f"  DAILYMOTION URL ERROR: {ex}")

# Test Reddit API with proper user agent
print()
print("Testing Reddit JSON API:")
import requests
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MediaGuard/1.0",
    "Accept": "application/json",
}
try:
    r = requests.get(
        "https://www.reddit.com/search.json?q=rick+astley&type=link&sort=new&limit=5",
        headers=headers, timeout=15
    )
    print(f"  Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        posts = data.get("data", {}).get("children", [])
        print(f"  Posts: {len(posts)}")
        if posts:
            p = posts[0]["data"]
            print(f"  Sample: {p.get('title','')[:60]}")
            print("  REDDIT: WORKING")
    else:
        print(f"  REDDIT: BLOCKED ({r.status_code})")
except Exception as ex:
    print(f"  REDDIT ERROR: {ex}")
