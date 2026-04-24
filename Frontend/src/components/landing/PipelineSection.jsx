import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Eye, Brain, Gavel, Coins, ArrowRight, CheckCircle } from 'lucide-react';

const STEPS = [
  { icon: Globe,  label: 'Spider Crawls',       sub: 'Gemini-optimised queries',    color: '#6366f1' },
  { icon: Eye,    label: 'Sentinel Scans',       sub: 'CLIP + pHash dual-layer',     color: '#f59e0b' },
  { icon: Brain,  label: 'Adjudicator Rules',    sub: 'Gemini 2.5 Flash verdict',    color: '#a855f7' },
  { icon: Gavel,  label: 'Enforcer Drafts DMCA', sub: '17 U.S.C. § 512(c) notice',  color: '#ef4444' },
  { icon: Coins,  label: 'Broker Mints Contract',sub: 'Dynamic rev-share split',     color: '#10b981' },
  { icon: CheckCircle, label: 'Human Approves',  sub: 'Final click. Done.',          color: '#3b82f6' },
];

const PipelineSection = () => (
  <section className="py-32 px-8 bg-slate-950 relative overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-20"
      >
        <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-[0.25em] mb-4">The Agentic Pipeline</p>
        <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-6">
          One URL.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
            Full Autonomy.
          </span>
        </h2>
        <p className="text-lg text-slate-400 max-w-xl mx-auto font-medium">
          POST <code className="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded text-sm">/api/swarm/run</code> and watch the swarm execute in real-time via Socket.io.
        </p>
      </motion.div>

      {/* Pipeline steps */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent hidden lg:block" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex flex-col items-center text-center relative"
              >
                <div
                  className="w-24 h-24 rounded-3xl flex items-center justify-center mb-4 relative z-10 border"
                  style={{
                    backgroundColor: `${step.color}12`,
                    borderColor: `${step.color}25`,
                    boxShadow: `0 0 30px ${step.color}15`,
                  }}
                >
                  <Icon className="w-8 h-8" style={{ color: step.color }} />
                </div>
                <p className="text-sm font-bold text-white mb-1 leading-tight">{step.label}</p>
                <p className="text-[10px] text-slate-500 font-medium">{step.sub}</p>

                {i < STEPS.length - 1 && (
                  <ArrowRight className="absolute top-10 -right-3 w-4 h-4 text-white/10 hidden lg:block" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Code snippet */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="mt-20 bg-slate-900/80 border border-white/5 rounded-3xl p-8 font-mono text-sm overflow-x-auto"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="ml-4 text-[10px] text-slate-500 uppercase tracking-widest">swarm_output.log</span>
        </div>
        <div className="space-y-2 text-xs">
          {[
            { t: 'blue',    m: '🕷️  [Phase 1] Spider crawling web for suspects...' },
            { t: 'indigo',  m: '   → Found 18 unique suspects across 4 search variants' },
            { t: 'amber',   m: '👁️  [Phase 2] Sentinel scanning 18 thumbnails (CLIP + pHash)...' },
            { t: 'amber',   m: '   → 3 CRITICAL matches | 5 WARNING | 10 CLEAN' },
            { t: 'purple',  m: '⚖️  [Phase 3] Adjudicator ruling 8 flagged incidents...' },
            { t: 'purple',  m: '   → 5 × SEVERE PIRACY → Enforcer | 3 × FAIR USE → Broker' },
            { t: 'red',     m: '🔨 [Phase 4] Enforcer drafting 5 DMCA notices...' },
            { t: 'red',     m: '   → Notices staged. Awaiting human approval.' },
            { t: 'emerald', m: '💰 [Phase 5] Broker minting 3 rev-share contracts...' },
            { t: 'emerald', m: '   → Contracts minted on Polygon (Mock). Awaiting activation.' },
            { t: 'blue',    m: '✅ [Swarm Complete] Mission complete. Human-in-the-loop ready.' },
          ].map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className={`text-${line.t}-400`}
            >
              {line.m}
            </motion.p>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default PipelineSection;
