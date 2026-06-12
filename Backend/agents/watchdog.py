"""
Watchdog — Continuous Piracy Monitoring Service (Dropbox-like Sync)
====================================================================

Once a video is ingested into the vault, the Watchdog ensures it is
CONTINUOUSLY protected — not just at the moment of manual scan.

How it works:
─────────────
1. Maintains a registry of all protected assets (from MongoDB IngestedAsset)
2. Runs periodic sweeps (configurable interval, default: every 6 hours)
3. For each protected asset:
   - Runs Spider crawl (all platforms)
   - Runs Sentinel batch scan on findings
   - For high-confidence matches: triggers alert + evidence packaging
4. Emits Socket.IO events for real-time dashboard updates
5. Stores scan history to avoid re-alerting on same pirate

This is the "always-on" protection layer — like Dropbox sync but for
piracy detection. Once you ingest a video, it stays protected forever.

Architecture:
─────────────
    Watchdog (background thread in FastAPI)
            ↓ every SCAN_INTERVAL_HOURS
    For each protected asset:
        Spider crawl → Sentinel batch → Alert if match
            ↓
    New incidents stored in MongoDB (via Node API)
            ↓
    Socket.IO event → Frontend dashboard real-time notification

Configuration:
─────────────
    WATCHDOG_ENABLED=true           (enable continuous monitoring)
    WATCHDOG_INTERVAL_HOURS=6       (scan interval — 6h default)
    WATCHDOG_ALERT_THRESHOLD=50     (min confidence to alert)
    WATCHDOG_MAX_CONCURRENT=2       (max simultaneous asset scans)
"""

import os
import sys
import time
import json
import threading
import hashlib
from datetime import datetime, timezone
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ─── Configuration ────────────────────────────────────────────────────────────
WATCHDOG_ENABLED        = os.getenv("WATCHDOG_ENABLED", "true").lower() == "true"
SCAN_INTERVAL_HOURS     = float(os.getenv("WATCHDOG_INTERVAL_HOURS", "6"))
ALERT_THRESHOLD         = float(os.getenv("WATCHDOG_ALERT_THRESHOLD", "50"))
MAX_CONCURRENT_SCANS    = int(os.getenv("WATCHDOG_MAX_CONCURRENT", "2"))

# Scan history — prevents re-alerting for same pirate URL
HISTORY_PATH = os.path.join(os.path.dirname(__file__), "..", "vault", "watchdog_history.json")

_watchdog_thread: Optional[threading.Thread] = None
_watchdog_stop  = threading.Event()
_watchdog_paused = threading.Event()   # Set = paused, Clear = running
_scan_history   = {}


def _load_history():
    """Load scan history from disk."""
    global _scan_history
    if os.path.exists(HISTORY_PATH):
        try:
            with open(HISTORY_PATH, "r") as f:
                _scan_history = json.load(f)
        except Exception:
            _scan_history = {}


def _save_history():
    """Save scan history to disk."""
    try:
        tmp = HISTORY_PATH + ".tmp"
        with open(tmp, "w") as f:
            json.dump(_scan_history, f)
        os.replace(tmp, HISTORY_PATH)
    except Exception as e:
        print(f"[Watchdog] History save failed: {e}")


def _url_hash(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:12]


def _is_already_alerted(url: str, confidence: float) -> bool:
    """Check if we already alerted for this pirate URL at similar/higher confidence."""
    h = _url_hash(url)
    entry = _scan_history.get(h)
    if not entry:
        return False
    # Re-alert if confidence increased significantly (>10% higher)
    if confidence > entry.get("confidence", 0) + 10:
        return False
    return True


def _record_alert(url: str, confidence: float, platform: str, account: str):
    """Record that we alerted for this URL."""
    h = _url_hash(url)
    _scan_history[h] = {
        "url":        url[:200],
        "confidence": confidence,
        "platform":   platform,
        "account":    account,
        "alerted_at": datetime.now(timezone.utc).isoformat(),
    }


# ─── Core Scan Logic ──────────────────────────────────────────────────────────

def scan_asset(asset_title: str, asset_url: str) -> dict:
    """
    Run a full Spider + Sentinel sweep for one protected asset.
    Returns: {threats_found, alerts_generated, platforms_searched, details}
    """
    from agents.spider import crawl
    from agents.sentinel import scan_thumbnail

    result = {
        "asset_title":       asset_title,
        "asset_url":         asset_url,
        "scan_time":         datetime.now(timezone.utc).isoformat(),
        "threats_found":     0,
        "alerts_generated":  0,
        "platforms_searched": [],
        "new_detections":    [],
    }

    try:
        # Phase 1: Spider crawl
        hunt_result = crawl(asset_url, official_title=asset_title)
        if "error" in hunt_result:
            result["error"] = hunt_result["error"]
            return result

        threat_nodes = hunt_result.get("threat_nodes", [])
        result["platforms_searched"] = hunt_result.get("platforms_searched", [])
        result["threats_found"] = len(threat_nodes)

        if not threat_nodes:
            return result

        # Phase 2: Batch scan all threats
        nodes_with_thumb = [n for n in threat_nodes if n.get("thumbnail_url")]
        for node in nodes_with_thumb:
            try:
                scan = scan_thumbnail(
                    node.get("thumbnail_url", ""),
                    suspect_video_url=node.get("url", ""),
                    batch_mode=True,
                )
                if scan.get("error"):
                    continue

                confidence = scan.get("confidence_score", 0)
                if confidence < ALERT_THRESHOLD:
                    continue

                url = node.get("url", "")
                if _is_already_alerted(url, confidence):
                    continue

                # New detection above threshold — generate alert
                detection = {
                    "title":          node.get("title", ""),
                    "platform":       node.get("platform", ""),
                    "account_handle": node.get("account_handle", ""),
                    "url":            url,
                    "confidence":     confidence,
                    "match_confirmed": scan.get("match_confirmed", False),
                    "severity":       scan.get("severity", "INFO"),
                    "detected_at":    datetime.now(timezone.utc).isoformat(),
                }
                result["new_detections"].append(detection)
                result["alerts_generated"] += 1

                _record_alert(url, confidence, node.get("platform",""), node.get("account_handle",""))

            except Exception as e:
                print(f"[Watchdog] Scan failed for {node.get('url','')[:50]}: {e}")

        _save_history()

    except Exception as e:
        result["error"] = str(e)
        print(f"[Watchdog] Asset scan failed for '{asset_title}': {e}")

    return result


# ─── Background Loop ──────────────────────────────────────────────────────────

def _watchdog_loop():
    """
    Main watchdog background loop.
    Runs every SCAN_INTERVAL_HOURS, scans all protected assets.
    """
    _load_history()
    print(f"[Watchdog] Started — scanning every {SCAN_INTERVAL_HOURS*60:.0f} min, threshold={ALERT_THRESHOLD}%")

    # Short delay after startup — let system stabilize (30s for hackathon demo)
    _watchdog_stop.wait(timeout=30)
    if _watchdog_stop.is_set():
        return

    while not _watchdog_stop.is_set():
        # Respect pause flag — wait until unpaused
        if _watchdog_paused.is_set():
            print("[Watchdog] Paused (ingest in progress)...")
            while _watchdog_paused.is_set() and not _watchdog_stop.is_set():
                time.sleep(5)
            if _watchdog_stop.is_set():
                break
            print("[Watchdog] Resumed")

        try:
            print(f"[Watchdog] Starting periodic sweep at {datetime.now(timezone.utc).isoformat()}")
            _run_sweep()
        except Exception as e:
            print(f"[Watchdog] Sweep error: {e}")

        # Wait for next interval (or until stopped)
        _watchdog_stop.wait(timeout=SCAN_INTERVAL_HOURS * 3600)


def _run_sweep():
    """
    Single sweep: get all protected assets, scan each.
    Uses Node.js API to get asset list (MongoDB-backed).
    """
    import requests

    node_url = os.getenv("FASTAPI_URL", "http://127.0.0.1:8001").replace(":8001", ":8000")

    # Get all ingested assets from Node API
    try:
        r = requests.get(f"{node_url}/api/ingest", timeout=10)
        if r.status_code != 200:
            print(f"[Watchdog] Could not fetch assets from Node API (status={r.status_code})")
            # Fallback: scan vault files directly
            from agents.archivist import temporal_store
            asset_titles = []
            for key, value in temporal_store.items():
                if not key.endswith("__forensics") and isinstance(value, list):
                    asset_titles.append({"title": key, "url": ""})
            if not asset_titles:
                print("[Watchdog] No assets to monitor")
                return
            assets = asset_titles
        else:
            data = r.json()
            assets = data.get("data", [])
    except Exception as e:
        print(f"[Watchdog] Asset fetch failed: {e}")
        return

    if not assets:
        print("[Watchdog] No protected assets to monitor")
        return

    print(f"[Watchdog] Monitoring {len(assets)} protected assets")

    total_alerts = 0
    for asset in assets:
        title = asset.get("title") or asset.get("video_title") or "Unknown"
        url   = asset.get("official_video_url") or asset.get("url") or ""

        if not title or title == "Unknown":
            continue

        print(f"[Watchdog] Scanning: '{title[:50]}'...")
        result = scan_asset(title, url)
        alerts = result.get("alerts_generated", 0)
        total_alerts += alerts

        if alerts > 0:
            print(f"[Watchdog] ⚠️  {alerts} new alerts for '{title[:40]}'")
            for det in result.get("new_detections", []):
                print(f"[Watchdog]   → [{det['platform']}] @{det['account_handle']} "
                      f"conf={det['confidence']}% {det['severity']}")

            # Push alert to Node API for Socket.IO broadcast
            try:
                requests.post(f"{node_url}/api/watchdog/alert", json={
                    "asset_title":    title,
                    "alerts":         result["new_detections"],
                    "total_found":    result["threats_found"],
                    "platforms":      result["platforms_searched"],
                }, timeout=10)
            except Exception:
                pass  # Non-blocking

        # Rate limit between assets (5s for demo, increase in production)
        if not _watchdog_stop.is_set():
            time.sleep(5)

    print(f"[Watchdog] Sweep complete — {total_alerts} total new alerts across {len(assets)} assets")


# ─── Public API ───────────────────────────────────────────────────────────────

def start_watchdog():
    """Start the watchdog background thread."""
    global _watchdog_thread
    if not WATCHDOG_ENABLED:
        print("[Watchdog] Disabled (WATCHDOG_ENABLED=false)")
        return
    if _watchdog_thread and _watchdog_thread.is_alive():
        print("[Watchdog] Already running")
        return

    _watchdog_stop.clear()
    _watchdog_thread = threading.Thread(target=_watchdog_loop, daemon=True, name="Watchdog")
    _watchdog_thread.start()
    print(f"[Watchdog] Continuous monitoring started (interval={SCAN_INTERVAL_HOURS}h)")


def stop_watchdog():
    """Stop the watchdog gracefully."""
    global _watchdog_thread
    _watchdog_stop.set()
    if _watchdog_thread:
        _watchdog_thread.join(timeout=10)
    print("[Watchdog] Stopped")


def pause_watchdog():
    """Pause watchdog (e.g. during ingest to avoid CPU contention)."""
    _watchdog_paused.set()


def resume_watchdog():
    """Resume watchdog after ingest completes."""
    _watchdog_paused.clear()


def trigger_immediate_scan(asset_title: str = "", asset_url: str = "") -> dict:
    """
    Trigger an immediate scan outside the regular schedule.
    Can scan a specific asset or all assets.
    """
    if asset_title:
        return scan_asset(asset_title, asset_url)
    else:
        # Scan all
        _run_sweep()
        return {"message": "Full sweep triggered"}


def get_watchdog_status() -> dict:
    """Get current watchdog status."""
    _load_history()
    return {
        "enabled":           WATCHDOG_ENABLED,
        "running":           bool(_watchdog_thread and _watchdog_thread.is_alive()),
        "interval_hours":    SCAN_INTERVAL_HOURS,
        "alert_threshold":   ALERT_THRESHOLD,
        "history_entries":   len(_scan_history),
        "last_alert":        max(
            (e.get("alerted_at", "") for e in _scan_history.values()),
            default=None,
        ),
    }


def get_scan_history(limit: int = 50) -> list:
    """Get recent scan history entries."""
    _load_history()
    sorted_entries = sorted(
        _scan_history.values(),
        key=lambda x: x.get("alerted_at", ""),
        reverse=True,
    )
    return sorted_entries[:limit]
