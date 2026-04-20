# 🛡️ MediaGuard-Sports: AI-Powered IP Protection & Monetization

**System Status:** `ONLINE` | **Global Node Monitoring:** `ACTIVE`

MediaGuard-Sports is a decentralized, multi-agent AI ecosystem designed to protect live sports broadcasts and media intellectual property. By combining cryptographic vector matching with OSINT intelligence and Web3 smart contracts, we transform piracy from a legal burden into a revenue-sharing opportunity.

---

##  The Problem & Our Solution

The sports media industry loses billions annually to unauthorized re-streaming and pirated clips. Traditional takedown methods are slow, manual, and often flag "Fair Use" content (fan edits), which alienates the community.

**Our Approach:** We use a **6-Agent AI Swarm** that doesn't just detect piracy—it adjudicates it. If a video is pure piracy, it is struck down. If it is a transformative fan edit, it is automatically monetized via Web3 revenue splitting.

###  SDG Alignment
- **Goal 9: Industry, Innovation, and Infrastructure:** Leveraging Agentic AI to protect digital assets.
- **Goal 8: Decent Work and Economic Growth:** Protecting the revenue streams of content creators and sports organizations.

---

##  Technical Architecture

The backend is built with **FastAPI** and orchestrates a swarm of **CrewAI** agents powered by **Google Gemini 2.5 Flash**.

### The 6-Agent Swarm
1. **The Archivist:** Ingests official assets into a **FAISS Vector Database** using CLIP neural embeddings.
2. **The Sentinel:** Scans the web for pixel-perfect mathematical matches against the vault.
3. **The Adjudicator:** A legal LLM that distinguishes between **Severe Piracy** and **Fair Use**.
4. **The Enforcer:** Automates the drafting of **17 U.S.C. 512(c) DMCA** takedown notices.
5. **The Broker:** Mints **Smart Contracts** on a mock Polygon network for revenue-sharing.
6. **The Spider:** An OSINT crawler that scrapes metadata and thumbnail centroids for real-time mapping.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Tailwind CSS, React Simple Maps (Choropleth/Centroid mapping).
- **Backend:** Python, FastAPI, Uvicorn.
- **AI/ML:** CrewAI, Google Gemini 2.5, HuggingFace CLIP, PyTorch.
- **Database:** FAISS (Facebook AI Similarity Search).
- **Scraping:** `yt-dlp` for Zero-Download OSINT extraction.

---

##  Getting Started

### Prerequisites
- Python 3.9+
- Node.js & npm
- A Google Gemini API Key

### Backend Setup
1. Clone the repo:
   ```bash
   git clone [https://github.com/prakhar14-op/MediaGuard-Sports.git](https://github.com/prakhar14-op/MediaGuard-Sports.git)
   cd MediaGuard-Sports/Backend
