import React from 'react';
import { motion } from 'framer-motion';

const HOW_STEPS = [
  { num: '01', label: 'Spider Crawls',     desc: 'Gemini-optimised OSINT queries',  color: '#818cf8' },
  { num: '02', label: 'Sentinel Scans',    desc: 'CLIP + pHash dual-layer',         color: '#fbbf24' },
  { num: '03', label: 'Adjudicator Rules', desc: 'Gemini 2.5 Flash verdict',        color: '#c084fc' },
  { num: '04', label: 'Enforcer Drafts',   desc: '17 U.S.C. § 512(c) notice',      color: '#f87171' },
  { num: '05', label: 'Broker Mints',      desc: 'Dynamic rev-share contract',      color: '#34d399' },
  { num: '06', label: 'Human Approves',    desc: 'One click. Mission complete.',    color: '#2dd4bf' },
];

const LOG_LINES = [
  ['#818cf8', '🕷️  [Phase 1] Spider — Generating 4 OSINT search variants via Gemini 2.5 Flash...'],
  ['#475569', '   → Identified 18 unique suspects across YouTube. Zero files downloaded.'],
  ['#fbbf24', '👁️  [Phase 2] Sentinel — Scanning 18 thumbnails (CLIP L2 + pHash dual-layer)...'],
  ['#475569', '   → 3 CRITICAL  |  5 WARNING  |  10 CLEAN'],
  ['#c084fc', '⚖️  [Phase 3] Adjudicator — Classifying 8 flagged incidents via Gemini 2.5 Flash...'],
  ['#475569', '   → 5 × SEVERE PIRACY → Enforcer  |  3 × FAIR USE → Broker'],
  ['#f87171', '🔨 [Phase 4] Enforcer — Drafting 5 DMCA notices (17 U.S.C. § 512(c))...'],
  ['#475569', '   → Notices staged. Awaiting human approval before dispatch.'],
  ['#34d399', '💰 [Phase 5] Broker — Minting 3 rev-share contracts on Polygon (Mock)...'],
  ['#475569', '   → Contracts minted. Awaiting human activation.'],
  ['#2dd4bf', '✅ [Swarm Complete] All phases executed. Human-in-the-loop ready.'],
];

const PipelineSection = () => (
  <section id="pipeline" className="py-28 px-8 bg-white">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <p className="text-[9px] font-bold text-teal-600 uppercase tracking-[0.3em] mb-4">The Agentic Pipeline</p>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
          One URL.<br /><span className="text-teal-600">Full Autonomy.</span>
        </h2>
        <p className="text-[17px] text-slate-500 max-w-lg mx-auto leading-relaxed">
          POST{' '}
          <code className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md text-sm font-mono border border-teal-100">
            /api/swarm/run
          </code>
          {' '}— all five phases execute autonomously, streaming live events to the dashboard via Socket.io.
        </p>
      </motion.div>

      {/* Step flow */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-6 relative mb-16">
        <div
          className="hidden md:block absolute top-10 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(20,184,166,0.25), transparent)' }}
        />
        {HOW_STEPS.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center relative z-10 flex-1"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 3 }}
              className="w-[80px] h-[80px] rounded-2xl flex items-center justify-center mb-4"
              style={{
                backgroundColor: `${step.color}12`,
                border: `1.5px solid ${step.color}25`,
                boxShadow: `0 4px 20px ${step.color}18`,
              }}
            >
              <span className="text-lg font-black" style={{ color: step.color }}>{step.num}</span>
            </motion.div>
            <p className="text-[12px] font-black text-slate-900 mb-1">{step.label}</p>
            <p className="text-[10px] text-slate-400 font-medium leading-snug">{step.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-[#0d1117] rounded-3xl p-8 font-mono overflow-x-auto border border-slate-800/60"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-4 text-[9px] text-slate-500 uppercase tracking-widest font-bold">swarm_output.log</span>
        </div>
        <div className="space-y-1.5 text-[11.5px]">
          {LOG_LINES.map(([color, msg], i) => (
            <motion.p
              key={i}
              style={{ color }}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.22 + i * 0.07 }}
            >
              {msg}
            </motion.p>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default PipelineSection;
