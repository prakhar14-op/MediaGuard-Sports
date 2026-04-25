import React from 'react';
import { motion } from 'framer-motion';

const AGENTS = [
  {
    num: 1, tag: 'CLIP + FAISS', label: 'INGESTION', title: 'The Archivist',
    color: '#2dd4bf',
    desc: 'Ingests any official video URL via yt-dlp. Extracts one frame per second, embeds each through HuggingFace CLIP (openai/clip-vit-base-patch32), and stores 512-dimensional vectors in a persistent FAISS vault. Generates a SHA-256 integrity hash and a mock Polygon transaction as cryptographic proof of ownership.',
    cta: 'Vector Vault',
    reverse: false,
  },
  {
    num: 2, tag: 'OSINT CRAWLER', label: 'HUNT', title: 'The Spider',
    color: '#818cf8',
    desc: 'Gemini 2.5 Flash generates four platform-optimised search query variants from the official title. yt-dlp scrapes YouTube with zero file downloads — metadata and thumbnails only. Deduplicates by URL, captures view counts and descriptions, and maps every suspect to a geographic centroid for the live threat map.',
    cta: 'Zero-Download Architecture',
    reverse: true,
  },
  {
    num: 3, tag: 'DUAL-LAYER SCAN', label: 'DETECTION', title: 'The Sentinel',
    color: '#fbbf24',
    desc: 'Layer 1: CLIP L2 vector search returns the top-3 closest vault matches with exact frame timestamps. Layer 2: perceptual hash (pHash) cross-check eliminates false positives. Redis velocity tracking monitors repeat offenders — accounts flagged three or more times auto-escalate to CRITICAL severity.',
    cta: 'pHash + CLIP Fusion',
    reverse: false,
  },
  {
    num: 4, tag: 'GEMINI 2.5 FLASH', label: 'TRIAGE', title: 'The Adjudicator',
    color: '#c084fc',
    desc: 'Classifies each incident as SEVERE PIRACY or FAIR USE / FAN CONTENT with a 0–100 numeric risk score, a legal basis citation (e.g. 17 U.S.C. § 107 fair use factors), and a concrete recommended action. Redis caches verdicts for 24 hours — the same account, platform, and title never hits the Gemini API twice.',
    cta: 'Risk Score Engine',
    reverse: true,
  },
  {
    num: 5, tag: '17 U.S.C. § 512(c)', label: 'TAKEDOWN', title: 'The Enforcer',
    color: '#f87171',
    desc: 'Gemini drafts a legally precise DMCA takedown notice tailored to the platform, incident context, and offence history. Escalation tiers: standard (1st offence) → expedited with account suspension request (2nd) → full legal referral (3rd+). Platform-specific legal routing. Notices are staged — human approves before dispatch.',
    cta: 'DMCA Automation',
    reverse: false,
  },
  {
    num: 6, tag: 'POLYGON MOCK', label: 'MONETIZE', title: 'The Broker',
    color: '#34d399',
    desc: 'Deploys dynamic revenue-sharing smart contracts for Fair Use content. Virality tiers determine the split: Platinum (1M+ views) 20/80, Gold 25/75, Silver 30/70, Bronze 35/65. Revenue projections use real platform CPM rates (YouTube $4.50, TikTok $0.02). Contracts are minted with a mock Polygon tx hash and staged for human activation.',
    cta: 'Smart Contract Minting',
    reverse: true,
  },
];

const AgentCard = ({ num, tag, label, title, color, desc, cta, reverse }) => (
  <motion.div
    initial={{ opacity: 0, y: 44 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} rounded-3xl overflow-hidden border border-slate-200/70 bg-white group hover:shadow-lg transition-shadow duration-500`}
  >
    {/* Visual panel */}
    <div
      className="md:w-[38%] relative flex items-center justify-center p-10 min-h-[200px] overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${color}12 0%, transparent 70%)` }}
    >
      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(${color} 1px, transparent 1px)`,
          backgroundSize: '18px 18px',
        }}
      />
      {/* Big number watermark */}
      <span
        className="absolute bottom-0 right-3 text-[100px] font-black leading-none select-none pointer-events-none"
        style={{ color: 'rgba(148,163,184,0.12)' }}
      >
        {String(num).padStart(2, '0')}
      </span>

      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: num * 0.3 }}
        className="relative z-10 px-5 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-full shadow-sm"
      >
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.22em]">{tag}</span>
      </motion.div>
    </div>

    {/* Content panel */}
    <div className="md:w-[62%] p-9 flex flex-col justify-center">
      <p className="text-[9px] font-bold uppercase tracking-[0.26em] mb-3" style={{ color }}>
        — {String(num).padStart(2, '0')}, {label}
      </p>
      <h3 className="text-2xl md:text-[1.7rem] font-black text-slate-900 mb-3 leading-tight group-hover:text-teal-700 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-slate-500 leading-relaxed mb-5 text-[13.5px]">{desc}</p>
      <div className="inline-flex">
        <span
          className="px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.16em] border"
          style={{ color, backgroundColor: `${color}0d`, borderColor: `${color}30` }}
        >
          {cta}
        </span>
      </div>
    </div>
  </motion.div>
);

const AgentsSection = () => (
  <section id="agents" className="py-28 px-8 bg-[#f6f7fc]">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <p className="text-[9px] font-bold text-teal-600 uppercase tracking-[0.3em] mb-4">The Autonomous Swarm</p>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
          6 Agents.<br /><span className="text-teal-600">One Pipeline.</span>
        </h2>
        <p className="text-[17px] text-slate-500 max-w-lg mx-auto leading-relaxed">
          One URL triggers the entire swarm. Each agent hands off to the next automatically.
          Human intervention only at the final approval step.
        </p>
      </motion.div>

      <div className="space-y-5">
        {AGENTS.map((a) => <AgentCard key={a.num} {...a} />)}
      </div>
    </div>
  </section>
);

export default AgentsSection;
