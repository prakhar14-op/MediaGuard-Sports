"""Simple sync client that watches for new evidence and syncs to a target directory.

This is a minimal proof-of-concept. In production, replace the filesystem copy with
S3/Dropbox/rsync uploaders and use secure credentials retrieved from a secret manager.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Set

from evidence_vault import list_evidence, sync_evidence


def watch_and_sync(target_mount: str, poll_interval: float = 5.0):
    seen: Set[str] = set()
    while True:
        current = set(list_evidence())
        new = current - seen
        for eid in new:
            try:
                print(f"Syncing evidence {eid} → {target_mount}")
                tgt = sync_evidence(eid, target_mount)
                print(f"Synced to {tgt}")
            except Exception as e:
                print(f"Failed to sync {eid}: {e}")
        seen = current
        time.sleep(poll_interval)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: evidence_sync_client.py /path/to/investigator/mount")
        raise SystemExit(2)
    watch_and_sync(sys.argv[1])
