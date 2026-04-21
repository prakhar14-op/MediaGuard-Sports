# 🛡️ MediaGuard Sports

**Active Threat Intelligence & Monetization Platform for Sports IP**

MediaGuard Sports is a production-grade, autonomous multi-agent AI system that detects pirated sports content in real-time, legally evaluates it, and either strikes it down or converts it into a revenue-sharing smart contract — all without human intervention until the final approval step.

---

## The Problem

The sports media industry loses billions annually to unauthorized re-streaming and pirated clips. Traditional DRM solutions are slow, rely on manual review, and treat all unauthorized use as a threat — alienating fan communities and missing monetization opportunities.

## Our Solution

A **6-agent AI swarm** that doesn't just detect piracy — it adjudicates it. One URL triggers the entire pipeline autonomously. Humans only intervene at the final approval step.

---

## Architecture

```
React UI
    │
    ▼
Express (Node.js) — Port 8000
  Validation · Redis · MongoDB · Socket.io · Job orchestration
    │
    │  HTTP
    ▼
FastAPI (Python) — Port 8001
  CLIP · FAISS · CrewAI · Gemini 2.5 Flash
```

---

## The 6-Agent Swarm

### Agent 1 — The Archivist
Ingests an official video from any public URL. Downloads via yt-dlp, extracts 1 frame/second, runs each frame through HuggingFace CLIP (openai/clip-vit-base-patch32), and stores 512-dimensional embeddings in a FAISS vector database. Generates a SHA-256 integrity hash and mock Polygon tx hash as proof of ownership. Vault persists across restarts.

### Agent 2 — The Sentinel
Scans suspect thumbnails using dual-layer detection:
- **Layer 1:** CLIP embeddings → FAISS L2 distance search → top-3 vault matches with timestamps
- **Layer 2:** Perceptual hash (pHash) cross-check to eliminate false positives

Redis velocity tracking auto-escalates severity to CRITICAL for repeat offenders. Returns confidence score (0-100), L2 distance, and exact vault frame timestamps.

### Agent 3 — The Adjudicator
Gemini 2.5 Flash reads incident metadata and classifies:
- **SEVERE PIRACY** → routes to Enforcer
- **FAIR USE / FAN CONTENT** → routes to Broker

Outputs a numeric risk score (0-100), legal basis citation, and recommended action. Redis caches verdicts for 24h — same account/platform/title never hits Gemini twice. Low-confidence Sentinel results (< 70%) automatically receive lenient treatment.

### Agent 4 — The Enforcer
Gemini drafts a legally precise 17 U.S.C. § 512(c) DMCA takedown notice tailored to the specific platform, incident context, and offence history. Escalation tiers:
- **1st offence:** Standard DMCA
- **2nd offence:** Expedited + account suspension request + 17 U.S.C. § 512(i) repeat infringer citation
- **3rd+ offence:** Full legal referral

Notices are staged for human approval — never auto-sent. Platform-specific legal contacts (copyright@youtube.com, legal@tiktok.com, etc.).

### Agent 5 — The Broker
Deploys dynamic rev-share smart contracts for Fair Use content. Gemini calculates the optimal split based on virality tier and risk score:
- **Platinum** (1M+ views): 20/80 split
- **Gold** (100K-1M): 25/75
- **Silver** (10K-100K): 30/70
- **Bronze** (< 10K): 35/65

Revenue projections use real platform CPM rates (YouTube $4.50, TikTok $0.02, etc.). Contracts are minted with a mock Polygon tx hash and staged for human activation.

### Agent 6 — The Spider
Given an official video URL, Gemini generates 4 optimized search query variants (piracy keywords, highlight patterns, language variants, hashtag patterns). yt-dlp scrapes YouTube with zero downloads — metadata and thumbnails only. Deduplicates by URL, captures view counts and descriptions, maps every suspect to country centroids for the UI map arcs.

---

## The Agentic Pipeline

One endpoint triggers the entire swarm autonomously:

```
POST /api/swarm/run  { "official_video_url": "..." }
→ returns { jobId } immediately

Phase 1: Spider     → crawls web, finds suspects
Phase 2: Sentinel   → scans all thumbnails (CLIP + pHash)
Phase 3: Adjudicator→ rules each incident (Gemini)
Phase 4: Enforcer   → drafts DMCA for SEVERE PIRACY
Phase 5: Broker     → mints contracts for FAIR USE
Final:              → swarm:complete — awaiting human approval
```

React dashboard receives live socket events at each phase. The incident table, map arcs, and agent reasoning thread all update in real-time.

---

## API Reference

### Swarm (Full Pipeline)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/swarm/run` | Trigger full autonomous pipeline |

### Archivist
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ingest` | Ingest official video from URL |
| GET | `/api/ingest` | List all ingested assets |
| GET | `/api/ingest/:id` | Get single asset |

### Spider
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/hunt` | Trigger Spider crawl |
| GET | `/api/hunt/:jobId` | Poll job status |

### Sentinel
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan` | Scan single thumbnail |
| POST | `/api/scan/batch` | Scan all threat nodes |
| GET | `/api/incidents` | List incidents (filterable) |
| GET | `/api/incidents/:id` | Get incident with DMCA/contract |

### Adjudicator
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/adjudicate` | Adjudicate single incident |
| POST | `/api/adjudicate/batch` | Batch adjudicate |
| GET | `/api/adjudicate/:id` | Get verdict |

### Enforcer
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/enforce` | Draft DMCA notice |
| POST | `/api/enforce/batch` | Batch enforce |
| PATCH | `/api/enforce/:id/approve` | **Approve & Send DMCA** |
| PATCH | `/api/enforce/:id/reject` | Reject (false positive) |
| GET | `/api/enforce` | List DMCA records |

### Broker
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/broker` | Mint rev-share contract |
| POST | `/api/broker/batch` | Batch mint |
| PATCH | `/api/broker/:id/activate` | **Activate Contract** |
| PATCH | `/api/broker/:id/dispute` | Dispute contract |
| GET | `/api/broker` | List contracts |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Node + Redis + MongoDB + FastAPI status |
| GET | `/` (FastAPI) | Vault size + ML API status |
| GET | `/vault/status` | FAISS vault vector count |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS, Lucide Icons, Socket.io-client |
| API Server | Node.js, Express 4, Socket.io, Joi validation |
| ML Server | Python, FastAPI, Uvicorn |
| Agent Framework | CrewAI 1.14, Google Gemini 2.5 Flash |
| Computer Vision | HuggingFace CLIP (openai/clip-vit-base-patch32), PyTorch |
| Vector DB | FAISS (Facebook AI Similarity Search) |
| Perceptual Hashing | ImageHash (pHash) |
| Web Scraping | yt-dlp (zero-download OSINT) |
| Database | MongoDB (Mongoose) |
| Cache / Queues | Redis (Upstash) |
| Blockchain | SHA-256 integrity hashing + mock Polygon tx hashes |

---

## Running Locally

### Prerequisites
- Python 3.9+ with pip
- Node.js 20+
- MongoDB running locally or Atlas URI
- Upstash Redis URL (free tier)
- Google Gemini API key

### 1. Install Python dependencies
```bash
cd Backend
pip install -r requirements.txt
```

### 2. Configure environment
```bash
# Backend/.env
GEMINI_API_KEY=your_key_here
FASTAPI_URL=http://127.0.0.1:8001
MONGO_URI=mongodb://127.0.0.1:27017/mediaguard
REDIS_URL=rediss://your_upstash_url
PORT=8000
CLIENT_URL=http://localhost:5173
```

### 3. Start FastAPI (ML server)
```bash
cd Backend
python main.py
# Runs on http://localhost:8001
```

### 4. Start Express (API server)
```bash
cd Backend/server
npm install
npm start
# Runs on http://localhost:8000
```

### 5. Start React frontend
```bash
cd Frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### 6. Run API tests
```bash
cd Backend/server
npm test
```

---

## SDG Alignment

- **Goal 9 — Industry, Innovation, Infrastructure:** Agentic AI protecting digital assets at scale
- **Goal 8 — Decent Work and Economic Growth:** Protecting revenue streams of sports organizations and creators
