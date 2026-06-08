# MediaGuard Sports 🛡️

**Autonomous AI-powered sports media rights enforcement platform.**

MediaGuard Sports is a full-stack, production-deployed system that detects, classifies, and autonomously enforces intellectual property violations against live sports broadcasts in real time. It runs a five-agent AI pipeline — from crawling the web for pirated content to drafting legally compliant DMCA notices and minting revenue-sharing smart contracts — entirely without human intervention, then surfaces everything through a real-time dashboard for human review and approval.

**Live Demo:** https://mediaguard-sports-bc615.web.app

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Architecture Overview](#architecture-overview)
3. [The Five-Agent Pipeline](#the-five-agent-pipeline)
4. [Backend — FastAPI (ML Engine)](#backend--fastapi-ml-engine)
5. [Backend — Node.js (Orchestration API)](#backend--nodejs-orchestration-api)
6. [Database Models](#database-models)
7. [Frontend — React Dashboard](#frontend--react-dashboard)
8. [Real-Time Layer — Socket.IO](#real-time-layer--socketio)
9. [Tech Stack](#tech-stack)
10. [Environment Variables](#environment-variables)
11. [Local Development](#local-development)
12. [Deployment](#deployment)
13. [API Reference](#api-reference)

---

## Problem Statement

Live sports broadcasts are routinely pirated across YouTube, TikTok, Telegram, and other platforms in real time. Rights holders face two problems:

1. **Speed** — Manual DMCA processes take days. A 90-minute match is over before a notice is processed.
2. **Scale** — A single event may have hundreds of simultaneous unauthorized streams across dozens of accounts.

MediaGuard Sports solves both by automating the entire detection-to-enforcement pipeline with sub-minute latency, operating autonomously 24/7.

---

## Architecture Overview

The system has three independently deployed services that communicate over HTTP and WebSockets:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (Firebase)                        │
│  Dashboard │ Asset Vault │ Threat Hunter │ Incident Table │ Broker Panel │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │  REST + Socket.IO
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Node.js Orchestration API (Render)                  │
│  Express + Socket.IO │ MongoDB │ Redis │ Swarm Orchestrator             │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │  Internal HTTP (axios)
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      FastAPI ML Engine (Render)                         │
│  CLIP ViT-B/32 │ FAISS │ yt-dlp │ LLM Agents (Groq / Gemini)            │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data stores:**
- **MongoDB Atlas** — persistent storage for all incidents, DMCA records, contracts, hunt jobs, ingested assets
- **Redis** — adjudicator verdict cache (24h TTL), repeat offence counters (90-day TTL), threat velocity tracking (7-day TTL)
- **FAISS** — in-process vector database for video frame embeddings (512-dim CLIP ViT-B/32 features)
- **File system** (`/tmp`) — persistent job state for ingest jobs across server restarts

---

## The Five-Agent Pipeline

The core of MediaGuard is an autonomous five-phase swarm that runs sequentially. Each phase emits real-time Socket.IO events to the frontend dashboard.

### Phase 1 — Spider 🕷️

**File:** `Backend/agents/spider.py`

The Spider is an OSINT agent that finds pirated copies of an official video across the web.

**How it works:**
1. Accepts an official video URL and optional title
2. If no title is provided, uses yt-dlp to extract metadata from the URL. On cloud IPs where YouTube blocks yt-dlp with bot detection, falls back to extracting the title from the URL path or video ID
3. Calls a Groq/Gemini LLM to generate 4 targeted OSINT search queries (e.g. `"champions league final full"`, `"ucl final restream 2024"`) — much more effective than naive keyword search
4. If LLM fails, falls back to rule-based query generation (`{title} full video`, `{title} highlights`, `{title} leaked stream`)
5. Runs each query through `yt-dlp`'s `ytsearch5:` syntax to find up to 5 YouTube results per query
6. Deduplicates results, maps each suspect to a geographic country centroid (30 countries supported)
7. Returns a `map_payload` with threat nodes containing: title, uploader, URL, thumbnail, country, coordinates, view count, description

**LLM model:** `llama-3.1-8b-instant` (Groq) or `gemini-2.0-flash-lite` (fallback)

**Output:** Up to 20 unique suspect URLs with metadata, saved to `assets/suspects/spider_payload.json`

---

### Phase 2 — Sentinel 👁️

**File:** `Backend/agents/sentinel.py`

The Sentinel is the visual fingerprinting agent that determines whether a suspect video contains stolen content.

**How it works:**
1. Receives all suspect nodes from Spider
2. For each YouTube thumbnail URL, tries 4 resolution variants: `maxresdefault` → `hqdefault` → `mqdefault` → original. Higher-res thumbnails contain actual footage frames rather than designed artwork, improving match accuracy
3. Embeds each thumbnail via CLIP ViT-B/32 (512-dim, L2-normalised) — the same model used during ingest
4. Searches the FAISS vault using inner product (= cosine similarity after L2 normalisation)
5. Keeps the best similarity score across all resolution variants

**Two-layer detection:**

**Layer 1 — CLIP cosine similarity:**
- `≥ 0.90` → `CRITICAL` — confirmed match, high visual overlap
- `≥ 0.75` → `WARNING` — suspect, flagged for adjudication
- `< 0.75` → `INFO` — no significant match

**Layer 2 — pHash cross-check:**
For any candidate above the suspect threshold, a perceptual hash (pHash) comparison is run against the matched vault frame. A hash distance < 15 confirms a pixel-level match (`phash_match = true`). This serves as a secondary verification layer and increases legal defensibility.

**Batch processing:** The FastAPI `/scan/batch` endpoint processes all suspects in parallel using a `ThreadPoolExecutor` with up to 8 workers. The I/O-bound thumbnail fetching benefits significantly from parallelism even though the embedding is CPU-bound.

**Velocity tracking:** Redis tracks how many times each account handle has been flagged within a 7-day window. Velocity ≥ 3 escalates any severity to `CRITICAL` regardless of confidence score, catching repeat offenders.

**Output per suspect:**
```json
{
  "match_confirmed": true,
  "confidence_score": 91.4,
  "l2_distance": 0.086,
  "severity": "CRITICAL",
  "phash_match": true,
  "phash_score": 88,
  "top_matches": [{ "vault_index": 47, "similarity": 0.914, "timestamp_sec": 1410 }]
}
```

---

### Phase 3 — Adjudicator ⚖️

**File:** `Backend/agents/adjudicator.py`

The Adjudicator is a legal classification agent that determines whether a flagged video constitutes piracy or legitimate fair use, and routes the incident to the appropriate next agent.

**How it works:**
1. Only processes incidents with confidence score ≥ 55 (configurable threshold). Lower-confidence suspects are auto-cleared without wasting LLM quota
2. Checks Redis cache first — same account + platform + title = same ruling. Cache TTL is 24 hours
3. Builds a structured prompt with all incident context: sentinel report, platform, account handle, video title, description (truncated to 400 chars), country, confidence score
4. Calls LLM with strict JSON output format

**LLM fallback chain:**
- Attempt 1: `llama-3.1-8b-instant` (Groq, 20k TPM — best for batch)
- Attempt 2: `llama-3.3-70b-versatile` (Groq, higher quality, 6k TPM — wait 15s)
- Attempt 3: `gemini-2.0-flash-lite` (Google — last resort)

**Low-confidence leniency:** If sentinel confidence < 70%, and the LLM routes to Enforcer, the verdict is automatically downgraded to Broker with a recommendation for human review before issuing DMCA.

**Output verdict:**
```json
{
  "classification": "SEVERE PIRACY",
  "risk_score": 87,
  "justification": "Exact broadcast re-stream with identical audio fingerprint...",
  "routing": "Enforcer",
  "legal_basis": "17 U.S.C. § 106 — exclusive reproduction right",
  "recommended_action": "Issue expedited DMCA takedown"
}
```

**Routing:**
- `"Enforcer"` → incident goes to Phase 4 (DMCA)
- `"Broker"` → incident goes to Phase 5 (rev-share contract)

---

### Phase 4 — Enforcer 🔨

**File:** `Backend/agents/enforcer.py`

The Enforcer drafts legally compliant DMCA takedown notices for confirmed piracy incidents.

**How it works:**
1. Tracks repeat offences per `(account, platform)` pair in Redis with a 90-day TTL
2. Builds a detailed prompt with all incident metadata and legal context
3. Calls LLM to draft a full DMCA notice citing 17 U.S.C. § 512(c)
4. The notice includes:
   - Formal header (To/From/Date/Re)
   - Statement of authority
   - Description of infringement with evidence
   - Reference to FAISS vector proof (integrity hash)
   - Action requested (removal + account strike)
   - For offence ≥ 2: cites 17 U.S.C. § 512(i) repeat infringer policy
   - For offence ≥ 3: adds referral to legal counsel
   - Signature block

**Tier escalation based on repeat offences:**
- Offence 1 → `standard`
- Offence 2 → `expedited`
- Offence 3+ → `legal_referral`

**Platform legal contacts are hardcoded:**
- YouTube: `copyright@youtube.com`
- TikTok: `legal@tiktok.com`
- Twitter: `copyright@twitter.com`
- Instagram: `ip@instagram.com`
- Telegram: `dmca@telegram.org`
- Reddit: `copyright@reddit.com`

**LLM model:** `llama-3.3-70b-versatile` (preferred for DMCA quality) with 8b fallback

**Human-in-the-loop:** Notices are drafted and stored as `status: "drafted"`. A human must click "Approve & Send" in the dashboard before the status becomes `"sent"`. Rejecting a notice decrements the offence counter and clears the incident.

**Integrity hash:** A SHA-256 hash of `{notice_text, target_account, platform}` is generated and stored for legal audit trail purposes.

---

### Phase 5 — Broker 💰

**File:** `Backend/agents/broker.py`

The Broker handles fair use / fan content cases by minting revenue-sharing smart contracts instead of issuing takedowns.

**How it works:**
1. Calculates content tier based on view count:
   - `Bronze` < 10k views
   - `Silver` 10k–100k
   - `Gold` 100k–1M
   - `Platinum` ≥ 1M views

2. Recommends a revenue split based on tier and adjudicator risk score:
   - Bronze: 35% holder / 65% creator (base)
   - Risk score > 50 shifts the split toward the holder by 2% per 10 risk points (capped at 49%)

3. Estimates monthly licensing revenue using platform CPM rates:
   - YouTube: $0.60/1000 views (≈13% of YouTube's $4.50 CPM)
   - TikTok: $0.004/1000 views
   - Instagram: $0.20/1000 views
   - Capped at $500/mo per deal

4. Calls LLM to draft the full smart contract licensing agreement as structured JSON:
   - Contract title, duration (6–24 months), payment schedule
   - Terms, dispute resolution, special tier-specific clauses
   - IP holder monthly cut estimate

5. Generates a mock Polygon transaction hash (`0x` + 32 random bytes) and stores the contract

**Human-in-the-loop:** Contracts are minted as `status: "minted"` and require human activation. A human must click "Activate Contract" to transition it to `"active"`. Contracts can also be disputed, which returns the incident to review status.

---

## Backend — FastAPI (ML Engine)

**File:** `Backend/main.py`  
**Port:** 8001  
**Dockerfile:** `Backend/Dockerfile.fastapi`

The FastAPI service is the ML execution layer. It handles all computationally intensive operations: video downloading, frame embedding, vector search, and LLM calls for agents.

### Video Ingest — `POST /ingest`

The ingest endpoint is fully asynchronous. It:
1. Returns immediately with a `job_id`
2. Spawns a daemon thread for the actual work
3. Detects whether the URL is a direct file (`.mp4`, Google Drive, S3, CDN) or a platform URL (YouTube, etc.)

**For direct URLs / Google Drive:**
- Converts Google Drive share URLs to direct download URLs automatically
- Streams the download in 1MB chunks
- Validates that the downloaded file is actually a video (rejects HTML responses)

**For platform URLs (YouTube etc.):**
- Uses `yt-dlp` with optional YouTube cookies (`YOUTUBE_COOKIES_B64` env var, base64-encoded Netscape cookie file)
- Handles bot detection on cloud IPs by using cookies and falling back gracefully

**Frame embedding:**
- Extracts 1 frame every 30 seconds (configurable via `SAMPLE_EVERY_N_SECS`)
- Resizes to 224px before embedding (reduces memory per frame)
- Batches 32 frames per CLIP ViT-B/32 inference call (configurable via `BATCH_SIZE`)
- Logs progress every 50 frames

**Job persistence:**
- Job state is written to `/tmp/mediaguard_jobs/{job_id}.json` using atomic writes (write to `.tmp` then `os.replace`)
- Survives Render process restarts — the in-memory dict approach was replaced after it caused infinite polling loops on cold starts

**Poll endpoint:** `GET /ingest/status/{job_id}` returns current status: `downloading` → `processing` → `complete` / `failed`

### FAISS Vault

- `IndexFlatIP(512)` — inner product index, 512 dimensions (CLIP ViT-B/32 output)
- After L2 normalisation, inner product equals cosine similarity
- Vault is persisted to `vault/faiss_vault.index` using atomic writes
- Metadata (video path, timestamp) stored in `vault/vault_metadata.json`
- On startup, loads existing vault if dimension matches (512), otherwise starts fresh

### Archivist — `Backend/agents/archivist.py`

The Archivist manages the FAISS vault and all embedding operations using CLIP ViT-B/32.

**CLIP ViT-B/32 choice:**
- CLIP ViT-B/32 produces superior semantic visual embeddings for piracy detection.
- Raw 512-dim features (no projection) are L2-normalised and stored in FAISS.
- Pre-downloaded at Docker build time to avoid runtime network calls.

**Lazy loading:** The model loads on first ingest or scan call, not at import time. This prevents OOM during server startup health checks.

### Debug Endpoints

- `GET /debug/cookies` — verify YouTube cookie configuration
- `GET /debug/sentinel?thumbnail_url=...` — raw similarity scan for threshold tuning
- `GET /vault/status` — current vault size

---

## Backend — Node.js (Orchestration API)

**File:** `Backend/server/app.js`  
**Port:** 8000  
**Dockerfile:** `Backend/Dockerfile.node`

The Node.js service is the orchestration layer. It:
- Serves as the API gateway for the React frontend
- Orchestrates the five-agent swarm via `swarmController.js`
- Manages all MongoDB persistence
- Broadcasts real-time events via Socket.IO
- Implements human-in-the-loop approval flows for DMCA notices and contracts
- Keeps itself and FastAPI alive on Render free tier via a self-ping every 14 minutes

### Routes

| Route | Controller | Description |
|---|---|---|
| `POST /api/swarm/run` | swarmController | Launch autonomous 5-phase swarm |
| `POST /api/ingest` | archivistController | Ingest official video |
| `GET /api/ingest` | archivistController | List all ingested assets |
| `GET /api/ingest/:id` | archivistController | Get asset by ID |
| `DELETE /api/ingest/:id` | archivistController | Delete asset and video file |
| `POST /api/scan` | sentinelController | Scan single thumbnail |
| `POST /api/scan/batch` | sentinelController | Batch scan (used by swarm) |
| `GET /api/incidents` | sentinelController | List incidents with filters |
| `GET /api/incidents/:id` | sentinelController | Get incident with populated refs |
| `POST /api/adjudicate` | adjudicatorController | Adjudicate single incident |
| `POST /api/adjudicate/batch` | adjudicatorController | Batch adjudicate |
| `GET /api/adjudicate/:id` | adjudicatorController | Get verdict for incident |
| `POST /api/enforce` | enforcerController | Draft DMCA notice |
| `PATCH /api/enforce/:id/approve` | enforcerController | Approve & send DMCA |
| `PATCH /api/enforce/:id/reject` | enforcerController | Reject DMCA (clears incident) |
| `GET /api/enforce` | enforcerController | List DMCA records |
| `POST /api/broker` | brokerController | Mint rev-share contract |
| `PATCH /api/broker/:id/activate` | brokerController | Activate contract |
| `PATCH /api/broker/:id/dispute` | brokerController | Dispute contract |
| `GET /api/broker` | brokerController | List contracts |
| `GET /api/health` | app.js | Health check (node/redis/fastapi/mongo) |

### Swarm Orchestrator — `swarmController.js`

The swarm controller is the brain of the operation. It:

1. Creates a `HuntJob` document immediately and responds with `jobId`
2. Joins all clients to a Socket.IO room `hunt:{jobId}` for isolated event delivery
3. Runs all 5 phases sequentially, emitting progress events after each step
4. Implements Redis-backed verdict caching — same `(account, platform, title)` = reuse cached verdict
5. Auto-clears low-confidence suspects (< 55%) without calling the Adjudicator
6. Handles all failures gracefully — individual agent failures don't abort the whole swarm

**Title resolution priority:** User-provided title → previously ingested asset title → Spider extracts from URL. This allows YouTube URLs to be used for swarm hunting without triggering bot detection on the metadata extraction step.

---

## Database Models

All models use Mongoose with MongoDB Atlas.

### `IngestedAsset`
Stores metadata for every official video that has been fingerprinted.
```
official_video_url, title, local_path, frame_count, vault_size,
tx_hash, integrity_hash, status (downloading/processing/complete/failed),
error_message, createdAt
```

### `HuntJob`
Tracks each swarm execution.
```
jobId, official_video_url, status (queued/processing/complete/failed),
official_source {country, coordinates}, threat_count, piracy_count,
fair_use_count, error_message, completed_at, createdAt
```

### `Incident`
Created for every suspect found by Sentinel. The central record linking all pipeline stages.
```
jobId, title, platform, account_handle, url, thumbnail_url,
country, coordinates {lat, lng}, confidence_score, severity (INFO/WARNING/CRITICAL),
classification (UNREVIEWED/SEVERE PIRACY/FAIR USE / FAN CONTENT),
adjudicator_justification, status (detected/reviewing/takedown_pending/
takedown_sent/monetized/cleared), dmca_record_id, contract_record_id, createdAt
```

### `DMCARecord`
Stores drafted and sent DMCA notices.
```
incident_id, target_account, platform, confidence_score, notice_text,
integrity_hash, tier (standard/expedited/legal_referral), offence_number,
legal_contact, status (drafted/sent/rejected), sent_at, createdAt
```

### `ContractRecord`
Stores rev-share licensing contracts.
```
incident_id, target_account, platform, video_title,
copyright_holder_share, creator_share, tx_hash, network,
receipt (JSON), integrity_hash, tier (Bronze/Silver/Gold/Platinum),
estimated_monthly_revenue, status (minted/active/disputed), createdAt
```

---

## Frontend — React Dashboard

**Framework:** React 19 + Vite  
**Styling:** Inline styles (consistent design token system using a `G` object for colors)  
**State:** React Context (DashboardContext + SocketContext)  
**Routing:** React Router v7  
**Charts:** Recharts  
**Maps:** React Leaflet  
**Animations:** Framer Motion  
**Real-time:** Socket.IO client  

### Pages

**Dashboard (`/`)** — Main page containing all dashboard panels. Manages layout and renders all components.

### Components

#### Asset Vault (`AssetVault.jsx`)
The ingestion interface. Allows rights holders to register official content into the FAISS fingerprint vault.

- URL input accepts YouTube URLs, Google Drive share links, direct `.mp4`/`.webm` URLs, Dropbox, S3, CloudFront
- For non-YouTube URLs, shows a title input field (required for Spider to generate search queries)
- Shows a 4-stage progress timeline: `queued` → `downloading` → `processing` → `complete`
- Socket.IO listener for `ingest:progress`, `ingest:complete`, `ingest:error` events
- Polling fallback every 15s via `archivistService.getById()` in case socket events are missed
- Asset cards show: thumbnail, status badge (PROTECTED/PROCESSING/FAILED), frame count, vault vectors, integrity hash, Polygon TX hash, ingest date
- Delete confirmation dialog with warning about FAISS vector deletion

#### Threat Hunter (`ThreatHunter.jsx`)
The swarm launch interface and live monitoring panel.

- URL input + optional title field (auto-fills from ingested assets when URL matches)
- 5-phase progress bar with animated icons for each agent
- Live agent feed terminal (dark theme) showing real-time Socket.IO events with timestamps
- Summary grid showing: suspects found, piracy count, DMCA drafted, contracts minted
- Integrated Leaflet map (`ThreatMap`) showing global threat node distribution
- Confidence chart (Recharts AreaChart) showing confidence scores over time as incidents arrive

#### Incident Table (`IncidentTable.jsx`)
Filterable table of all detected incidents.

- Filter by severity (CRITICAL/WARNING/INFO), status, and platform
- Color-coded severity badges
- Shows: title, platform, account handle, confidence score, status, coordinates
- Links to individual incident actions (adjudicate, enforce, broker)

#### Analytics (`Analytics.jsx`)
Statistics dashboard with charts.

- Total detections, critical threats, revenue protected, assets in vault
- Platform breakdown charts
- Severity distribution
- Timeline of detections

#### Broker Panel (`BrokerPanel.jsx`)
Revenue-sharing contract management interface.

- Lists all minted contracts with tier badges (Bronze/Silver/Gold/Platinum)
- Shows copyright holder share vs creator share
- Estimated monthly revenue per contract
- "Activate Contract" and "Dispute" actions
- Transaction hash display

#### Sidebar (`Sidebar.jsx`)
Navigation sidebar with links to all dashboard sections and notification badge.

#### Header (`Header.jsx`)
Top navigation bar with backend connection status indicator and notification bell with dropdown.

### Context System

#### `DashboardContext.jsx`
The central application state. Provides:
- **Data:** `incidents`, `assets`, `dmcas`, `contracts`, `stats`
- **Swarm state:** `activeJobId`, `swarmPhase`, `swarmRunning`, `swarmComplete`
- **Backend status:** `backendOnline`, `loading`
- **Actions:** `refresh()`, `addNotification()`, `joinRoom()`, `joinIngest()`
- **Mock fallback:** When backend is offline, displays 4 mock incidents so the UI is never empty
- **Socket event handler:** Maps all 20+ Socket.IO event types to state mutations and toast notifications

**Toast notification system:**
- 🚨 Red — threat detected (CRITICAL severity)
- 🤖 Blue — agent activity (phase transitions, verdicts)
- ✅ Green — success (ingest complete, DMCA sent, contract activated)

#### `SocketContext.jsx`
Manages the Socket.IO connection lifecycle.
- Connects to `VITE_API_URL` or `localhost:8000`
- 10-second connection timeout, 10 reconnection attempts
- Maintains an `eventLog` of up to 300 events (newest first)
- `joinRoom(jobId)` — joins `hunt:{jobId}` room for isolated swarm events
- `joinIngest(jobId)` — joins ingest room
- Deferred join if socket isn't connected yet (queues on `connect` event)

---

## Real-Time Layer — Socket.IO

The Node.js server uses Socket.IO with named rooms for event isolation. Each swarm job gets its own room `hunt:{jobId}`, so multiple concurrent swarms don't cross-pollinate events.

### Event Reference

| Event | Direction | Payload |
|---|---|---|
| `swarm:phase` | Server → Client | `{jobId, phase, agent, message}` |
| `swarm:complete` | Server → Client | `{jobId, total_suspects, piracy_count, fair_use_count, dmca_drafted, contracts_minted}` |
| `swarm:error` | Server → Client | `{jobId, message}` |
| `spider:complete` | Server → Client | `{jobId, official_source, threat_nodes, country_threat_counts, total}` |
| `sentinel:threat_found` | Server → Client | `{incidentId, title, platform, account_handle, confidence_score, severity, match_confirmed, coordinates, velocity}` |
| `sentinel:batch_complete` | Server → Client | `{jobId, total, piracy_count, fair_use_count}` |
| `adjudicator:thinking` | Server → Client | `{incident_id, message}` |
| `adjudicator:verdict` | Server → Client | `{incident_id, verdict, next_agent}` |
| `adjudicator:batch_complete` | Server → Client | `{jobId, total, enforcer_count, broker_count}` |
| `enforcer:notice_ready` | Server → Client | `{incident_id, dmca_id, tier, offence_number, legal_contact, notice_preview}` |
| `enforcer:dmca_sent` | Server → Client | `{dmca_id, incident_id, target_account, platform}` |
| `broker:contract_ready` | Server → Client | `{incident_id, contract_id, tier, copyright_holder_share, creator_share, tx_hash, estimated_monthly_revenue}` |
| `broker:contract_activated` | Server → Client | `{contract_id, incident_id, tx_hash}` |
| `ingest:progress` | Server → Client | `{jobId, assetId, stage, message}` |
| `ingest:complete` | Server → Client | `{jobId, assetId, title, frame_count, vault_size, tx_hash, integrity_hash}` |
| `ingest:error` | Server → Client | `{jobId, assetId, message}` |
| `join:hunt` | Client → Server | `jobId` |
| `join:ingest` | Client → Server | `jobId` |

---

## Tech Stack

### ML Backend (FastAPI)
| Component | Technology |
|---|---|
| Web framework | FastAPI + Uvicorn |
| Video download | yt-dlp (with Node.js 20 for YouTube JS extraction) |
| Frame extraction | OpenCV (opencv-python-headless) |
| Image embedding | CLIP ViT-B/32 (transformers, PyTorch CPU) |
| Vector search | FAISS (faiss-cpu, IndexFlatIP 512-dim) |
| Perceptual hashing | ImageHash (pHash) |
| LLM — primary | Groq (llama-3.1-8b-instant, llama-3.3-70b-versatile) |
| LLM — fallback | Google Gemini (gemini-2.0-flash-lite) |
| Containerisation | Docker (python:3.11-slim + Node.js 20) |

### Orchestration Backend (Node.js)
| Component | Technology |
|---|---|
| Web framework | Express.js |
| Real-time | Socket.IO |
| Database | MongoDB (Mongoose ODM) |
| Cache / counters | Redis (ioredis) |
| HTTP client | axios |
| ID generation | uuid v4 |
| Validation | Joi |

### Frontend (React)
| Component | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Routing | React Router v7 |
| Charts | Recharts |
| Maps | React Leaflet + Leaflet |
| Animations | Framer Motion |
| Icons | Lucide React |
| HTTP | axios |
| Real-time | socket.io-client |
| Notifications | react-hot-toast |
| Hosting | Firebase Hosting |

---

## Environment Variables

### Backend `.env` (shared by Node.js and FastAPI)

```env
# Database
MONGODB_URI=mongodb+srv://...

# Redis (optional — system degrades gracefully without it)
REDIS_URL=redis://...

# LLM APIs (at least one required)
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...

# Service URLs
FASTAPI_URL=http://localhost:8001        # Node → FastAPI internal URL
CLIENT_URL=https://your-frontend.web.app # CORS allowed origin

# YouTube cookies (optional — helps bypass bot detection on cloud IPs)
# Base64-encoded Netscape cookie file: base64 -w 0 cookies.txt
YOUTUBE_COOKIES_B64=...

# Render keepalive
RENDER_EXTERNAL_URL=https://mediaguard-node.onrender.com
NODE_ENV=production

# Optional proxy for yt-dlp
PROXY_URL=
```

### Frontend `.env.production`

```env
VITE_API_URL=https://mediaguard-node.onrender.com
```

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB (local or Atlas)
- Redis (local or cloud)

### Setup

**1. Clone and install**
```bash
git clone https://github.com/your-repo/MediaGuard-Sports.git
cd MediaGuard-Sports
```

**2. FastAPI backend**
```bash
cd Backend
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**3. Node.js backend**
```bash
cd Backend/server
npm install
node --watch app.js
```

**4. Frontend**
```bash
cd Frontend
npm install
npm run dev
```

Services run on:
- FastAPI: `http://localhost:8001`
- Node.js: `http://localhost:8000`
- Frontend: `http://localhost:5173`

---

## Deployment

### Current Production Setup

| Service | Platform | URL |
|---|---|---|
| Frontend | Firebase Hosting | https://mediaguard-sports-bc615.web.app |
| Node.js API | Render (free tier) | https://mediaguard-node.onrender.com |
| FastAPI ML | Render (free tier) | https://mediaguard-fastapi.onrender.com |
| Database | MongoDB Atlas | — |
| Cache | Redis Cloud | — |

### Render Free Tier Notes

Both backend services on Render's free tier sleep after 15 minutes of inactivity. The Node.js server includes a self-ping keepalive that pings both services every 14 minutes to prevent cold starts. Set `RENDER_EXTERNAL_URL` on Render to enable this.

For consistent uptime, upgrade to Render's paid tier ($7/mo per service) or configure UptimeRobot to ping both health endpoints every 5 minutes:
- `https://mediaguard-node.onrender.com/api/health`
- `https://mediaguard-fastapi.onrender.com/`

### Firebase Hosting Deploy

```bash
cd Frontend
npm run build
npx firebase-tools deploy --only hosting
```

### Render Deploy
Push to the `main` branch — Render auto-deploys from the configured Dockerfile path.

---

## API Reference

### FastAPI Direct Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check + vault size |
| GET | `/vault/status` | FAISS vault status |
| POST | `/ingest` | Start async video ingest |
| GET | `/ingest/status/{job_id}` | Poll ingest job status |
| POST | `/hunt` | Crawl YouTube for suspects |
| POST | `/scan` | Scan single thumbnail |
| POST | `/scan/batch` | Batch scan thumbnails |
| POST | `/adjudicate` | LLM classification |
| POST | `/adjudicate/batch` | Batch LLM classification |
| POST | `/enforce` | Draft DMCA notice |
| POST | `/broker` | Mint rev-share contract |
| GET | `/debug/cookies` | Cookie configuration check |
| GET | `/debug/sentinel` | Raw similarity scan |

---

## Design Decisions & Trade-offs

**CLIP ViT-B/32 Alignment:** CLIP ViT-B/32 produces superior semantic embeddings for piracy detection and has been adopted as the standard embedding model across the ingestion and scanning pipelines. To prevent OOM errors or startup timeouts on constrained cloud platforms like Render's free tier, the model weights are pre-cached during the Docker build stage and lazy-loaded on the first API request.

**File-backed job store vs in-memory:** The original in-memory `_ingest_jobs` dict was wiped on every Render restart, causing the Node poller to loop forever on 404s. File persistence in `/tmp` survives within a deployment lifecycle (hours) — long enough for any ingest job to complete.

**Direct LLM calls vs CrewAI:** CrewAI's agent loop was replaced with direct API calls after consistently hitting "Maximum iterations reached" errors on structured JSON tasks. Direct calls are faster, more reliable, and the retry logic (with model fallback chain) provides the same resilience without the overhead.

**Adjudicator caching:** The same video title + account + platform will always get the same ruling. Redis caching prevents redundant LLM calls when the same infringing account uploads multiple copies of the same content.

**Human-in-the-loop:** DMCA notices and contracts are never automatically sent/activated. They require explicit human approval in the dashboard. This prevents false positives from having legal consequences and satisfies DMCA good-faith requirements.
