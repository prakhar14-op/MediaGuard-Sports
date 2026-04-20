import React, { useState, useEffect } from 'react';
import { Radar, Database, Search, Brain, Gavel, Coins, ArrowRight, Shield } from 'lucide-react';

const Landing = ({ onLaunch }) => {
  return (
    <div className="bg-[#0B0F19] text-slate-300 font-sans min-h-screen selection:bg-emerald-500/30">
      {/* Header/Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0F19]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Shield className="w-7 h-7 text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">MediaGuard</span>
          </div>
          <button
            onClick={onLaunch}
            className="group relative px-6 py-2.5 bg-[#131B2B] hover:bg-[#1a243a] border border-white/5 hover:border-white/10 rounded-full text-white font-medium transition-all duration-300 flex items-center gap-2 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">Launch Command Center <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight leading-tight mb-8 relative z-10">
          The Future of <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">AI Cybersecurity</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed relative z-10 tracking-wide">
          An autonomous 5-agent swarm that detects, adjudicates, and monetizes illicit content at edge speeds.
        </p>
      </section>

      {/* Scrollytelling Section */}
      <section className="px-6 pb-40 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Left Column (Sticky Visualizer) */}
          <div className="hidden lg:block relative">
            <div className="sticky top-24 h-[calc(100vh-8rem)] bg-[#131B2B] border border-white/5 backdrop-blur-md rounded-[2.5rem] p-8 flex items-center justify-center overflow-hidden shadow-2xl shadow-black/50">
              {/* Pulsating Glowing Background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] animate-[pulse_3s_ease-in-out_infinite_700ms]"></div>
              </div>

              {/* Radar Graphic */}
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl animate-ping opacity-50"></div>
                  <div className="w-40 h-40 bg-[linear-gradient(to_bottom_right,rgba(15,23,42,0.8),rgba(15,23,42,0.4))] border border-white/10 rounded-full flex items-center justify-center backdrop-blur-md shadow-[0_0_30px_rgba(56,189,248,0.2)] overflow-hidden relative">
                    <Radar className="w-20 h-20 text-blue-400 opacity-90 animate-[spin_4s_linear_infinite]" />
                    {/* Inner glowing rings */}
                    <div className="absolute inset-0 border border-blue-500/30 rounded-full m-4"></div>
                    <div className="absolute inset-0 border border-blue-500/20 rounded-full m-8"></div>
                    {/* Scanner line */}
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0%,rgba(56,189,248,0.2)_10%,transparent_10%)] animate-[spin_4s_linear_infinite]"></div>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold text-2xl tracking-tight mb-2">Global Radar</h3>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                    <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase">Monitoring All Nodes</span>
                  </div>
                </div>
              </div>

              {/* Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>
          </div>

          {/* Right Column (The Scrolling Story) */}
          <div className="space-y-32 py-10 lg:py-32">

            {/* Card 1: The Archivist */}
            <div className="bg-[#131B2B] border border-white/5 backdrop-blur-md rounded-3xl p-10 hover:-translate-y-1 hover:border-white/10 transition-all duration-300 shadow-xl shadow-black/20 group">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300 shadow-[0_0_0_rgba(59,130,246,0)] group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <Database className="w-8 h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-4 group-hover:text-blue-400 transition-colors">The Archivist</h2>
              <div className="text-xs font-bold text-blue-400 tracking-widest uppercase mb-4">Phase 1: Ingestion</div>
              <p className="text-xl text-slate-300 leading-relaxed font-light">
                Extracts visual DNA into a 512-D vector vault. We preserve the foundational fingerprint of every asset before it hits the edge.
              </p>
            </div>

            {/* Card 2: The Sentinel */}
            <div className="bg-[#131B2B] border border-white/5 backdrop-blur-md rounded-3xl p-10 hover:-translate-y-1 hover:border-white/10 transition-all duration-300 shadow-xl shadow-black/20 group">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300 shadow-[0_0_0_rgba(245,158,11,0)] group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <Search className="w-8 h-8 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-4 group-hover:text-amber-500 transition-colors">The Sentinel</h2>
              <div className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-4">Phase 2: Detection</div>
              <p className="text-xl text-slate-300 leading-relaxed font-light">
                Real-time edge crawler searching for mathematical L2 vector anomalies across global CDN propagation.
              </p>
            </div>

            {/* Card 3: The Adjudicator */}
            <div className="bg-[#131B2B] border border-white/5 backdrop-blur-md rounded-3xl p-10 hover:-translate-y-1 hover:border-white/10 transition-all duration-300 shadow-xl shadow-black/20 group">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-300 shadow-[0_0_0_rgba(168,85,247,0)] group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Brain className="w-8 h-8 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-4 group-hover:text-purple-400 transition-colors">The Adjudicator</h2>
              <div className="text-xs font-bold text-purple-400 tracking-widest uppercase mb-4">Phase 3: Context</div>
              <p className="text-xl text-slate-300 leading-relaxed font-light">
                Vision-LLM calculates risk vs. fair-use intent autonomously. Filtering out legitimate fan engagement from pirated rebroadcasts.
              </p>
            </div>

            {/* Card 4: The Enforcer */}
            <div className="bg-[#131B2B] border border-white/5 backdrop-blur-md rounded-3xl p-10 hover:-translate-y-1 hover:border-white/10 transition-all duration-300 shadow-xl shadow-black/20 group">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-red-500/20 transition-all duration-300 shadow-[0_0_0_rgba(239,68,68,0)] group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <Gavel className="w-8 h-8 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-4 group-hover:text-red-500 transition-colors">The Enforcer</h2>
              <div className="text-xs font-bold text-red-400 tracking-widest uppercase mb-4">Phase 4: Legal</div>
              <p className="text-xl text-slate-300 leading-relaxed font-light">
                Executes automated OSINT and DMCA takedowns. Zero-trust escalation protocol for immediate disruption.
              </p>
            </div>

            {/* Card 5: The Broker */}
            <div className="bg-[#131B2B] border border-white/5 backdrop-blur-md rounded-3xl p-10 hover:-translate-y-1 hover:border-white/10 transition-all duration-300 shadow-xl shadow-black/20 group overflow-hidden relative">
              {/* Special ambient glow for The Broker */}
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"></div>

              <div className="relative z-10 w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:shadow-[0_0_15px_rgba(52,211,153,0.8)] transition-all duration-300 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                <Coins className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <h2 className="relative z-10 text-3xl font-bold text-white tracking-tight mb-4 group-hover:text-emerald-400 transition-colors">The Broker</h2>
              <div className="relative z-10 text-xs font-bold text-emerald-400 tracking-widest uppercase mb-4">Phase 5: Monetization</div>
              <p className="relative z-10 text-xl text-slate-300 leading-relaxed font-light">
                Flips viral fan content into <span className="font-semibold text-emerald-400">30% Rev-Share Smart Contracts</span> immediately, turning piracy into a new revenue stream.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer / Final CTA */}
      <section className="py-32 px-6 flex flex-col items-center justify-center text-center relative z-10 border-t border-white/5 bg-gradient-to-b from-transparent to-[#131B2B]/50">
        <h2 className="text-4xl font-bold text-white mb-8 tracking-tight">Ready to Deploy the Swarm?</h2>
        <button
          onClick={onLaunch}
          className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full font-bold text-lg transition-all duration-300 shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] hover:-translate-y-1 flex items-center gap-3"
        >
          Initialize Command Center
          <ArrowRight className="w-5 h-5" />
        </button>
      </section>

    </div>
  );
};

export default Landing;
