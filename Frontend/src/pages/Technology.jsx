import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Database, Shield, ArrowRight, Brain } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Technology = () => {
  return (
    <div className="bg-[#020617] min-h-screen text-slate-300 pt-32 pb-20 px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20 text-center"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">THE TECH STACK</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            MediaGuard Sports combines cutting-edge computer vision, vector databases, and autonomous LLM agents to protect your IP at light speed.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-32">
          <div className="bg-slate-900/40 border border-white/5 p-10 rounded-[3rem] space-y-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <Brain className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-3xl font-bold text-white">Neural Fingerprinting</h3>
            <p className="text-slate-400 leading-relaxed">
              Using OpenAI's CLIP (Contrastive Language-Image Pre-training), we extract semantic embeddings from every frame of official broadcasts. This allows us to detect pirated content even if it has been flipped, cropped, or color-graded.
            </p>
            <div className="flex gap-4">
              <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">PyTorch</span>
              <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">Transformers</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-10 rounded-[3rem] space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Database className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-bold text-white">FAISS Vector Vault</h3>
            <p className="text-slate-400 leading-relaxed">
              Meta's FAISS (Facebook AI Similarity Search) library enables billion-scale similarity searches in milliseconds. We vault every piece of official content as a high-dimensional vector for instant global cross-referencing.
            </p>
            <div className="flex gap-4">
              <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">Vector Search</span>
              <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">L2 Distance</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-600 rounded-[4rem] p-16 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl -mr-48 -mt-48 rounded-full" />
          <h2 className="text-4xl md:text-5xl font-black mb-8 relative z-10 uppercase tracking-tighter">Ready to secure your broadcast?</h2>
          <NavLink to="/dashboard/overview" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-600 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-105 transition-transform relative z-10 shadow-2xl">
            Launch Swarm <ArrowRight className="w-6 h-6" />
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Technology;
