import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const cn = (...c) => c.filter(Boolean).join(' ');

const LandingNav = ({ onLaunch }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-5"
    >
      <div className={cn(
        'flex items-center gap-1 backdrop-blur-xl border rounded-full px-3 py-2 transition-all duration-300',
        scrolled
          ? 'bg-[#020c0b]/90 border-teal-500/20 shadow-[0_4px_30px_rgba(20,184,166,0.12)]'
          : 'bg-[#020c0b]/50 border-white/5',
      )}>
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors"
        >
          <span className="text-sm font-black text-white tracking-tight">
            MediaGuard<span className="text-teal-400">'26</span>
          </span>
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {[['agents', 'Agents'], ['pipeline', 'Pipeline'], ['stack', 'Tech Stack']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => scroll(id)}
            className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-all"
          >
            {label}
          </button>
        ))}

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onLaunch}
          className="ml-2 px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-[11px] font-black rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(20,184,166,0.35)]"
        >
          Launch →
        </motion.button>
      </div>
    </motion.nav>
  );
};

export default LandingNav;
