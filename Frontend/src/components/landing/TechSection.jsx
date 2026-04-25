import React from 'react';
import { motion } from 'framer-motion';

// ─── Tech Marquee ─────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  'HuggingFace CLIP', 'FAISS Vector DB', 'Gemini 2.5 Flash', 'CrewAI Agents',
  'yt-dlp OSINT', 'pHash Detection', 'Redis Caching', 'MongoDB Atlas',
  'Express.js', 'FastAPI', 'Socket.io', 'Polygon Mock', 'SHA-256 Proof',
  'PyTorch', 'OpenCV', 'ImageHash', 'Upstash Redis', 'Mongoose ODM',
];

export const TechMarquee = () => (
  <div className="relative overflow-hidden py-4 bg-white border-y border-slate-100">
    <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
      style={{ background: 'linear-gradient(to right, white, transparent)' }} />
    <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
      style={{ background: 'linear-gradient(to left, white, transparent)' }} />
    <motion.div
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      className="flex gap-3 w-max"
    >
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200/70 rounded-full text-[11px] font-bold text-slate-600 whitespace-nowrap"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />{item}
        </span>
      ))}
    </motion.div>
  </div>
);

// ─── Detection metrics bars ───────────────────────────────────────────────────
const METRICS = [
  { label: 'CLIP Vector Match',   value: 99, color: '#f87171' },
  { label: 'pHash Confirmation',  value: 94, color: '#fbbf24' },
  { label: 'Velocity Score',      value: 87, color: '#c084fc' },
  { label: 'Risk Score (0–100)',  value: 96, color: '#2dd4bf' },
];

const MetricBars = () => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: 0.1 }}
    className="bg-white border border-slate-200/70 rounded-3xl p-7"
    style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
  >
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.28em] mb-5">
      Adjudicator Confidence Profile
    </p>
    <div className="space-y-4">
      {METRICS.map((m, i) => (
        <div key={m.label}>
          <div className="flex justify-between mb-1.5">
            <span className="text-[12px] font-bold text-slate-700">{m.label}</span>
            <span className="text-[12px] font-black" style={{ color: m.color }}>{m.value}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${m.value}%` }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 + 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ backgroundColor: m.color, boxShadow: `0 0 8px ${m.color}50` }}
            />
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

// ─── Live threat card (NxtDevs-style) ─────────────────────────────────────────
const LiveThreatCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="bg-[#0d1117] rounded-3xl overflow-hidden border border-slate-800/60"
    style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
  >
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Threat Detected</span>
      </div>
      <span className="text-[9px] font-bold text-teal-400 bg-teal-400/10 px-2.5 py-1 rounded-full border border-teal-400/20">
        Sentinel Active
      </span>
    </div>
    <div className="px-6 py-5 font-mono text-xs space-y-2">
      {[
        ['platform',    'YouTube',                                    '#fbbf24'],
        ['account',     '@SportsLeaks_HD',                            '#e2e8f0'],
        ['title',       '"Champions League Final Full Match"',         '#e2e8f0'],
        ['l2_distance', '0.12',                                       '#f87171'],
        ['phash_match', 'true',                                       '#f87171'],
      ].map(([k, v, c]) => (
        <div key={k} className="flex justify-between">
          <span className="text-slate-500">{k}</span>
          <span style={{ color: c }} className="truncate max-w-[200px]">{v}</span>
        </div>
      ))}
    </div>
    <div className="mx-4 mb-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
      <p className="text-[10px] font-bold text-slate-300 mb-3">Adjudicator Classification:</p>
      <div className="space-y-2">
        {[
          ['SEVERE PIRACY — raw repost, no transformation', true],
          ['FAIR USE — commentary and reaction content',    false],
        ].map(([opt, active]) => (
          <div
            key={opt}
            className={`px-3 py-2 rounded-xl text-[10px] font-medium border ${
              active
                ? 'bg-red-500/15 border-red-500/30 text-red-300'
                : 'bg-slate-700/40 border-slate-600/40 text-slate-400'
            }`}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

// ─── Verdict duel card ────────────────────────────────────────────────────────
const VerdictDuel = () => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay: 0.15 }}
    className="bg-white border border-slate-200/70 rounded-3xl p-7"
    style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
  >
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.28em] mb-5">
      Routing Decision
    </p>
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'SEVERE PIRACY',        sub: 'Routed → Enforcer',  color: '#f87171', bg: '#fef2f2', border: '#fecaca' },
        { label: 'FAIR USE',             sub: 'Routed → Broker',    color: '#2dd4bf', bg: '#f0fdfa', border: '#99f6e4' },
        { label: 'DMCA Drafted',         sub: '17 U.S.C. § 512(c)', color: '#f87171', bg: '#fef2f2', border: '#fecaca' },
        { label: 'Contract Minted',      sub: 'Polygon (Mock)',      color: '#34d399', bg: '#f0fdf4', border: '#bbf7d0' },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-2xl p-4 border"
          style={{ backgroundColor: item.bg, borderColor: item.border }}
        >
          <p className="text-[11px] font-black mb-1" style={{ color: item.color }}>{item.label}</p>
          <p className="text-[10px] text-slate-500 font-medium">{item.sub}</p>
        </div>
      ))}
    </div>
  </motion.div>
);

// ─── Full tech section ────────────────────────────────────────────────────────
const TechSection = () => (
  <section id="stack" className="py-28 px-8 bg-[#f6f7fc]">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <p className="text-[9px] font-bold text-teal-600 uppercase tracking-[0.3em] mb-4">Intelligence Engine</p>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
          AI-Powered<br /><span className="text-teal-600">Detection.</span>
        </h2>
        <p className="text-[17px] text-slate-500 max-w-lg mx-auto leading-relaxed">
          Dual-layer visual forensics combined with Gemini-powered legal reasoning — every incident
          classified with precision, every verdict backed by law.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <LiveThreatCard />
          <VerdictDuel />
        </div>
        <div className="space-y-6">
          <MetricBars />
          {/* Mini stat row */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'DMCA Notices',    value: '5K+',   color: '#f87171' },
              { label: 'Contracts Minted',value: '2.1K',  color: '#34d399' },
              { label: 'Vault Vectors',   value: '180K',  color: '#818cf8' },
              { label: 'Avg. Scan Time',  value: '0.05s', color: '#fbbf24' },
            ].map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl p-5 border border-slate-200/70 bg-white flex flex-col gap-1"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
              >
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default TechSection;
