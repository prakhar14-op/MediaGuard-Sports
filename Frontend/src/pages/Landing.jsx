import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield, ArrowRight, Database, Globe, Eye, Brain, Gavel, Coins,
  Zap, CheckCircle, AlertCircle,
} from 'lucide-react';
import { FlipWords } from '../components/ui/FlipWords';
import createGlobe from 'cobe';

// ─── COBE Globe ───────────────────────────────────────────────────────────────
const CobeGlobe = () => {
  const canvasRef = useRef(null);
  const globeRef  = useRef(null);
  const phiRef    = useRef(0);
  const rafRef    = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const dpr  = Math.min(window.devicePixelRatio, 2);
    const size = 600;
    globeRef.current = createGlobe(canvasRef.current, {
      devicePixelRatio: dpr,
      width:  size * dpr,
      height: size * dpr,
      phi: 0, theta: 0.25,
      dark: 1, diffuse: 1.6,
      mapSamples: 20000, mapBrightness: 5, mapBaseBrightness: 0.04,
      baseColor:   [0.04, 0.14, 0.14],
      markerColor: [0.1,  0.85, 0.75],
      glowColor:   [0.05, 0.45, 0.42],
      scale: 1.05,
      markers: [
        { location: [37.78,  -122.44], size: 0.05 },
        { location: [51.51,   -0.13],  size: 0.05 },
        { location: [35.68,  139.65],  size: 0.04 },
        { location: [28.61,   77.21],  size: 0.06 },
        { location: [-23.55, -46.63],  size: 0.04 },
        { location: [25.20,   55.27],  size: 0.04 },
        { location: [1.35,   103.82],  size: 0.03 },
        { location: [48.85,    2.35],  size: 0.04 },
        { location: [-33.87, 151.21],  size: 0.04 },
        { location: [55.75,   37.62],  size: 0.04 },
        { location: [19.43,  -99.13],  size: 0.04 },
        { location: [31.23,  121.47],  size: 0.05 },
      ],
    });
    const animate = () => {
      phiRef.current += 0.003;
      globeRef.current?.update({ phi: phiRef.current });
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(rafRef.current); globeRef.current?.destroy(); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: 600, height: 600 }} />;
};

// ─── CometCard wrapper ────────────────────────────────────────────────────────
// Pure CSS/JS comet-trail effect — no external package needed
const CometCard = ({ children, className = '' }) => {
  const cardRef  = useRef(null);
  const cometRef = useRef(null);
  const rafId    = useRef(null);
  const pos      = useRef({ x: 0, y: 0, active: false });

  const onMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    pos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };
    if (!rafId.current) {
      const tick = () => {
        const comet = cometRef.current;
        if (comet && pos.current.active) {
          comet.style.left   = `${pos.current.x}px`;
          comet.style.top    = `${pos.current.y}px`;
          comet.style.opacity = '1';
        }
        rafId.current = requestAnimationFrame(tick);
      };
      rafId.current = requestAnimationFrame(tick);
    }
  }, []);

  const onLeave = useCallback(() => {
    pos.current.active = false;
    if (cometRef.current) cometRef.current.style.opacity = '0';
    cancelAnimationFrame(rafId.current);
    rafId.current = null;
  }, []);

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* Comet trail dot */}
      <div
        ref={cometRef}
        className="pointer-events-none absolute z-20 transition-opacity duration-300"
        style={{
          width: 6, height: 6,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #2dd4bf 0%, transparent 70%)',
          boxShadow: '0 0 12px 6px rgba(45,212,191,0.5), 0 0 40px 16px rgba(45,212,191,0.15)',
          transform: 'translate(-50%, -50%)',
          opacity: 0,
        }}
      />
      {/* Comet tail */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: 'radial-gradient(600px circle at var(--mx,50%) var(--my,50%), rgba(45,212,191,0.04) 0%, transparent 60%)',
        }}
        ref={(el) => {
          if (!el) return;
          const card = cardRef.current;
          if (!card) return;
          const update = () => {
            if (pos.current.active) {
              const rect = card.getBoundingClientRect();
              el.style.setProperty('--mx', `${pos.current.x}px`);
              el.style.setProperty('--my', `${pos.current.y}px`);
            }
            requestAnimationFrame(update);
          };
          update();
        }}
      />
      {children}
    </div>
  );
};

// ─── Ripple Grid ──────────────────────────────────────────────────────────────
const RippleGrid = ({ rows = 10, cols = 24, cellSize = 60 }) => {
  const [clicked, setClicked] = useState(null);
  const [key, setKey] = useState(0);
  const cells = useMemo(() => Array.from({ length: rows * cols }, (_, i) => i), [rows, cols]);

  return (
    <div
      className="absolute inset-0 overflow-hidden z-0"
      style={{ maskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, black 20%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, black 20%, transparent 100%)' }}
    >
      {/* pointer-events on the inner grid only */}
      <div
        className="cursor-crosshair"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          width: cols * cellSize,
          marginInline: 'auto',
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setClicked({
            row: Math.floor((e.clientY - rect.top) / cellSize),
            col: Math.floor((e.clientX - rect.left) / cellSize),
          });
          setKey((k) => k + 1);
        }}
      >
        {cells.map((idx) => {
          const r = Math.floor(idx / cols), c = idx % cols;
          const dist = clicked ? Math.hypot(clicked.row - r, clicked.col - c) : 0;
          return (
            <div
              key={`${key}-${idx}`}
              className={`border border-teal-600/10 hover:bg-teal-500/10 transition-colors duration-100 will-change-transform ${clicked ? 'animate-cell-ripple' : ''}`}
              style={{
                width: cellSize,
                height: cellSize,
                '--delay': `${clicked ? Math.max(0, dist * 28) : 0}ms`,
                '--duration': `${130 + dist * 48}ms`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// ─── Stat Card (GSSoC white card style) ──────────────────────────────────────
const StatCard = ({ label, value, sub, tag, delay = 0, rotate = 0 }) => (
  <motion.div
    initial={{ y: -60, opacity: 0, rotate: rotate - 10, scale: 0.72, filter: 'blur(8px)' }}
    animate={{ y: 0, opacity: 1, rotate, scale: 1, filter: 'blur(0px)' }}
    transition={{ delay, duration: 1.0, type: 'spring', stiffness: 120, damping: 16 }}
  >
    <motion.div
      animate={{ y: [0, -9, 0], rotate: [rotate, rotate + 1.5, rotate] }}
      transition={{ duration: 5 + delay * 1.5, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.3 }}
      whileHover={{ scale: 1.06, boxShadow: '0 12px 40px rgba(20,184,166,0.18), 0 2px 8px rgba(0,0,0,0.06)' }}
      className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 border border-slate-100 w-[164px] cursor-default"
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div className="w-6 h-[2.5px] bg-teal-500 rounded-full mb-2.5" />
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.22em] mb-0.5">{label}</p>
      <p className="text-[1.65rem] font-black text-slate-900 leading-none mb-1">{value}</p>
      <p className="text-[10px] text-slate-400 font-medium mb-2.5 leading-snug">{sub}</p>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 border border-teal-200/60 rounded-full text-[8px] font-bold text-teal-700 uppercase tracking-wider">
        <span className="w-1 h-1 rounded-full bg-teal-500 shrink-0" />{tag}
      </span>
    </motion.div>
  </motion.div>
);

// ─── Nav ──────────────────────────────────────────────────────────────────────
const Nav = ({ onLaunch }) => {
  const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <motion.nav
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-5"
    >
      <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl border border-slate-200/70 rounded-full px-3 py-2 shadow-lg shadow-slate-200/50">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors"
        >
          <Shield className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-black text-slate-900 tracking-tight">MediaGuard<span className="text-teal-600">'26</span></span>
        </button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        {[['agents', 'Agent Swarm'], ['pipeline', 'Pipeline'], ['stack', 'Tech Stack']].map(([id, label]) => (
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

// ─── Live Activity Ticker ─────────────────────────────────────────────────────
const TICKER_EVENTS = [
  { icon: '🕷️', text: 'Spider found 18 suspects on YouTube',      time: '2s ago',  color: '#818cf8' },
  { icon: '👁️', text: 'Sentinel: CRITICAL match — L2 0.09',       time: '8s ago',  color: '#fbbf24' },
  { icon: '⚖️', text: 'Adjudicator: SEVERE PIRACY → Enforcer',    time: '14s ago', color: '#c084fc' },
  { icon: '🔨', text: 'Enforcer: DMCA drafted for @PirateHD',      time: '21s ago', color: '#f87171' },
  { icon: '💰', text: 'Broker: Rev-share contract minted',         time: '35s ago', color: '#34d399' },
  { icon: '✅', text: 'Swarm complete — 8 incidents resolved',     time: '1m ago',  color: '#2dd4bf' },
];

const LiveTicker = () => (
  <div className="relative overflow-hidden rounded-2xl bg-[#0d1117] border border-slate-800/60 py-2.5"
    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
    <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
      style={{ background: 'linear-gradient(to right, #0d1117, transparent)' }} />
    <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
      style={{ background: 'linear-gradient(to left, #0d1117, transparent)' }} />
    <motion.div
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      className="flex gap-6 w-max px-4"
    >
      {[...TICKER_EVENTS, ...TICKER_EVENTS].map((e, i) => (
        <span key={i} className="inline-flex items-center gap-2 text-[11px] font-medium whitespace-nowrap">
          <span>{e.icon}</span>
          <span style={{ color: e.color }}>{e.text}</span>
          <span className="text-slate-600">{e.time}</span>
          <span className="text-slate-700 mx-1">·</span>
        </span>
      ))}
    </motion.div>
  </div>
);

// ─── Hero ─────────────────────────────────────────────────────────────────────
const STAT_CARDS = [
  { label: 'Detection Accuracy', value: '99.8%', sub: 'CLIP + pHash dual-layer',     tag: 'AI-Powered',  delay: 0.10, rotate: 5  },
  { label: 'Swarm Agents',       value: '6',     sub: 'Fully autonomous pipeline',    tag: 'CrewAI',      delay: 0.24, rotate: -4 },
  { label: 'Scan Speed',         value: '0.05s', sub: 'Per thumbnail, zero-download', tag: 'Real-Time',   delay: 0.38, rotate: 6  },
  { label: 'Platforms',          value: '7+',    sub: 'YouTube, TikTok & more',       tag: 'Global Reach',delay: 0.52, rotate: -3 },
];

// Scattered — no symmetry, globe centre stays clear
const CARD_POSITIONS = [
  { top: '4%',   left: '-6%'  },   // upper-left, spills off edge
  { top: '-4%',  left: '44%'  },   // top, slightly right of centre
  { bottom: '6%',left: '-2%'  },   // lower-left
  { bottom: '2%',right: '-8%' },   // lower-right, spills off edge
];

const WORDS = ['Detects', 'Adjudicates', 'Monetizes', 'Protects'];

const Hero = ({ onLaunch }) => (
  <section
    className="relative min-h-screen overflow-hidden pt-24"
    style={{ background: 'linear-gradient(140deg, #daf2ed 0%, #edf0f8 50%, #e2e8f6 100%)' }}
  >
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

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, duration: 0.55 }}
          className="mt-8 max-w-[430px]">
          <LiveTicker />
        </motion.div>
      </div>

      {/* RIGHT — globe + 4 corner cards */}
      <div className="flex-1 relative hidden lg:flex items-center justify-end pr-4" style={{ minHeight: 600 }}>
        <div className="relative" style={{ width: 520, height: 520 }}>
          {/* Glow */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)' }} />
          {/* Globe — centred */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', top: -40, left: -40, width: 600, height: 600 }}
          >
            <CobeGlobe />
          </motion.div>
          {/* 4 corner cards */}
          {STAT_CARDS.map((card, i) => (
            <div key={card.label} className="absolute z-10" style={CARD_POSITIONS[i]}>
              <StatCard {...card} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// ─── 3D Tilt Card (Aceternity-style) ─────────────────────────────────────────
const TiltCard = ({ children, className = '' }) => {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top)  / rect.height;
    setTilt({ x: (cy - 0.5) * -14, y: (cx - 0.5) * 14 });
    setGlowPos({ x: cx * 100, y: cy * 100 });
  }, []);

  const onLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
  }, []);

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.6 }}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      className={`relative ${className}`}
    >
      {/* Spotlight glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl z-10 transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(280px circle at ${glowPos.x}% ${glowPos.y}%, rgba(20,184,166,0.10) 0%, transparent 70%)`,
        }}
      />
      {children}
    </motion.div>
  );
};

// ─── Agent Split Cards ────────────────────────────────────────────────────────
const SplitCard = ({ num, tag, title, label, desc, cta, reverse = false }) => (
  <TiltCard>
    <motion.div
      initial={{ opacity: 0, y: 44 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} rounded-3xl overflow-hidden border border-slate-200/70 bg-white group hover:shadow-xl transition-shadow duration-500`}
    >
    <div className="md:w-[40%] bg-gradient-to-br from-[#eef0f8] to-[#e8eef6] relative flex items-center justify-center p-10 min-h-[200px] overflow-hidden">
      <span className="absolute bottom-0 right-3 text-[110px] font-black leading-none select-none pointer-events-none"
        style={{ color: 'rgba(148,163,184,0.18)' }}>
        {String(num).padStart(2, '0')}
      </span>
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: num * 0.3 }}
        className="relative z-10 px-5 py-2.5 bg-white/75 backdrop-blur-sm border border-slate-200/80 rounded-full shadow-sm">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.22em]">{tag}</span>
      </motion.div>
    </div>
    <div className="md:w-[60%] p-9 flex flex-col justify-center">
      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-[0.24em] mb-3">
        — {String(num).padStart(2, '0')}, {label}
      </p>
      <h3 className="text-2xl md:text-[1.7rem] font-black text-slate-900 mb-3 leading-tight group-hover:text-teal-700 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-slate-500 leading-relaxed mb-5 text-[14px]">{desc}</p>
      <div className="inline-flex">
        <span className="px-4 py-2 bg-teal-500/[0.08] border border-teal-500/20 rounded-full text-[10px] font-bold text-teal-700 uppercase tracking-[0.16em]">
          {cta}
        </span>
      </div>
    </div>
  </motion.div>
  </TiltCard>
);

const AGENTS = [
  { num: 1, tag: 'CLIP + FAISS',       label: 'INGESTION', title: 'The Archivist',   reverse: false,
    desc: 'Ingests any official video URL via yt-dlp. Extracts one frame per second, embeds each through HuggingFace CLIP (openai/clip-vit-base-patch32), and stores 512-dimensional vectors in a FAISS vault. Generates a SHA-256 integrity hash and mock Polygon transaction as timestamped proof of ownership.',
    cta: 'Vector Vault' },
  { num: 2, tag: 'OSINT CRAWLER',      label: 'HUNT',      title: 'The Spider',      reverse: true,
    desc: 'Gemini 2.5 Flash generates four platform-optimised search query variants from the official title. yt-dlp scrapes YouTube with zero downloads — metadata and thumbnails only. Deduplicates by URL, captures view counts and descriptions, and maps every suspect to a geographic centroid for the live threat map.',
    cta: 'Zero-Download Architecture' },
  { num: 3, tag: 'DUAL-LAYER SCAN',    label: 'DETECTION', title: 'The Sentinel',    reverse: false,
    desc: 'Layer 1: CLIP L2 vector search returns the top-3 closest vault matches with exact frame timestamps. Layer 2: perceptual hash (pHash) cross-check eliminates false positives. Redis velocity tracking monitors repeat offenders — accounts flagged three or more times auto-escalate to CRITICAL severity.',
    cta: 'pHash + CLIP Fusion' },
  { num: 4, tag: 'GEMINI 2.5 FLASH',   label: 'TRIAGE',    title: 'The Adjudicator', reverse: true,
    desc: 'Classifies each incident as SEVERE PIRACY or FAIR USE / FAN CONTENT with a 0–100 numeric risk score, a legal basis citation (e.g. 17 U.S.C. § 107 fair use factors), and a concrete recommended action. Redis caches verdicts for 24 hours — the same account, platform, and title never hits the Gemini API twice.',
    cta: 'Risk Score Engine' },
  { num: 5, tag: '17 U.S.C. § 512(c)', label: 'TAKEDOWN',  title: 'The Enforcer',   reverse: false,
    desc: 'Gemini drafts a legally precise DMCA takedown notice tailored to the platform, incident context, and offence history. Escalation tiers: standard (1st offence) → expedited with account suspension request (2nd) → full legal referral (3rd+). Platform-specific legal routing. Notices are staged — human approves before send.',
    cta: 'DMCA Automation' },
  { num: 6, tag: 'POLYGON MOCK',        label: 'MONETIZE',  title: 'The Broker',     reverse: true,
    desc: 'Deploys dynamic revenue-sharing smart contracts for Fair Use content. Virality tiers determine the split: Platinum (1M+ views) 20/80, Gold 25/75, Silver 30/70, Bronze 35/65. Revenue projections use real platform CPM rates (YouTube $4.50, TikTok $0.02). Contracts are minted with a mock Polygon tx hash and staged for human activation.',
    cta: 'Smart Contract Minting' },
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
        {AGENTS.map((a) => <SplitCard key={a.num} {...a} />)}
      </div>
    </div>
  </section>
);

// ─── Pipeline Section ─────────────────────────────────────────────────────────
const HOW_STEPS = [
  { icon: Globe,       label: 'Spider Crawls',    desc: 'Gemini-optimised OSINT queries', color: '#6366f1' },
  { icon: Eye,         label: 'Sentinel Scans',   desc: 'CLIP + pHash dual-layer',        color: '#f59e0b' },
  { icon: Brain,       label: 'Adjudicator Rules',desc: 'Gemini 2.5 Flash verdict',       color: '#a855f7' },
  { icon: Gavel,       label: 'Enforcer Drafts',  desc: '17 U.S.C. § 512(c) notice',     color: '#ef4444' },
  { icon: Coins,       label: 'Broker Mints',     desc: 'Dynamic rev-share contract',     color: '#10b981' },
  { icon: CheckCircle, label: 'Human Approves',   desc: 'One click. Mission complete.',   color: '#0d9488' },
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
          <code className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md text-sm font-mono border border-teal-100">
            /api/swarm/run
          </code>
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
                className="w-[88px] h-[88px] rounded-2xl flex items-center justify-center mb-4"
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

// ─── Tech Marquee ─────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  'HuggingFace CLIP', 'FAISS Vector DB', 'Gemini 2.5 Flash', 'CrewAI Agents',
  'yt-dlp OSINT', 'pHash Detection', 'Redis Caching', 'MongoDB Atlas',
  'Express.js', 'FastAPI', 'Socket.io', 'Polygon Mock', 'SHA-256 Proof',
  'PyTorch', 'OpenCV', 'ImageHash', 'Upstash Redis', 'Mongoose ODM',
];

const Marquee = () => (
  <div className="relative overflow-hidden py-4 bg-white border-y border-slate-100">
    <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
      style={{ background: 'linear-gradient(to right, white, transparent)' }} />
    <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
      style={{ background: 'linear-gradient(to left, white, transparent)' }} />
    <motion.div
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      className="flex gap-3 w-max"
    >
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span key={i}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200/70 rounded-full text-[11px] font-bold text-slate-600 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />{item}
        </span>
      ))}
    </motion.div>
  </div>
);

// ─── NxtDevs: Live Threat Card ────────────────────────────────────────────────
const LiveThreatCard = () => (
  <CometCard className="bg-[#0d1117] rounded-3xl overflow-hidden border border-slate-800/60"
    style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
    <motion.div
      initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.6 }}>
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Live Threat Detected</span>
      </div>
      <span className="text-[10px] font-bold text-teal-400 bg-teal-400/10 px-2.5 py-1 rounded-full border border-teal-400/20">
        Sentinel Active
      </span>
    </div>
    <div className="px-6 py-5 font-mono text-xs space-y-2">
      {[
        ['platform',    'YouTube',                                   '#fbbf24'],
        ['account',     '@SportsLeaks_HD',                           '#e2e8f0'],
        ['title',       '"Champions League Final Full Match"',        '#e2e8f0'],
        ['l2_distance', '0.12',                                      '#f87171'],
        ['phash_match', 'true',                                      '#f87171'],
      ].map(([k, v, c]) => (
        <div key={k} className="flex justify-between">
          <span className="text-slate-500">{k}</span>
          <span style={{ color: c }} className="truncate max-w-[200px]">{v}</span>
        </div>
      ))}
    </div>
    <div className="mx-4 mb-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
      <p className="text-[11px] font-bold text-slate-300 mb-3">What should the Adjudicator classify this as?</p>
      <div className="space-y-2">
        {[
          ['SEVERE PIRACY — raw repost, no transformation', true],
          ['FAIR USE — commentary and reaction content',    false],
        ].map(([opt, active]) => (
          <div key={opt}
            className={`px-3 py-2 rounded-xl text-[11px] font-medium border cursor-default ${active ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-slate-700/40 border-slate-600/40 text-slate-400'}`}>
            {opt}
          </div>
        ))}
      </div>
    </div>
    </motion.div>
  </CometCard>
);

// ─── NxtDevs: AI Reasoning Bubble ────────────────────────────────────────────
const AICoachBubble = () => (
  <CometCard className="bg-[#0d1117] rounded-3xl border border-slate-800/60"
    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
    <motion.div
      initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}
      className="p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
        <Brain className="w-4 h-4 text-teal-400" />
      </div>
      <div>
        <p className="text-[11px] font-black text-teal-400">Adjudicator Agent</p>
        <p className="text-[9px] text-slate-500 uppercase tracking-widest">Gemini 2.5 Flash · Low Temp</p>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
        <span className="text-[9px] text-teal-500 font-bold uppercase tracking-wider">Reasoning</span>
      </div>
    </div>
    <div className="bg-slate-800/50 rounded-2xl p-4 text-[12px] text-slate-300 leading-relaxed border border-slate-700/40">
      The thumbnail L2 distance of <span className="text-red-400 font-bold">0.12</span> confirms a pixel-level match.
      However, the description contains <span className="text-amber-400 font-bold">"reaction + commentary"</span> — applying
      17 U.S.C. § 107 fair use factors. Transformative purpose detected.
    </div>
    <div className="mt-3 flex items-center gap-2">
      <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/25 rounded-full text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
        → Routing to Broker
      </span>
      <span className="px-3 py-1 bg-slate-700/50 border border-slate-600/40 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        Risk Score: 34/100
      </span>
    </div>
    </motion.div>
  </CometCard>
);

// ─── NxtDevs: Metric Bars ─────────────────────────────────────────────────────
const METRICS = [
  { label: 'CLIP Vector Match',  value: 99, color: '#ef4444' },
  { label: 'pHash Confirmation', value: 94, color: '#f59e0b' },
  { label: 'Velocity Score',     value: 87, color: '#a855f7' },
  { label: 'Risk Score (0–100)', value: 96, color: '#0d9488' },
];

const MetricBars = () => (
  <TiltCard>
  <motion.div
    initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
    className="bg-white border border-slate-200/70 rounded-3xl p-7 h-full"
    style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.28em] mb-5">Adjudicator Confidence Profile</p>
    <div className="space-y-4">
      {METRICS.map((m, i) => (
        <div key={m.label}>
          <div className="flex justify-between mb-1.5">
            <span className="text-[12px] font-bold text-slate-700">{m.label}</span>
            <span className="text-[12px] font-black" style={{ color: m.color }}>{m.value}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }} whileInView={{ width: `${m.value}%` }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full" style={{ backgroundColor: m.color }} />
          </div>
        </div>
      ))}
    </div>
  </motion.div>
  </TiltCard>
);

// ─── NxtDevs: Verdict Duel ────────────────────────────────────────────────────
const VerdictDuel = () => (
  <TiltCard>
  <motion.div
    initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}
    className="bg-white border border-slate-200/70 rounded-3xl p-7 h-full"
    style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.28em] mb-5">Adjudicator Routing Decision</p>
    <div className="flex items-center gap-4">
      <div className="flex-1 bg-red-50 border border-red-200/60 rounded-2xl p-4 text-center">
        <Gavel className="w-6 h-6 text-red-500 mx-auto mb-2" />
        <p className="text-[11px] font-black text-red-600 uppercase tracking-wide">Enforcer</p>
        <p className="text-2xl font-black text-red-500 mt-1">5</p>
        <p className="text-[10px] text-red-400 font-medium">DMCA Notices</p>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VS</span>
        <div className="w-px h-8 bg-slate-200" />
      </div>
      <div className="flex-1 bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 text-center">
        <Coins className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
        <p className="text-[11px] font-black text-emerald-600 uppercase tracking-wide">Broker</p>
        <p className="text-2xl font-black text-emerald-500 mt-1">3</p>
        <p className="text-[10px] text-emerald-400 font-medium">Rev-Share Contracts</p>
      </div>
    </div>
    <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden flex">
      <div className="bg-red-400 h-full rounded-l-full" style={{ width: '62.5%' }} />
      <div className="bg-emerald-400 h-full rounded-r-full" style={{ width: '37.5%' }} />
    </div>
    <div className="flex justify-between mt-1.5">
      <span className="text-[10px] text-red-400 font-bold">62.5% Piracy</span>
      <span className="text-[10px] text-emerald-400 font-bold">37.5% Fair Use</span>
    </div>
  </motion.div>
  </TiltCard>
);

// ─── Light stat tiles for filler spaces ──────────────────────────────────────
const STAT_TILES = [
  { value: '99.8%', label: 'Detection Accuracy',  sub: 'CLIP + pHash dual-layer',         color: '#0d9488' },
  { value: '0.05s', label: 'Scan Speed',           sub: 'Per thumbnail, zero-download',    color: '#6366f1' },
  { value: '5K+',   label: 'DMCA Notices Drafted', sub: 'Across 7 platforms',              color: '#f87171' },
  { value: '2.1K',  label: 'Contracts Minted',     sub: 'Polygon (Mock) rev-share',        color: '#34d399' },
  { value: '180K',  label: 'Vault Vectors',         sub: 'FAISS 512-dim embeddings',        color: '#818cf8' },
  { value: '24h',   label: 'Verdict Cache TTL',     sub: 'Redis — zero repeat API calls',   color: '#fbbf24' },
];

const StatTile = ({ value, label, sub, color, delay = 0 }) => (
  <TiltCard>
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white border border-slate-200/70 rounded-2xl p-6 h-full"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
    >
      <div className="w-6 h-[2px] rounded-full mb-3" style={{ backgroundColor: color }} />
      <p className="text-[2.2rem] font-black leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-[12px] font-black text-slate-800 mb-1">{label}</p>
      <p className="text-[11px] text-slate-400 font-medium leading-snug">{sub}</p>
    </motion.div>
  </TiltCard>
);

// ─── Showcase Section ─────────────────────────────────────────────────────────
const ShowcaseSection = () => (
  <section id="stack" className="bg-[#f6f7fc]">
    <Marquee />
    <div className="py-28 px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <p className="text-[10px] font-bold text-teal-600 uppercase tracking-[0.28em] mb-4">System in Action</p>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
            Watch the Swarm<br /><span className="text-teal-600">Think in Real-Time.</span>
          </h2>
          <p className="text-[17px] text-slate-500 max-w-lg mx-auto leading-relaxed">
            Every detection, verdict, and action streams live to the dashboard.
            The agents reason, route, and act — you just approve.
          </p>
        </motion.div>

        {/* Stat tiles grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {STAT_TILES.map((t, i) => (
            <StatTile key={t.label} {...t} delay={i * 0.07} />
          ))}
        </div>

        {/* Metric bars + verdict duel side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MetricBars />
          <VerdictDuel />
        </div>
      </div>
    </div>
  </section>
);

// ─── Deploy Card (Polygon hash style) — wrapped in CometCard ─────────────────
const DeployCard = ({ onLaunch }) => (
  <CometCard className="bg-[#0d1117] rounded-3xl overflow-hidden border border-slate-800/60 max-w-2xl mx-auto mb-14"
    style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Swarm Mission Complete</span>
        </div>
        <span className="text-[9px] font-bold text-teal-400 bg-teal-400/10 px-2.5 py-1 rounded-full border border-teal-400/20">
          Awaiting Approval
        </span>
      </div>

      {/* Summary rows */}
      <div className="px-6 py-5 font-mono text-xs space-y-2.5">
        {[
          ['suspects_found',   '18',               '#e2e8f0'],
          ['critical_matches', '3',                '#f87171'],
          ['dmca_drafted',     '5',                '#fbbf24'],
          ['contracts_minted', '3',                '#34d399'],
          ['polygon_tx',       '0x4a7f...c3e2',    '#818cf8'],
          ['integrity_hash',   'sha256:9b2d...f1a8','#2dd4bf'],
        ].map(([k, v, c]) => (
          <div key={k} className="flex justify-between items-center">
            <span className="text-slate-500">{k}</span>
            <span style={{ color: c }} className="font-bold font-mono">{v}</span>
          </div>
        ))}
      </div>

      {/* Polygon + SHA badge row */}
      <div className="px-6 pb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full">
          <svg viewBox="0 0 38 33" className="w-4 h-4 fill-violet-400" xmlns="http://www.w3.org/2000/svg">
            <path d="M29 10.2L19 4.6 9 10.2v11.2l10 5.6 10-5.6V10.2zM19 0L38 11v11L19 33 0 22V11L19 0z"/>
          </svg>
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Polygon Network</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full">
          <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">SHA-256 Verified</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-6 pb-6 grid grid-cols-2 gap-3">
        <button onClick={onLaunch}
          className="px-4 py-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-center hover:bg-teal-500/25 transition-colors">
          <p className="text-[10px] font-black text-teal-300 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3" /> Approve &amp; Send
          </p>
          <p className="text-[9px] text-slate-500">DMCA dispatched to platform legal</p>
        </button>
        <button onClick={onLaunch}
          className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center hover:bg-emerald-500/20 transition-colors">
          <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1.5">
            <Coins className="w-3 h-3" /> Activate Contract
          </p>
          <p className="text-[9px] text-slate-500">Rev-share goes live on Polygon</p>
        </button>
      </div>
    </motion.div>
  </CometCard>
);

// ─── CTA Section ──────────────────────────────────────────────────────────────
const CTA = ({ onLaunch }) => (
  <section className="py-28 px-8 bg-white">
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-[2.5rem] p-14 md:p-20 text-center overflow-hidden"
        style={{ background: 'linear-gradient(140deg, #daf2ed 0%, #edf0f8 60%, #e2e8f6 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #9abfb8 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.22 }} />
        <RippleGrid rows={6} cols={20} cellSize={52} />
        <div className="absolute bottom-0 right-4 text-[180px] font-black leading-none select-none pointer-events-none"
          style={{ color: 'rgba(148,163,184,0.10)' }}>AI</div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-7">
            <Zap className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-[0.24em]">Ready to Deploy</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
            Deploy the Swarm.<br /><span className="text-teal-600">Protect Your IP.</span>
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
      <ShowcaseSection />
      <CTA onLaunch={onLaunch} />
      <footer className="py-8 px-8 border-t border-slate-100 bg-[#f6f7fc]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-black text-slate-900">MediaGuard<span className="text-teal-600">Sports</span></span>
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
