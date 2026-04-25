import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import RippleGrid from './RippleGrid';
import FlipWords from './FlipWords';
import CobeGlobe from './CobeGlobe';

// ─── GSSoC-style white stat card ─────────────────────────────────────────────
const StatCard = ({ label, value, sub, tag, delay = 0, rotate = 0, x = 0, y = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: -60, rotate: rotate - 10, scale: 0.72 }}
    animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
    transition={{ delay, duration: 0.9, type: 'spring', stiffness: 130, damping: 17 }}
    style={{ position: 'absolute', left: x, top: y }}
  >
    <motion.div
      animate={{ y: [0, -9, 0] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.5 }}
      className="bg-white rounded-2xl p-5 w-[188px]"
      style={{
        boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div className="w-7 h-[3px] bg-teal-500 rounded-full mb-3" />
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.24em] mb-1">{label}</p>
      <p className="text-[2rem] font-black text-slate-900 leading-none mb-1.5">{value}</p>
      <p className="text-[11px] text-slate-400 font-medium mb-3 leading-snug">{sub}</p>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200/60 rounded-full text-[8px] font-bold text-teal-700 uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
        {tag}
      </span>
    </motion.div>
  </motion.div>
);

// ─── Live ticker ──────────────────────────────────────────────────────────────
const TICKER_EVENTS = [
  { icon: '🕷️', text: 'Spider identified 18 suspects across YouTube',         color: '#2dd4bf' },
  { icon: '👁️', text: 'Sentinel: CRITICAL match — L2 distance 0.09',          color: '#fbbf24' },
  { icon: '⚖️', text: 'Adjudicator: SEVERE PIRACY → routed to Enforcer',      color: '#a78bfa' },
  { icon: '🔨', text: 'Enforcer: DMCA notice drafted for @PirateHD',           color: '#f87171' },
  { icon: '💰', text: 'Broker: Revenue-share contract minted on Polygon',      color: '#34d399' },
  { icon: '✅', text: 'Swarm complete — 8 incidents resolved autonomously',    color: '#818cf8' },
];

const LiveTicker = () => (
  <div
    className="relative overflow-hidden rounded-xl bg-[#020c0b]/80 border border-teal-500/15 py-2.5"
    style={{ boxShadow: '0 4px 20px rgba(20,184,166,0.08)' }}
  >
    <div className="absolute left-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
      style={{ background: 'linear-gradient(to right, #020c0b, transparent)' }} />
    <div className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
      style={{ background: 'linear-gradient(to left, #020c0b, transparent)' }} />
    <motion.div
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
      className="flex gap-6 w-max px-4"
    >
      {[...TICKER_EVENTS, ...TICKER_EVENTS].map((e, i) => (
        <span key={i} className="inline-flex items-center gap-2 text-[10px] font-medium whitespace-nowrap">
          <span>{e.icon}</span>
          <span style={{ color: e.color }}>{e.text}</span>
          <span className="text-slate-700 mx-1">·</span>
        </span>
      ))}
    </motion.div>
  </div>
);

// ─── Card positions around the globe ─────────────────────────────────────────
const STAT_CARDS = [
  { label: 'Detection Accuracy', value: '99.8%', sub: 'CLIP + pHash dual-layer',      tag: 'AI-Powered',    delay: 0.08, rotate: 4,  x: '2%',  y: '2%'  },
  { label: 'Swarm Agents',       value: '6',     sub: 'Fully autonomous pipeline',     tag: 'CrewAI',        delay: 0.20, rotate: -3, x: '60%', y: '0%'  },
  { label: 'Scan Speed',         value: '0.05s', sub: 'Per thumbnail, zero-download',  tag: 'Real-Time',     delay: 0.32, rotate: 5,  x: '0%',  y: '50%' },
  { label: 'Platforms Covered',  value: '7+',    sub: 'YouTube, TikTok & more',        tag: 'Global Reach',  delay: 0.44, rotate: -4, x: '58%', y: '54%' },
  { label: 'Challenge Year',     value: '2026',  sub: 'Google Solution Challenge',     tag: 'SDG 8 & 9',     delay: 0.56, rotate: 3,  x: '26%', y: '84%' },
];

// ─── Hero ─────────────────────────────────────────────────────────────────────
const HeroSection = ({ onLaunch }) => (
  <section
    className="relative min-h-screen overflow-hidden"
    style={{ background: 'linear-gradient(140deg, #daf5f0 0%, #edf0f8 50%, #e2e8f6 100%)' }}
  >
    {/* Dot pattern */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: 'radial-gradient(circle, #9abfb8 1px, transparent 1px)',
        backgroundSize: '26px 26px',
        opacity: 0.28,
      }}
    />

    {/* Ripple grid — interactive */}
    <RippleGrid rows={12} cols={26} cellSize={56} />

    <div className="relative z-10 max-w-7xl mx-auto px-8 lg:px-12 flex flex-col lg:flex-row items-center gap-0 min-h-screen pt-24">

      {/* LEFT — copy */}
      <div className="flex-none w-full lg:w-[480px] xl:w-[520px] py-12 lg:pr-8">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 mb-7"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-[9px] font-bold text-teal-700 uppercase tracking-[0.22em]">
            Autonomous IP Protection · Google Solution Challenge 2026
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="font-black text-slate-900 tracking-tight leading-[0.92] mb-5"
          style={{ fontSize: 'clamp(2.8rem, 5.5vw, 4.2rem)' }}
        >
          MediaGuard<br />Sports<br />
          <FlipWords />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.6 }}
          className="text-[14px] font-bold text-teal-600 mb-4 tracking-wide uppercase"
        >
          Detect · Adjudicate · Monetize
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.6 }}
          className="text-slate-500 leading-relaxed mb-10 text-[15px] max-w-[430px]"
        >
          A six-agent AI swarm that autonomously hunts pirated sports content across the global web,
          classifies each incident under IP law, then either dispatches a DMCA takedown or deploys
          a revenue-sharing smart contract — human approval only at the final step.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44, duration: 0.55 }}
          className="flex flex-wrap items-center gap-3 mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLaunch}
            className="px-7 py-3.5 bg-slate-900 hover:bg-teal-700 text-white font-bold text-sm rounded-full transition-all duration-200 shadow-xl shadow-slate-900/20 flex items-center gap-2"
          >
            Launch Swarm <ArrowRight className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-7 py-3.5 bg-white/80 border border-slate-200 text-slate-700 hover:border-teal-400 hover:text-teal-700 font-bold text-sm rounded-full transition-all duration-200 shadow-sm"
          >
            Explore Agents
          </motion.button>
        </motion.div>

        {/* Ticker */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, duration: 0.55 }}
        >
          <LiveTicker />
        </motion.div>
      </div>

      {/* RIGHT — Globe + floating cards */}
      <div className="flex-1 relative hidden lg:flex items-center justify-end pr-4" style={{ minHeight: 600 }}>
        <div className="relative" style={{ width: 560, height: 560 }}>
          {/* Soft glow behind globe */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 70%)' }}
          />
          {/* Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', top: -20, left: -20, width: 600, height: 600 }}
          >
            <CobeGlobe />
          </motion.div>

          {/* Floating stat cards */}
          {STAT_CARDS.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
