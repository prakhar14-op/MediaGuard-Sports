import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

// ─── The "last card" from the original landing — verdict duel / final CTA ─────
const FinalCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    className="bg-[#0d1117] rounded-3xl overflow-hidden border border-slate-800/60 max-w-2xl mx-auto mb-16"
    style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
  >
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Swarm Mission Complete
        </span>
      </div>
      <span className="text-[9px] font-bold text-teal-400 bg-teal-400/10 px-2.5 py-1 rounded-full border border-teal-400/20">
        Awaiting Approval
      </span>
    </div>

    {/* Summary rows */}
    <div className="px-6 py-5 font-mono text-xs space-y-2.5">
      {[
        ['suspects_found',    '18',                    '#e2e8f0'],
        ['critical_matches',  '3',                     '#f87171'],
        ['dmca_drafted',      '5',                     '#fbbf24'],
        ['contracts_minted',  '3',                     '#34d399'],
        ['human_action',      'approve / reject',      '#2dd4bf'],
      ].map(([k, v, c]) => (
        <div key={k} className="flex justify-between">
          <span className="text-slate-500">{k}</span>
          <span style={{ color: c }} className="font-bold">{v}</span>
        </div>
      ))}
    </div>

    {/* Action buttons */}
    <div className="px-6 pb-6 grid grid-cols-2 gap-3">
      <div className="px-4 py-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-center">
        <p className="text-[10px] font-black text-teal-300 uppercase tracking-wider mb-0.5">Approve & Send</p>
        <p className="text-[9px] text-slate-500">DMCA dispatched to platform legal</p>
      </div>
      <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
        <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wider mb-0.5">Activate Contract</p>
        <p className="text-[9px] text-slate-500">Rev-share goes live on Polygon</p>
      </div>
    </div>
  </motion.div>
);

const CTASection = ({ onLaunch }) => (
  <section className="py-28 px-8 bg-white relative overflow-hidden">
    {/* Subtle radial glow */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(20,184,166,0.07) 0%, transparent 70%)',
      }}
    />

    <div className="max-w-3xl mx-auto text-center relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[9px] font-bold text-teal-600 uppercase tracking-[0.3em] mb-4">
          Google Solution Challenge 2026 · SDG 8 & 9
        </p>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
          Protect What<br /><span className="text-teal-600">Belongs to You.</span>
        </h2>
        <p className="text-[16px] text-slate-500 leading-relaxed mb-12 max-w-xl mx-auto">
          Deploy the full six-agent swarm against any official video URL. The system handles
          detection, legal classification, enforcement, and monetization — autonomously.
        </p>
      </motion.div>

      {/* Final summary card */}
      <FinalCard />

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-wrap items-center justify-center gap-4"
      >
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onLaunch}
          className="px-8 py-4 bg-slate-900 hover:bg-teal-700 text-white font-bold text-sm rounded-full transition-all duration-200 shadow-xl shadow-slate-900/20 flex items-center gap-2"
        >
          Launch Swarm Dashboard <ArrowRight className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' })}
          className="px-8 py-4 bg-white border border-slate-200 text-slate-700 hover:border-teal-400 hover:text-teal-700 font-bold text-sm rounded-full transition-all duration-200 shadow-sm"
        >
          View Architecture
        </motion.button>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
