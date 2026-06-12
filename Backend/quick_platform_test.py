"""Quick platform verification — tests fast platforms first."""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.spider import (
    _scrape_youtube, _scrape_dailymotion, _scrape_reddit,
    _scrape_rumble, _scrape_vimeo, _scrape_torrents,
    _scrape_twitter, _scrape_telegram
)

Q = ["rick astley never gonna give you up"]

def test(name, fn):
    t0 = time.time()
    try:
        nodes = fn(Q)
        t = round(time.time()-t0, 1)
        if nodes:
            n = nodes[0]
            thumb = "✅" if n.get("thumbnail_url") else "❌"
            print(f"  ✅ {name:<15} {len(nodes):2d} results | URL:✅ Thumb:{thumb} | {t}s")
            print(f"     Sample: {n.get('url','')[:65]}")
        else:
            print(f"  ❌ {name:<15} 0 results in {time.time()-t0:.1f}s")
    except Exception as e:
        print(f"  ❌ {name:<15} ERROR: {str(e)[:70]}")

print("=== PLATFORM QUICK TEST ===")
print()
test("YouTube",     _scrape_youtube)
test("Dailymotion", _scrape_dailymotion)
test("Reddit",      _scrape_reddit)
test("Rumble",      _scrape_rumble)
test("Vimeo",       _scrape_vimeo)
test("Twitter/X",   _scrape_twitter)
test("Telegram",    _scrape_telegram)
test("Torrents",    _scrape_torrents)
print("\nDone.")
