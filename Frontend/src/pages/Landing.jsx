import React from 'react';
import LandingNav    from '../components/landing/LandingNav';
import HeroSection   from '../components/landing/HeroSection';
import AgentsSection from '../components/landing/AgentsSection';
import PipelineSection from '../components/landing/PipelineSection';
import TechSection   from '../components/landing/TechSection';
import CTASection    from '../components/landing/CTASection';
import { Shield } from 'lucide-react';

const Landing = () => (
  <div className="bg-[#020617] min-h-screen overflow-x-hidden">
    <LandingNav />
    <HeroSection />

    <div id="agents">
      <AgentsSection />
    </div>

    <div id="pipeline">
      <PipelineSection />
    </div>

    <div id="stack">
      <TechSection />
    </div>

    <CTASection />

    <footer className="py-12 px-8 border-t border-white/5 bg-[#020617]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-black text-white tracking-tight">
            MediaGuard<span className="text-blue-500">Sports</span>
          </span>
        </div>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.25em]">
          © 2026 · Google Solution Challenge · SDG 8 & 9 · Autonomous IP Protection
        </p>
      </div>
    </footer>
  </div>
);

export default Landing;
