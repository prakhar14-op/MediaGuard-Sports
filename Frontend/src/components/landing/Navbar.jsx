import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, LayoutDashboard, Users, Mail, Radar } from 'lucide-react';

// ─── Features dropdown items ──────────────────────────────────────────────────
const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    desc: 'Live swarm command center with real-time threat map and agent heartbeat.',
    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=320&h=180&fit=crop&auto=format&q=80',
    action: 'launch', // triggers onLaunch
    accent: '#2dd4bf',
  },
  {
    icon: Radar,
    title: 'Agent Swarm',
    desc: 'Six autonomous AI agents — from ingestion to enforcement — working in one pipeline.',
    img: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=320&h=180&fit=crop&auto=format&q=80',
    action: 'scroll',
    section: 'agents',
    accent: '#818cf8',
  },
  {
    icon: Users,
    title: 'About Us',
    desc: 'Built for Google Solution Challenge 2026. SDG 8 & 9 — open source, non-profit.',
    img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=320&h=180&fit=crop&auto=format&q=80',
    action: 'scroll',
    section: 'stack',
    accent: '#34d399',
  },
  {
    icon: Mail,
    title: 'Contact Us',
    desc: 'Reach the team for partnerships, demos, or contribution opportunities.',
    img: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=320&h=180&fit=crop&auto=format&q=80',
    action: 'scroll',
    section: 'stack',
    accent: '#fbbf24',
  },
];

// ─── Dropdown ─────────────────────────────────────────────────────────────────
const FeaturesDropdown = ({ onNavigate, onLaunch }) => {
  const [hovered, setHovered] = useState(null);

  const handle = (item) => {
    if (item.action === 'launch') onLaunch();
    else onNavigate(item.section);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.94 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="absolute top-[calc(100%+18px)] left-1/2 -translate-x-1/2 z-50 w-[640px]"
    >
      {/* Caret */}
      <div className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 rounded-tl-sm"
        style={{ background: '#13141c', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRight: 'none' }} />

      <div className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #13141c 0%, #0f1018 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>

        {/* Header strip */}
        <div className="px-5 pt-4 pb-3 border-b border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.28em]">Explore MediaGuard</p>
        </div>

        {/* 2×2 grid */}
        <div className="grid grid-cols-2 p-2 gap-1">
          {FEATURES.map((item, i) => {
            const Icon = item.icon;
            const isHovered = hovered === i;
            return (
              <motion.button
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handle(item)}
                className="relative flex items-start gap-4 p-4 rounded-xl text-left overflow-hidden transition-colors duration-150"
                style={{ background: isHovered ? 'rgba(255,255,255,0.05)' : 'transparent' }}
              >
                {/* Glow on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 pointer-events-none rounded-xl"
                      style={{ background: `radial-gradient(180px circle at 30% 50%, ${item.accent}12, transparent 70%)` }}
                    />
                  )}
                </AnimatePresence>

                {/* Image */}
                <div className="w-[110px] h-[68px] rounded-xl overflow-hidden shrink-0 border border-white/8 bg-black/40 relative">
                  <img src={item.img} alt={item.title}
                    className="w-full h-full object-cover transition-all duration-500"
                    style={{ opacity: isHovered ? 1 : 0.65, transform: isHovered ? 'scale(1.07)' : 'scale(1)' }}
                  />
                  {/* Colour tint overlay */}
                  <div className="absolute inset-0 transition-opacity duration-300"
                    style={{ background: `linear-gradient(135deg, ${item.accent}22, transparent)`, opacity: isHovered ? 1 : 0 }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 pt-0.5 relative z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0 transition-colors duration-150"
                      style={{ color: isHovered ? item.accent : 'rgba(148,163,184,0.7)' }} />
                    <p className="text-[14px] font-bold leading-tight transition-colors duration-150"
                      style={{ color: isHovered ? '#fff' : 'rgba(226,232,240,0.9)' }}>
                      {item.title}
                    </p>
                  </div>
                  <p className="text-[11.5px] text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">Google Solution Challenge 2026 · SDG 8 &amp; 9</p>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={onLaunch}
            className="text-[11px] font-bold text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1"
          >
            Open Dashboard →
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = ({ onLaunch }) => {
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const open  = useCallback(() => { clearTimeout(closeTimer.current); setFeaturesOpen(true); }, []);
  const close = useCallback(() => { closeTimer.current = setTimeout(() => setFeaturesOpen(false), 110); }, []);
  const keep  = useCallback(() => clearTimeout(closeTimer.current), []);

  const scrollTo = (id) => {
    setFeaturesOpen(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4"
    >
      <div
        className="flex items-center w-full max-w-[820px] rounded-full px-5 py-2.5 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(10,11,16,0.97)' : 'rgba(10,11,16,0.88)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: scrolled
            ? '0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(45,212,191,0.07)'
            : '0 4px 24px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 shrink-0 group mr-8"
        >
          <div className="p-1.5 rounded-lg bg-teal-500/15 border border-teal-500/20 group-hover:bg-teal-500/25 transition-colors">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <span className="text-[14px] font-black text-white tracking-tight">
            MediaGuard<span className="text-teal-400">'26</span>
          </span>
        </button>

        {/* Centre nav */}
        <nav className="flex-1 flex items-center justify-center gap-0.5">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-4 py-1.5 text-[13px] font-medium text-slate-300 hover:text-white rounded-full hover:bg-white/5 transition-all duration-150"
          >
            Home
          </button>

          {/* Features with dropdown */}
          <div className="relative" onMouseEnter={open} onMouseLeave={close}>
            <button
              className="flex items-center gap-1 px-4 py-1.5 text-[13px] font-medium rounded-full transition-all duration-150"
              style={{ color: featuresOpen ? '#fff' : 'rgba(203,213,225,0.9)', background: featuresOpen ? 'rgba(255,255,255,0.06)' : 'transparent' }}
            >
              Features
              <motion.svg
                animate={{ rotate: featuresOpen ? 180 : 0 }}
                transition={{ duration: 0.22 }}
                className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>

            <AnimatePresence>
              {featuresOpen && (
                <div onMouseEnter={keep} onMouseLeave={close}>
                  <FeaturesDropdown onNavigate={scrollTo} onLaunch={onLaunch} />
                </div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => scrollTo('agents')}
            className="px-4 py-1.5 text-[13px] font-medium text-slate-300 hover:text-white rounded-full hover:bg-white/5 transition-all duration-150"
          >
            Agents
          </button>
        </nav>

        {/* Right CTAs */}
        <div className="flex items-center gap-3 shrink-0 ml-6">
          <button
            onClick={() => scrollTo('stack')}
            className="text-[13px] font-medium text-slate-300 hover:text-white transition-colors"
          >
            About
          </button>
          <motion.button
            whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(255,255,255,0.18)' }}
            whileTap={{ scale: 0.96 }}
            onClick={onLaunch}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-900 text-[13px] font-bold rounded-full transition-colors duration-200"
            style={{ boxShadow: '0 2px 12px rgba(255,255,255,0.12)' }}
          >
            Launch →
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
