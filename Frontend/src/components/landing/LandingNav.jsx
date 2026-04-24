import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NAV = [
  { label: 'Technology', id: 'agents' },
  { label: 'Pipeline',   id: 'pipeline' },
  { label: 'Stack',      id: 'stack' },
];

const LandingNav = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scroll = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/20' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 group"
        >
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:border-blue-500/40 transition-colors">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-lg font-black text-white tracking-tight">
            MediaGuard<span className="text-blue-500">Sports</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-8">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => scroll(n.id)}
              className="text-[11px] font-bold text-slate-500 hover:text-white uppercase tracking-[0.18em] transition-colors"
            >
              {n.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => navigate('/dashboard/overview')}
          className="group px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
        >
          Launch
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.header>
  );
};

export default LandingNav;
