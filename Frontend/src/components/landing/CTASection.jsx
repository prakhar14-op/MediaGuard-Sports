import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-32 px-8 bg-slate-950 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="bg-gradient-to-br from-slate-900/80 to-blue-950/30 border border-blue-500/15 rounded-[3rem] p-16 shadow-2xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.22em]">Ready to Deploy</span>
          </div>

          <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-6">
            Deploy the Swarm.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Protect Your IP.
            </span>
          </h2>

          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-12 font-medium leading-relaxed">
            One URL. Six agents. Full autonomy. The entire pipeline runs in the background
            while you watch the results appear live on the dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/dashboard/overview')}
              className="group px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-widest rounded-2xl transition-all duration-300 flex items-center gap-3 shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:shadow-[0_0_60px_rgba(37,99,235,0.5)]"
            >
              <Shield className="w-5 h-5" />
              Initialize Command Center
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <p className="mt-8 text-[11px] text-slate-600 font-medium uppercase tracking-widest">
            Google Solution Challenge 2026 · SDG 8 & 9
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
