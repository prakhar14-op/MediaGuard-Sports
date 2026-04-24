import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield, ArrowRight, Database, Globe, Eye, Brain, Gavel, Coins,
  Zap, CheckCircle, ChevronRight, AlertCircle, Lock
} from 'lucide-react';
import { FlipWords } from '../components/ui/FlipWords';

// ─── Ripple Grid ──────────────────────────────────────────────────────────────
const RippleGrid = ({ rows = 10, cols = 24, cellSize = 60 }) => {
  const [clicked, setClicked] = useState(null);
  const [key, setKey] = useState(0);
  const cells = useMemo(() => Array.from({ length: rows * cols }, (_, i) => i), [rows, cols]);
  return (
    <div className="absolute inset-0 overflow-hidden z-0"
      style={{ maskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, black 20%, transparent 100%)' }}>
      <div className="pointer-events-auto cursor-crosshair"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gridTemplateRows: `repeat(${rows}, ${cellSize}px)`, width: cols * cellSize, marginInline: 'auto' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setClicked({ row: Math.floor((e.clientY - rect.top) / cellSize), col: Math.floor((e.clientX - rect.left) / cellSize) });
          setKey(k => k + 1);
        }}>
        {cells.map((idx) => {
          const r = Math.floor(idx / cols), c = idx % cols;
          const dist = clicked ? Math.hypot(clicked.row - r, clicked.col - c) : 0;
          return (
            <div key={`${key}-${idx}`}
              className={`border border-teal-600/10 hover:bg-teal-500/10 transition-colors duration-100 will-change-transform ${clicked ? 'animate-cell-ripple' : ''}`}
              style={{ width: cellSize, height: cellSize, '--delay': `${clicked ? Math.max(0, dist * 28) : 0}ms`, '--duration': `${130 + dist * 48}ms` }} />
          );
        })}
      </div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, tag, delay = 0, rotate = 0 }) => (
  <motion.div
    initial={{ y: -240, opacity: 0, rotate: rotate - 12, scale: 0.7 }}
    animate={{ y: 0, opacity: 1, rotate, scale: 1 }}
    transition={{ delay, duration: 0.8, type: 'spring', stiffness: 160, damping: 15 }}>
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.5 }}
      className="bg-white rounded-2xl p-5 border border-slate-100 w-[196px]"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)', transform: `rotate(${rotate}deg)` }}>
      <div className="w-8 h-[3px] bg-teal-500 rounded-full mb-3" />
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.24em] mb-1">{label}</p>
      <p className="text-[2rem] font-black text-slate-900 leading-none mb-1.5">{value}</p>
      <p className="text-[11px] text-slate-400 font-medium mb-3 leading-snug">{sub}</p>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200/60 rounded-full text-[9px] font-bold text-teal-700 uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />{tag}
      </span>
    </motion.div>
  </motion.div>
);

// ─── Nav ──────────────────────────────────────────────────────────────────────
const Nav = ({ onLaunch }) => {
  const scroll = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <motion.nav initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-5">
      <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl border border-slate-200/70 rounded-full px-3 py-2 shadow-lg shadow-slate-200/50">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors">
          <Shield className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-black text-slate-900 tracking-tight">MediaGuard<span className="text-teal-600">'26</span></span>
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        {[['agents','Agent Swarm'],['pipeline','Pipeline'],['stack','Tech Stack']].map(([id, label]) => (
          <button key={id} onClick={() => scroll(id)}
            className="px-4 py-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-50 transition-all">
            {label}
          </button>
        ))}
        <button onClick={onLaunch}
          className="ml-2 px-5 py-2 bg-slate-900 hover:bg-teal-600 text-white text-[12px] font-bold rounded-full transition-all duration-200">
          Launch →
        </button>
      </div>
    </motion.nav>
  );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────
const STAT_CARDS = [
  { label: 'Detection Accuracy', value: '99.8%', sub: 'CLIP + pHash dual-layer verification',  tag: 'AI-Powered',    delay: 0.05, rotate: 4  },
  { label: 'Swarm Agents',       value: '6',     sub: 'Fully autonomous, zero human input',     tag: 'CrewAI',        delay: 0.2,  rotate: -3 },
  { label: 'Scan Speed',         value: '0.05s', sub: 'Per thumbnail — no video downloads',     tag: 'Zero-Download', delay: 0.35, rotate: 5  },
  { label: 'Platforms Covered',  value: '7+',    sub: 'YouTube, TikTok, Twitter & more',        tag: 'Global Reach',  delay: 0.5,  rotate: -4 },
  { label: 'Solution Challenge', value: '2026',  sub: 'Google Solution Challenge — SDG 8 & 9',  tag: 'Open Source',   delay: 0.65, rotate: 3  },
];

const CARD_POSITIONS = [
  { top: '3%',  left: '40%' },
  { top: '20%', left: '6%'  },
  { top: '38%', left: '46%' },
  { top: '56%', left: '12%' },
  { top: '72%', left: '38%' },
];

const Hero = ({ onLaunch }) => {
  const WORDS = ['Detects', 'Adjudicates', 'Monetizes', 'Protects'];
  return (
    <section className="relative min-h-screen overflow-hidden pt-24"
      style={{ background: 'linear-gradient(140deg, #daf2ed 0%, #edf0f8 50%, #e2e8f6 100%)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #9abfb8 1px, transparent 1px)', backgroundSize: '26px 26px', opacity: 0.28 }} />
      <RippleGrid rows={10} cols={24} cellSize={60} />

      <div className="relative z-10 max-w-7xl mx-auto px-8 lg:px-12 flex flex-col lg:flex-row items-center gap-8 min-h-[calc(100vh-6rem)]">
        {/* LEFT */}
        <div className="flex-none w-full lg:w-[500px] xl:w-[540px] py-12">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 mb-7">
            <Zap className="w-3 h-3 text-teal-600 fill-teal-600" />
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-[0.22em]">
              Autonomous IP Protection · Google Solution Challenge 2026
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="font-black text-slate-900 tracking-tight leading-[0.9] mb-5"
            style={{ fontSize: 'clamp(2.8rem, 5.5vw, 4.2rem)' }}>
            MediaGuard<br />Sports<br />
            <span className="text-teal-600"
              style={{ textDecoration: 'underline', textDecorationColor: '#2dd4bf', textDecorationThickness: '4px', textUnderlineOffset: '7px' }}>
              <FlipWords words={WORDS} />
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[15px] font-bold text-teal-600 mb-4 tracking-wide">
            Detect. Adjudicate. Monetize.
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-slate-500 leading-relaxed mb-10 text-[15px] max-w-[430px]">
            A 6-agent AI swarm that hunts pirated sports content across the web, classifies it as
            piracy or fair use, then autonomously fires a DMCA notice or deploys a revenue-sharing
            smart contract — human approval only at the final step.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.55 }}
            className="flex flex-wrap items-center gap-3">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={onLaunch}
              className="px-7 py-3.5 bg-slate-900 hover:bg-teal-700 text-white font-bold text-sm rounded-full transition-all duration-200 shadow-xl shadow-slate-900/20 flex items-center gap-2">
              Launch Swarm <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-7 py-3.5 bg-white/80 border border-slate-200 text-slate-700 hover:border-teal-400 hover:text-teal-700 font-bold text-sm rounded-full transition-all duration-200 shadow-sm">
              Explore Agents
            </motion.button>
          </motion.div>
        </div>

        {/* RIGHT — fanned floating cards */}
        <div className="flex-1 relative hidden lg:block" style={{ height: '600px' }}>
          {STAT_CARDS.map((card, i) => (
            <div key={card.label} className="absolute" style={CARD_POSITIONS[i]}>
              <StatCard {...card} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Split Card (GSSoC-style) ─────────────────────────────────────────────────
const SplitCard = ({ num, tag, title, label, desc, cta, reverse = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 44 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-50px' }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} rounded-3xl overflow-hidden border border-slate-200/70 bg-white group hover:shadow-lg transition-shadow duration-500`}
  >
    {/* Visual panel */}
    <div className="md:w-[40%] bg-gradient-to-br from-[#eef0f8] to-[#e8eef6] relative flex items-center justify-center p-10 min-h-[200px] overflow-hidden">
      <span className="absolute bottom-0 right-3 text-[110px] font-black leading-none select-none pointer-events-none"
        style={{ color: 'rgba(148,163,184,0.18)' }}>
        {String(num).padStart(2, '0')}
      </span>
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: num * 0.3 }}
        className="relative z-10 px-5 py-2.5 bg-white/75 backdrop-blur-sm border border-slate-200/80 rounded-full shadow-sm"
      >
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.22em]">{tag}</span>
      </motion.div>
    </div>
    {/* Content panel */}
    <div className="md:w-[60%] p-9 flex flex-col justify-center">
      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-[0.24em] mb-3">
        — {String(num).padStart(2, '0')}, {label}
      </p>
      <h3 className="text-2xl md:text-[1.7rem] font-black text-slate-900 mb-3 leading-tight group-hover:text-teal-700 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-slate-500 leading-relaxed mb-5 text-[14px]">{desc}</p>
      <div className="inline-flex">
        <span className="px-4 py-2 bg-teal-500/8 border border-teal-500/20 rounded-full text-[10px] font-bold text-teal-700 uppercase tracking-[0.16em]">
          {cta}
        </span>
      </div>
    </div>
  </motion.div>
);

const AGENTS = [
  {
    num: 1, tag: 'CLIP + FAISS', label: 'INGESTION', title: 'The Archivist',
    desc: 'Ingests any official video URL via yt-dlp. Extracts one frame per second, embeds each through HuggingFace CLIP (openai/clip-vit-base-patch32), and stores 512-dimensional vectors in a FAISS vault. Generates a SHA-256 integrity hash and mock Polygon transaction as timestamped proof of ownership.',
    cta: 'Vector Vault',
  },
  {
    num: 2, tag: 'OSINT CRAWLER', label: 'HUNT', title: 'The Spider', reverse: true,
    desc: 'Gemini 2.5 Flash generates four platform-optimised search query variants from the official title. yt-dlp scrapes YouTube with zero downloads — metadata and thumbnails only. Deduplicates by URL, captures view counts and descriptions, and maps every suspect to a geographic centroid for the live threat map.',
    cta: 'Zero-Download Architecture',
  },
  {
    num: 3, tag: 'DUAL-LAYER SCAN', label: 'DETECTION', title: 'The Sentinel',
    desc: 'Layer 1: CLIP L2 vector search returns the top-3 closest vault matches with exact frame timestamps. Layer 2: perceptual hash (pHash) cross-check eliminates false positives. Redis velocity tracking monitors repeat offenders — accounts flagged three or more times auto-escalate to CRITICAL severity.',
    cta: 'pHash + CLIP Fusion',
  },
  {
    num: 4, tag: 'GEMINI 2.5 FLASH', label: 'TRIAGE', title: 'The Adjudicator', reverse: true,
    desc: 'Classifies each incident as SEVERE PIRACY or FAIR USE / FAN CONTENT with a 0–100 numeric risk score, a legal basis citation (e.g. 17 U.S.C. § 107 fair use factors), and a concrete recommended action. Redis caches verdicts for 24 hours — the same account, platform, and title never hits the Gemini API twice.',
    cta: 'Risk Score Engine',
  },
  {
    num: 5, tag: '17 U.S.C. § 512(c)', label: 'TAKEDOWN', title: 'The Enforcer',
    desc: 'Gemini drafts a legally precise DMCA takedown notice tailored to the platform, incident context, and offence history. Escalation tiers: standard (1st offence) → expedited with account suspension request (2nd) → full legal referral (3rd+). Platform-specific legal routing. Notices are staged — human approves before send.',
    cta: 'DMCA Automation',
  },
  {
    num: 6, tag: 'POLYGON MOCK', label: 'MONETIZE', title: 'The Broker', reverse: true,
    desc: 'Deploys dynamic revenue-sharing smart contracts for Fair Use content. Virality tiers determine the split: Platinum (1M+ views) 20/80, Gold 25/75, Silver 30/70, Bronze 35/65. Revenue projections use real platform CPM rates (YouTube $4.50, TikTok $0.02). Contracts are minted with a mock Polygon tx hash and staged for human activation.',
    cta: 'Smart Contract Minting',
  },
];

const AgentsSection = () => (
  <section id="agents" className="py-28 px-8 bg-[#f6f7fc]">
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.6 }}
        className="text-center mb-16">
        <p className="text-[10px] font-bold text-teal-600 uppercase tracking-[0.28em] mb-4">The Autonomous Swarm</p>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
          6 Agents.<br /><span className="text-teal-600">One Pipeline.</span>
        </h2>
        <p className="text-[17px] text-slate-500 max-w-lg mx-auto leading-relaxed">
          One URL triggers the entire swarm. Each agent hands off to the next automatically.
          Human intervention only at the final approval step.
        </p>
      </motion.div>
      <div className="space-y-5">
        {AGENTS.map(a => <SplitCard key={a.num} {...a} />)}
      </div>
    </div>
  </section>
);

// ─── Pipeline Section ─────────────────────────────────────────────────────────
const HOW_STEPS = [
  { icon: Globe,       label: 'Spider Crawls',     desc: 'Gemini-optimised OSINT queries',  color: '#6366f1' },
  { icon: Eye,         label: 'Sentinel Scans',     desc: 'CLIP + pHash dual-layer',         color: '#f59e0b' },
  { icon: Brain,       label: 'Adjudicator Rules',  desc: 'Gemini 2.5 Flash verdict',        color: '#a855f7' },
  { icon: Gavel,       label: 'Enforcer Drafts',    desc: '17 U.S.C. § 512(c) notice',      color: '#ef4444' },
  { icon: Coins,       label: 'Broker Mints',       desc: 'Dynamic rev-share contract',      color: '#10b981' },
  { icon: CheckCircle, label: 'Human Approves',     desc: 'One click. Mission complete.',    color: '#0d9488' },
];

const PipelineSection = () => (
  <section id="pipeline" className="py-28 px-8 bg-white">
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.6 }}
        className="text-center mb-16">
        <p className="text-[10px] font-bold text-teal-600 uppercase tracking-[0.28em] mb-4">The Agentic Pipeline</p>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
          One URL.<br /><span className="text-teal-600">Full Autonomy.</span>
        </h2>
        <p className="text-[17px] text-slate-500 max-w-lg mx-auto leading-relaxed">
          POST{' '}
          <code className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md text-sm font-mono border border-teal-100">/api/swarm/run</code>
          {' '}— all five phases execute autonomously, streaming live events to the dashboard via Socket.io.
        </p>
      </motion.div>

      {/* Step flow */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-6 relative mb-16">
        <div className="hidden md:block absolute top-11 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        {HOW_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div key={step.label}
              initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center relative z-10 flex-1">
              <motion.div whileHover={{ scale: 1.1, rotate: 3 }}
                className="w-[88px] h-[88px] rounded-2xl flex items-center justify-center mb-4 relative"
                style={{ backgroundColor: `${step.color}12`, border: `1.5px solid ${step.color}22`, boxShadow: `0 4px 20px ${step.color}18` }}>
                <Icon className="w-7 h-7" style={{ color: step.color }} />
              </motion.div>
              <p className="text-[13px] font-black text-slate-900 mb-1">{step.label}</p>
              <p className="text-[11px] text-slate-400 font-medium leading-snug">{step.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Terminal */}
      <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.6 }}
        className="bg-[#0d1117] rounded-3xl p-8 font-mono overflow-x-auto border border-slate-800/60"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">swarm_output.log</span>
        </div>
        <div className="space-y-1.5 text-[12px]">
          {[
            ['#818cf8', '🕷️  [Phase 1] Spider — Generating 4 OSINT search variants via Gemini...'],
            ['#64748b', '   → Found 18 unique suspects across YouTube. Zero files downloaded.'],
            ['#fbbf24', '👁️  [Phase 2] Sentinel — Scanning 18 thumbnails (CLIP L2 + pHash)...'],
            ['#64748b', '   → 3 CRITICAL  |  5 WARNING  |  10 CLEAN'],
            ['#c084fc', '⚖️  [Phase 3] Adjudicator — Classifying 8 flagged incidents via Gemini...'],
            ['#64748b', '   → 5 × SEVERE PIRACY → Enforcer  |  3 × FAIR USE → Broker'],
            ['#f87171', '🔨 [Phase 4] Enforcer — Drafting 5 DMCA notices (17 U.S.C. § 512(c))...'],
            ['#64748b', '   → Notices staged. Awaiting human approval before dispatch.'],
            ['#34d399', '💰 [Phase 5] Broker — Minting 3 rev-share contracts on Polygon (Mock)...'],
            ['#64748b', '   → Contracts minted. Awaiting human activation.'],
            ['#2dd4bf', '✅ [Swarm Complete] All phases executed. Human-in-the-loop ready.'],
          ].map(([color, msg], i) => (
            <motion.p key={i} style={{ color }}
              initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.25 + i * 0.07 }}>
              {msg}
            </motion.p>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

// ─── Tech Stack Section ───────────────────────────────────────────────────────
const FEATURES = [
  { icon: Database,    title: 'CLIP Embeddings',   desc: 'openai/clip-vit-base-patch32 · 512-D cross-modal visual fingerprints',       color: '#3b82f6', gradient: 'from-blue-400 to-indigo-500' },
  { icon: Globe,       title: 'FAISS Vector DB',   desc: 'Facebook AI Similarity Search · sub-millisecond L2 nearest-neighbour lookup', color: '#6366f1', gradient: 'from-indigo-400 to-purple-500' },
  { icon: Brain,       title: 'Gemini 2.5 Flash',  desc: 'CrewAI agent orchestration · strict JSON output · 24h Redis verdict cache',   color: '#f59e0b', gradient: 'from-amber-400 to-orange-500' },
  { icon: Eye,         title: 'yt-dlp OSINT',      desc: 'Zero-download architecture · metadata and thumbnails only · URL dedup',       color: '#10b981', gradient: 'from-emerald-400 to-teal-500' },
  { icon: Lock,        title: 'SHA-256 + Polygon', desc: 'Cryptographic proof of ownership · mock Polygon tx hash on every asset',      color: '#a855f7', gradient: 'from-purple-400 to-violet-500' },
  { icon: Zap,         title: 'Redis + MongoDB',   desc: 'Velocity tracking · verdict caching · full incident and audit persistence',   color: '#ef4444', gradient: 'from-red-400 to-rose-500' },
  { icon: Gavel,       title: 'Express + FastAPI', desc: 'Node.js API layer + Python ML server · clean separation of concerns',         color: '#0d9488', gradient: 'from-teal-400 to-cyan-500' },
  { icon: Coins,       title: 'Socket.io',         desc: 'Real-time agent event streaming · live dashboard updates per phase',          color: '#f97316', gradient: 'from-orange-400 to-amber-500' },
];

const FeatureCard = ({ feature, index }) => {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative bg-white border border-slate-200/70 rounded-2xl p-6 hover:shadow-lg transition-all duration-400 overflow-hidden cursor-default"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500`} />
      <div className="relative z-10">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${feature.color}10`, border: `1px solid ${feature.color}18` }}>
          <Icon className="w-5 h-5" style={{ color: feature.color }} />
        </div>
        <h3 className="text-[13px] font-black text-slate-900 mb-1.5">{feature.title}</h3>
        <p className="text-[11px] text-slate-400 leading-relaxed">{feature.desc}</p>
      </div>
    </motion.div>
  );
};

const TechSection = () => (
  <section id="stack" className="py-28 px-8 bg-[#f6f7fc]">
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.6 }}
        className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-5">
          <AlertCircle className="w-3.5 h-3.5 text-teal-600" />
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-[0.24em]">Mission-Critical Stack</span>
        </div>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
          Production-Grade{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 animate-gradient">
            Tech Stack
          </span>
        </h2>
        <p className="text-[17px] text-slate-500 max-w-lg mx-auto leading-relaxed">
          Every component selected for speed, accuracy, and a zero-download architecture that
          never stores suspect content on disk.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {FEATURES.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
      </div>

      {/* Architecture strip */}
      <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ delay: 0.15, duration: 0.6 }}
        className="bg-white border border-slate-200/70 rounded-3xl p-8">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-6 text-center">System Architecture</p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-xs font-mono flex-wrap">
          {[
            { l: 'React UI',     s: 'Vite · Port 5173', c: '#3b82f6' },
            { plain: true },
            { l: 'Express API',  s: 'Node.js · Port 8000', c: '#10b981' },
            { plain: true },
            { l: 'FastAPI ML',   s: 'Python · Port 8001', c: '#a855f7' },
            { plain: true },
            { l: 'CLIP + FAISS', s: 'Gemini · CrewAI', c: '#f59e0b' },
          ].map((item, i) => item.plain
            ? <span key={i} className="text-slate-300 text-lg hidden md:block">→</span>
            : <div key={i} className="px-5 py-3 rounded-xl border text-center min-w-[120px]"
                style={{ borderColor: `${item.c}22`, backgroundColor: `${item.c}06` }}>
                <p className="font-bold text-[12px]" style={{ color: item.c }}>{item.l}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.s}</p>
              </div>
          )}
        </div>
      </motion.div>
    </div>
  </section>
);

// ─── CTA ──────────────────────────────────────────────────────────────────────
const CTA = ({ onLaunch }) => (
  <section className="py-28 px-8 bg-white">
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-[2.5rem] p-14 md:p-20 text-center overflow-hidden"
        style={{ background: 'linear-gradient(140deg, #daf2ed 0%, #edf0f8 60%, #e2e8f6 100%)' }}>
        {/* Dot grid inside CTA */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #9abfb8 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.22 }} />
        <div className="absolute bottom-0 right-4 text-[180px] font-black leading-none select-none pointer-events-none"
          style={{ color: 'rgba(148,163,184,0.12)' }}>AI</div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-7">
            <Zap className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-[0.24em]">Ready to Deploy</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
            Deploy the Swarm.<br />
            <span className="text-teal-600">Protect Your IP.</span>
          </h2>
          <p className="text-[17px] text-slate-500 max-w-lg mx-auto mb-10 leading-relaxed">
            Paste one URL. Six agents execute the full pipeline — detect, classify, enforce, and
            monetize — while you watch the results stream live on the command center dashboard.
          </p>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={onLaunch}
            className="group px-10 py-4 bg-slate-900 hover:bg-teal-700 text-white font-bold text-sm rounded-full transition-all duration-200 shadow-xl shadow-slate-900/20 flex items-center gap-3 mx-auto">
            <Shield className="w-5 h-5" />
            Initialize Command Center
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <p className="mt-7 text-[10px] text-slate-400 font-bold uppercase tracking-[0.28em]">
            Google Solution Challenge 2026 · SDG 8 &amp; 9 · Open Source
          </p>
        </div>
      </motion.div>
    </div>
  </section>
);

// ─── Root ─────────────────────────────────────────────────────────────────────
const Landing = () => {
  const navigate = useNavigate();
  const onLaunch = () => navigate('/dashboard/overview');
  return (
    <div className="bg-white min-h-screen overflow-x-hidden selection:bg-teal-500/20">
      <Nav onLaunch={onLaunch} />
      <Hero onLaunch={onLaunch} />
      <AgentsSection />
      <PipelineSection />
      <TechSection />
      <CTA onLaunch={onLaunch} />
      <footer className="py-8 px-8 border-t border-slate-100 bg-[#f6f7fc]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-black text-slate-900">
              MediaGuard<span className="text-teal-600">Sports</span>
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.28em]">
            © 2026 · Autonomous IP Intelligence · Global Protection Protocol
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
