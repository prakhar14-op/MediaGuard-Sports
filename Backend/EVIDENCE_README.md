Evidence Vault

This folder contains a minimal Evidence Vault implementation and a simple sync client.

Usage:

- Create evidence from your application:

```py
from evidence_vault import create_evidence

eid, entry = create_evidence(
    artifacts={
        "raw_video": "/path/to/video.mp4",
        "frames": "/path/to/frames_dir",
        "embeddings": "/path/to/embeddings.npy",
        "metadata": "/path/to/meta.json",
    },
    metadata={"official_title": "Match X"},
    reviewer="automated_agent",
)
print("Evidence created:", eid)
```

- Run the sync client on a machine with a mounted investigator folder:

```bash
python evidence_sync_client.py /mnt/investigator
```

Chain-of-custody is stored in `vault/evidence_chain.jsonl` as newline-delimited JSON entries.
