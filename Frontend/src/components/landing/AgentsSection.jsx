import React from 'react';
import { motion } from 'framer-motion';
import { Database, Globe, Eye, Brain, Gavel, Coins } from 'lucide-react';

const AGENTS = [
  {
    name: 'The Archivist',
    phase: 'Phase 1 · Ingestion',
    desc: 'Downloads official video via yt-dlp, extracts 1 frame/sec, runs each through HuggingFace CLIP, stores 512-D embeddings in FAISS. Generates SHA-256 + mock Polygon tx hash as proof of ownership.',
    icon: Database,
    accent: '#3b82f6',
    glow: 'rgba(59,130,246,0.15)',
  },
  {
    name: 'The Spider',
    phase: 'Phase 2 · OSINT Hunt',
    desc: 'Gemini generates 4 optimised search variants. yt-dlp scrapes YouTube zero-download — metadata and thumbnails only. Deduplicates by URL, maps every suspect to a country centroid.',
    icon: Globe,
    accent: '#6366f1',
    glow: 'rgba(99,102,241,0.15)',
  },
  {
    name: 'The Sentinel',
    phase: 'Phase 3 · Detection',
    desc: 'Dual-layer: CLIP L2 vector search returns top-3 vault matches with timestamps. pHash cross-check eliminates false positives. Redis velocity tracking auto-escalates repeat offenders to CRITICAL.',
    icon: Eye,
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
  },
  {
    name: 'The Adjudicator',
    phase: 'Phase 4 · Legal Triage',
    desc: 'Gemini 2.5 Flash classifies SEVERE PIRACY vs FAIR USE with a 0-100 risk score, legal basis citation, and recommended action. Redis caches verdicts 24h — same account never hits Gemini twice.',
    icon: Brain,
    accent: '#a855f7',
    glow: 'rgba(168,85,247,0.15)',
  },
  {
    name: 'The Enforcer',
    phase: 'Phase 5 · Takedown',
    desc: 'Gemini drafts legally precise 17 U.S.C. § 512(c) DMCA notices. Escalation tiers: standard → expedited → legal referral. Platform-specific legal routing. Human approves before send.',
    icon: Gavel,
    accent: '#ef4444',
    glow: 'rgba(239,68,68,0.15)',
  },
  {
    name: 'The Broker',
    phase: 'Phase 6 · Monetize',
    desc: 'Deploys dynamic rev-share smart contracts. Platinum viral content (1M+ views) gets 20/80 splits. Revenue projections use real platform CPM rates. Contracts minted with mock Polygon tx hash.',
    icon: Coins,
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
  },
];

const AgentCard = ({ agent, index }) => {
  const Icon = agent.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative bg-slate-900/60 border border-white/5 rounded-3xl p-7 hover:border-white/10 transition-all duration-300 overflow-hidden cursor-default"
    >
      {/* Glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
        style={{ background: `radial-gradient(circle at 30% 30%, ${agent.glow}, transparent 70%)` }}
      />

      <div className="relative z-10">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="p-3 rounded-2xl shrink-0"
            style={{ backgroundColor: `${agent.accent}15`, border: `1px solid ${agent.accent}25` }}
          >
            <Icon className="w-6 h-6" style={{ color: agent.accent }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: agent.accent }}>
              {agent.phase}
            </p>
            <h3 className="text-lg font-black text-white leading-tight">{agent.name}</h3>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{agent.desc}</p>
      </div>
    </motion.div>
  );
};

const AgentsSection = () => (
  <section id="agents" className="py-32 px-8 bg-[#020617] relative">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_50%,rgba(59,130,246,0.04),transparent)] pointer-events-none" />

    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-20"
      >
        <p className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.25em] mb-4">The Autonomous Swarm</p>
        <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-6">
          6 Agents. One Pipeline.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Zero Manual Work.
          </span>
        </h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
          One URL triggers the entire swarm. Each agent hands off to the next automatically.
          Humans only intervene at the final approval step.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AGENTS.map((agent, i) => (
          <AgentCard key={agent.name} agent={agent} index={i} />
        ))}
      </div>
    </div>
  </section>
);

export default AgentsSection;
