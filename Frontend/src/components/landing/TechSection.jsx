import React from 'react';
import { motion } from 'framer-motion';
import { Database, Cpu, Globe, Lock, Zap, Shield } from 'lucide-react';

const TECH = [
  { icon: Cpu,      label: 'CLIP Neural Embeddings',  sub: 'openai/clip-vit-base-patch32',  color: '#3b82f6' },
  { icon: Database, label: 'FAISS Vector Search',      sub: 'Facebook AI Similarity Search', color: '#6366f1' },
  { icon: Zap,      label: 'Gemini 2.5 Flash',         sub: 'CrewAI agent orchestration',    color: '#f59e0b' },
  { icon: Globe,    label: 'yt-dlp OSINT',             sub: 'Zero-download architecture',    color: '#10b981' },
  { icon: Lock,     label: 'SHA-256 + Polygon',        sub: 'Cryptographic proof of ownership', color: '#a855f7' },
  { icon: Shield,   label: 'Redis + MongoDB',          sub: 'Velocity tracking & persistence', color: '#ef4444' },
];

const TechSection = () => (
  <section className="py-32 px-8 bg-[#020617] relative">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-20"
      >
        <p className="text-[11px] font-bold text-purple-400 uppercase tracking-[0.25em] mb-4">Under the Hood</p>
        <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight">
          Production-Grade{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            Tech Stack
          </span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {TECH.map((t, i) => {
          const Icon = t.icon;
          return (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
              whileHover={{ scale: 1.03 }}
              className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300 flex items-center gap-4"
            >
              <div
                className="p-3 rounded-xl shrink-0"
                style={{ backgroundColor: `${t.color}12`, border: `1px solid ${t.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: t.color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{t.label}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{t.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Architecture diagram */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="mt-16 bg-slate-900/40 border border-white/5 rounded-3xl p-8"
      >
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 text-center">System Architecture</p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm font-mono">
          {[
            { label: 'React UI', sub: 'Port 5173', color: '#3b82f6' },
            { label: '→', color: '#ffffff20', plain: true },
            { label: 'Express API', sub: 'Port 8000', color: '#10b981' },
            { label: '→', color: '#ffffff20', plain: true },
            { label: 'FastAPI ML', sub: 'Port 8001', color: '#a855f7' },
            { label: '→', color: '#ffffff20', plain: true },
            { label: 'CLIP + FAISS', sub: 'Gemini + CrewAI', color: '#f59e0b' },
          ].map((item, i) =>
            item.plain ? (
              <span key={i} className="text-white/20 text-xl hidden md:block">→</span>
            ) : (
              <div
                key={i}
                className="px-5 py-3 rounded-xl border text-center"
                style={{ borderColor: `${item.color}25`, backgroundColor: `${item.color}08` }}
              >
                <p className="font-bold" style={{ color: item.color }}>{item.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{item.sub}</p>
              </div>
            )
          )}
        </div>
      </motion.div>
    </div>
  </section>
);

export default TechSection;
