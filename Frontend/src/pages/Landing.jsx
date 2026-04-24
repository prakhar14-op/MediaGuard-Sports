import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Database, Globe, Eye, Brain, Gavel, Coins, Zap, ChevronRight } from 'lucide-react';
import { FlipWords } from '../components/ui/FlipWords';

// ─── helpers ─────────────────────────────────────────────────────────────────
const useReveal = (threshold = 0.15) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px', amount: threshold });
  return [ref, inView];
};

const fadeUp = (delay = 0) => ({
  initial:   { opacity: 0, y: 36 },
  animate:   { opacity: 1, y: 0  },
  transition:{ delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] },
});

// ─── NAV ─────────────────────────────────────────────────────────────────────
const Nav = ({ onLaunch }) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const scroll = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <motion.nav
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 h-18 flex items-center justify-between py-4">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 group">
          <div className="p-1.5 bg-teal-500/10 rounded-lg border border-teal-500/20">
            <Shield className="w-5 h-5 text-teal-600" />
          </div>
          <span className="text-base font-black text-slate-900 tracking-tight">MediaGuard<span className="text-teal-600">Sports</span></span>
        </button>
        <div className="hidden md:flex items-center gap-8">
          {['agents','pipeline','stack'].map(id => (
            <button key={id} onClick={() => scroll(id)}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-[0.18em] transition-colors capitalize">
              {id}
            </button>
          ))}
        </div>
        <button onClick={onLaunch}
          className="group flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-full transition-all shadow-[0_4px_20px_rgba(13,148,136,0.3)]">
          Launch <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.nav>
  );
};

// ─── HERO ─────────────────────────────────────────────────────────────────────
const Hero = ({ onLaunch }) => {
  const WORDS = ['Detects', 'Adjudicates', 'Monetizes', 'Protects'];
  return (
    <section className="relative min-h-screen bg-[#f0f0f8] flex flex-col items-center justify-center overflow-hidden pt-20">
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #c8c8e8 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.5 }} />
      {/* Soft blobs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-teal-400/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-400/8 rounded-full blur-[80px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-8 text-center">
        <motion.div {...fadeUp(0)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-10">
          <Zap className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
          <span className="text-[11px] font-bold text-teal-700 uppercase tracking-[0.22em]">Autonomous IP Protection · 6-Agent AI Swarm</span>
        </motion.div>

        <motion.h1 {...fadeUp(0.1)} className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight leading-[0.9] mb-6">
          The AI Swarm That<br />
          <FlipWords words={WORDS} className="text-teal-600" /><br />
          <span className="text-slate-900">Sports Piracy</span>
        </motion.h1>

        <motion.p {...fadeUp(0.25)} className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
          One URL triggers the entire pipeline. 6 autonomous agents detect, classify, and either
          strike down or monetize pirated content — with human approval only at the final step.
        </motion.p>

        <motion.div {...fadeUp(0.38)} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onLaunch}
            className="group px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm uppercase tracking-widest rounded-full transition-all shadow-[0_8px_30px_rgba(13,148,136,0.3)] hover:shadow-[0_8px_40px_rgba(13,148,136,0.45)] flex items-center gap-3">
            Launch Command Center <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={() => document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-white border border-slate-200 text-slate-700 hover:border-teal-300 hover:text-teal-700 font-bold text-sm uppercase tracking-widest rounded-full transition-all shadow-sm">
            See the Swarm
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp(0.52)} className="mt-20 flex flex-wrap items-center justify-center gap-10">
          {[['6','Autonomous Agents'],['99.8%','Detection Accuracy'],['0.05s','Per Thumbnail Scan'],['7+','Platforms Monitored']].map(([v,l]) => (
            <div key={l} className="text-center">
              <p className="text-4xl font-black text-slate-900">{v}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{l}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }}
          className="w-5 h-8 border-2 border-slate-300 rounded-full flex items-start justify-center pt-1.5">
          <div className="w-1 h-2 bg-slate-400 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

// ─── SPLIT CARD (GSSoC style) ─────────────────────────────────────────────────
const SplitCard = ({ num, tag, title, label, desc, cta, icon: Icon, accent, reverse = false }) => {
  const [ref, inView] = useReveal();
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-lg transition-shadow duration-500 bg-white`}
    >
      {/* Left visual panel */}
      <div className="md:w-[42%] bg-[#eeeef8] relative flex items-center justify-center p-12 min-h-[220px] overflow-hidden">
        {/* Ghost number */}
        <span className="absolute bottom-2 right-4 text-[120px] font-black text-slate-200/70 leading-none select-none pointer-events-none">
          {num.toString().padStart(2, '0')}
        </span>
        {/* Floating pill tag */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 px-5 py-2.5 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-full shadow-sm"
        >
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{tag}</span>
        </motion.div>
      </div>

      {/* Right content panel */}
      <div className="md:w-[58%] p-10 flex flex-col justify-center">
        <p className="text-[11px] font-bold text-teal-600 uppercase tracking-[0.22em] mb-3">
          — {num.toString().padStart(2, '0')}, {label}
        </p>
        <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 leading-tight">{title}</h3>
        <p className="text-slate-500 leading-relaxed mb-6 text-sm md:text-base">{desc}</p>
        <div className="inline-flex">
          <span className="px-5 py-2.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-[11px] font-bold text-teal-700 uppercase tracking-[0.15em]">
            {cta}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── AGENTS SECTION ───────────────────────────────────────────────────────────
const AGENTS = [
  { num:1, tag:'CLIP + FAISS',      label:'INGESTION',  icon:Database, title:'The Archivist',      desc:'Downloads official video via yt-dlp, extracts 1 frame/sec, runs each through HuggingFace CLIP, stores 512-D embeddings in FAISS. Generates SHA-256 + mock Polygon tx hash as proof of ownership.', cta:'Vector Vault' },
  { num:2, tag:'OSINT CRAWLER',     label:'HUNT',       icon:Globe,    title:'The Spider',          desc:'Gemini generates 4 optimised search query variants. yt-dlp scrapes YouTube zero-download — metadata and thumbnails only. Deduplicates by URL, maps every suspect to a country centroid.', cta:'Zero-Download Architecture', reverse:true },
  { num:3, tag:'DUAL-LAYER SCAN',   label:'DETECTION',  icon:Eye,      title:'The Sentinel',        desc:'CLIP L2 vector search returns top-3 vault matches with exact timestamps. pHash cross-check eliminates false positives. Redis velocity tracking auto-escalates repeat offenders to CRITICAL.', cta:'pHash + CLIP Fusion' },
  { num:4, tag:'GEMINI 2.5 FLASH',  label:'TRIAGE',     icon:Brain,    title:'The Adjudicator',     desc:'Classifies SEVERE PIRACY vs FAIR USE with a 0-100 risk score, legal basis citation, and recommended action. Redis caches verdicts 24h — same account never hits Gemini twice.', cta:'Risk Score Engine', reverse:true },
  { num:5, tag:'17 U.S.C. § 512(c)',label:'TAKEDOWN',   icon:Gavel,    title:'The Enforcer',        desc:'Gemini drafts legally precise DMCA notices. Escalation tiers: standard → expedited → legal referral. Platform-specific legal routing. Human approves before send.', cta:'DMCA Automation' },
  { num:6, tag:'POLYGON MOCK',      label:'MONETIZE',   icon:Coins,    title:'The Broker',          desc:'Deploys dynamic rev-share smart contracts. Platinum viral content (1M+ views) gets 20/80 splits. Revenue projections use real platform CPM rates (YouTube $4.50, TikTok $0.02).', cta:'Smart Contract Minting', reverse:true },
];

const AgentsSection = () => {
  const [ref, inView] = useReveal();
  return (
    <section id="agents" className="py-32 px-8 bg-[#f7f7fc]">
      <div className="max-w-5xl mx-auto">
        <motion.div ref={ref}
          initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-20">
          <p className="text-[11px] font-bold text-teal-600 uppercase tracking-[0.25em] mb-4">The Autonomous Swarm</p>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
            6 Agents.<br />
            <span className="text-teal-600">One Pipeline.</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium">
            One URL triggers the entire swarm. Each agent hands off to the next automatically.
          </p>
        </motion.div>
        <div className="space-y-6">
          {AGENTS.map((a) => <SplitCard key={a.num} {...a} />)}
        </div>
      </div>
    </section>
  );
};

// ─── PIPELINE SECTION ─────────────────────────────────────────────────────────
const STEPS = [
  { n:'01', label:'Spider Crawls',        sub:'Gemini-optimised queries',   color:'#6366f1' },
  { n:'02', label:'Sentinel Scans',       sub:'CLIP + pHash dual-layer',    color:'#f59e0b' },
  { n:'03', label:'Adjudicator Rules',    sub:'Gemini 2.5 Flash verdict',   color:'#a855f7' },
  { n:'04', label:'Enforcer Drafts',      sub:'17 U.S.C. § 512(c) notice', color:'#ef4444' },
  { n:'05', label:'Broker Mints',         sub:'Dynamic rev-share split',    color:'#10b981' },
  { n:'06', label:'Human Approves',       sub:'Final click. Done.',         color:'#0d9488' },
];

const PipelineSection = () => {
  const [ref, inView] = useReveal();
  return (
    <section id="pipeline" className="py-32 px-8 bg-white">
      <div className="max-w-5xl mx-auto">
        <motion.div ref={ref}
          initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-20">
          <p className="text-[11px] font-bold text-teal-600 uppercase tracking-[0.25em] mb-4">The Agentic Pipeline</p>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-5">
            One URL.<br /><span className="text-teal-600">Full Autonomy.</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium">
            POST <code className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded text-sm font-mono">/api/swarm/run</code> and watch the swarm execute live via Socket.io.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-16">
          {STEPS.map((s, i) => {
            const [r, v] = useReveal();
            return (
              <motion.div key={s.n} ref={r}
                initial={{ opacity: 0, y: 28 }} animate={v ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="bg-[#f7f7fc] border border-slate-200/80 rounded-2xl p-6 hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
                <span className="absolute bottom-1 right-3 text-7xl font-black text-slate-100 leading-none select-none">{s.n}</span>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${s.color}15`, border: `1px solid ${s.color}25` }}>
                    <span className="text-xs font-black" style={{ color: s.color }}>{s.n}</span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mb-1">{s.label}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{s.sub}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Terminal log */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="bg-slate-900 rounded-3xl p-8 font-mono text-sm overflow-x-auto border border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-4 text-[10px] text-slate-500 uppercase tracking-widest">swarm_output.log</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              ['text-indigo-400',  '🕷️  [Phase 1] Spider crawling web for suspects...'],
              ['text-slate-400',   '   → Found 18 unique suspects across 4 search variants'],
              ['text-amber-400',   '👁️  [Phase 2] Sentinel scanning 18 thumbnails (CLIP + pHash)...'],
              ['text-slate-400',   '   → 3 CRITICAL matches | 5 WARNING | 10 CLEAN'],
              ['text-purple-400',  '⚖️  [Phase 3] Adjudicator ruling 8 flagged incidents...'],
              ['text-slate-400',   '   → 5 × SEVERE PIRACY → Enforcer | 3 × FAIR USE → Broker'],
              ['text-red-400',     '🔨 [Phase 4] Enforcer drafting 5 DMCA notices...'],
              ['text-slate-400',   '   → Notices staged. Awaiting human approval.'],
              ['text-emerald-400', '💰 [Phase 5] Broker minting 3 rev-share contracts...'],
              ['text-slate-400',   '   → Contracts minted on Polygon (Mock). Awaiting activation.'],
              ['text-teal-400',    '✅ [Swarm Complete] Mission complete. Human-in-the-loop ready.'],
            ].map(([cls, msg], i) => (
              <motion.p key={i} className={cls}
                initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.07 }}>
                {msg}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ─── TECH STACK ───────────────────────────────────────────────────────────────
const TECH = [
  { label:'CLIP Embeddings',    sub:'openai/clip-vit-base-patch32',    color:'#3b82f6' },
  { label:'FAISS Vector DB',    sub:'Facebook AI Similarity Search',   color:'#6366f1' },
  { label:'Gemini 2.5 Flash',   sub:'CrewAI agent orchestration',      color:'#f59e0b' },
  { label:'yt-dlp OSINT',       sub:'Zero-download architecture',      color:'#10b981' },
  { label:'SHA-256 + Polygon',  sub:'Cryptographic proof of ownership',color:'#a855f7' },
  { label:'Redis + MongoDB',    sub:'Velocity tracking & persistence', color:'#ef4444' },
  { label:'Express + FastAPI',  sub:'Node API + Python ML server',     color:'#0d9488' },
  { label:'Socket.io',          sub:'Real-time agent event streaming', color:'#f97316' },
];

const TechSection = () => {
  const [ref, inView] = useReveal();
  return (
    <section id="stack" className="py-32 px-8 bg-[#f7f7fc]">
      <div className="max-w-5xl mx-auto">
        <motion.div ref={ref}
          initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-20">
          <p className="text-[11px] font-bold text-teal-600 uppercase tracking-[0.25em] mb-4">Under the Hood</p>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight">
            Production-Grade<br /><span className="text-teal-600">Tech Stack</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TECH.map((t, i) => {
            const [r, v] = useReveal();
            return (
              <motion.div key={t.label} ref={r}
                initial={{ opacity: 0, scale: 0.94 }} animate={v ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.06, duration: 0.45 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition-all duration-300">
                <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center"
                  style={{ backgroundColor: `${t.color}12`, border: `1px solid ${t.color}20` }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                </div>
                <p className="text-sm font-black text-slate-900 leading-tight mb-1">{t.label}</p>
                <p className="text-[10px] text-slate-400 font-medium leading-snug">{t.sub}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Architecture strip */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-12 bg-white border border-slate-200/80 rounded-3xl p-8">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">System Architecture</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-xs font-mono flex-wrap">
            {[
              { l:'React UI',     s:'Port 5173', c:'#3b82f6' },
              { l:'→', plain:true },
              { l:'Express API',  s:'Port 8000', c:'#10b981' },
              { l:'→', plain:true },
              { l:'FastAPI ML',   s:'Port 8001', c:'#a855f7' },
              { l:'→', plain:true },
              { l:'CLIP + FAISS', s:'Gemini + CrewAI', c:'#f59e0b' },
            ].map((item, i) => item.plain
              ? <span key={i} className="text-slate-300 text-lg hidden md:block">→</span>
              : <div key={i} className="px-5 py-3 rounded-xl border text-center"
                  style={{ borderColor:`${item.c}25`, backgroundColor:`${item.c}08` }}>
                  <p className="font-bold" style={{ color:item.c }}>{item.l}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.s}</p>
                </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ─── CTA ──────────────────────────────────────────────────────────────────────
const CTA = ({ onLaunch }) => {
  const [ref, inView] = useReveal();
  return (
    <section className="py-32 px-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <motion.div ref={ref}
          initial={{ opacity: 0, scale: 0.96 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#f0f0f8] border border-slate-200/80 rounded-[3rem] p-16 text-center relative overflow-hidden">
          <div className="absolute bottom-0 right-0 text-[200px] font-black text-slate-200/40 leading-none select-none pointer-events-none">AI</div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-8">
              <Zap className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-[0.22em]">Ready to Deploy</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6">
              Deploy the Swarm.<br /><span className="text-teal-600">Protect Your IP.</span>
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto mb-12 font-medium leading-relaxed">
              One URL. Six agents. Full autonomy. Watch the results appear live on the dashboard.
            </p>
            <button onClick={onLaunch}
              className="group px-10 py-5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm uppercase tracking-widest rounded-full transition-all shadow-[0_8px_30px_rgba(13,148,136,0.3)] hover:shadow-[0_8px_40px_rgba(13,148,136,0.45)] flex items-center gap-3 mx-auto">
              <Shield className="w-5 h-5" />
              Initialize Command Center
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="mt-8 text-[11px] text-slate-400 font-medium uppercase tracking-widest">
              Google Solution Challenge 2026 · SDG 8 & 9
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const Landing = () => {
  const navigate = useNavigate();
  const onLaunch = () => navigate('/dashboard/overview');
  return (
    <div className="bg-white min-h-screen overflow-x-hidden">
      <Nav onLaunch={onLaunch} />
      <Hero onLaunch={onLaunch} />
      <AgentsSection />
      <PipelineSection />
      <TechSection />
      <CTA onLaunch={onLaunch} />
      <footer className="py-10 px-8 border-t border-slate-100 bg-[#f7f7fc]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-black text-slate-900">MediaGuard<span className="text-teal-600">Sports</span></span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">
            © 2026 · Autonomous Intelligence · Global IP Protection
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
