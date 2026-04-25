import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import { swarmService } from '../../services/api';
import ThreatMap from './ThreatMap';
import {
  Play, Loader2, CheckCircle2, AlertTriangle, Zap,
  Globe, Eye, Brain, Gavel, Coins, Shield, Link,
} from 'lucide-react';

// ─── Phase config ─────────────────────────────────────────────────────────────
const PHASES = [
  { num: 1, agent: 'Spider',      icon: Globe,   color: '#818cf8', label: 'Crawling the web' },
  { num: 2, agent: 'Sentinel',    icon: Eye,     color: '#fbbf24', label: 'Scanning suspects' },
  { num: 3, agent: 'Adjudicator', icon: Brain,   color: '#c084fc', label: 'Classifying incidents' },
  { num: 4, agent: 'Enforcer',    icon: Gavel,   color: '#f87171', label: 'Drafting DMCA notices' },
  { num: 5, agent: 'Broker',      icon: Coins,   color: '#34d399', label: 'Minting contracts' },
];

// ─── Live event log entry ─────────────────────────────────────────────────────
const LogEntry = ({ event }) => {
  const { type, payload, ts } = event;

  const config = {
    'swarm:phase':            { icon: '⚡', color: '#818cf8', text: `Phase ${payload.phase}: ${payload.agent} — ${payload.message}` },
    'spider:complete':        { icon: '🕷️', color: '#818cf8', text: `Spider found ${payload.total || 0} suspects` },
    'sentinel:threat_found':  { icon: '👁️', color: payload.severity === 'CRITICAL' ? '#f87171' : '#fbbf24', text: `${payload.severity}: ${payload.title} on ${payload.platform} (${payload.confidence_score}%)` },
    'sentinel:batch_complete':{ icon: '✅', color: '#2dd4bf', text: `Sentinel done — ${payload.piracy_count || 0} piracy, ${payload.fair_use_count || 0} fair use` },
    'adjudicator:thinking':   { icon: '⚖️', color: '#c084fc', text: `Adjudicator analysing ${payload.message || '...'}` },
    'adjudicator:verdict':    { icon: '⚖️', color: '#c084fc', text: `Verdict: ${payload.verdict?.classification} → ${payload.next_agent}` },
    'enforcer:notice_ready':  { icon: '🔨', color: '#f87171', text: `DMCA drafted (${payload.tier}) — awaiting approval` },
    'broker:contract_ready':  { icon: '💰', color: '#34d399', text: `Contract minted: ${payload.tier} tier` },
    'swarm:complete':         { icon: '🏁', color: '#2dd4bf', text: `Swarm complete — ${payload.total_suspects || 0} suspects, ${payload.dmca_drafted || 0} DMCA, ${payload.contracts_minted || 0} contracts` },
    'swarm:error':            { icon: '❌', color: '#f87171', text: `Error: ${payload.message}` },
    'ingest:progress':        { icon: '📥', color: '#818cf8', text: payload.message },
    'ingest:complete':        { icon: '✅', color: '#34d399', text: `Vaulted: "${payload.title}" — ${payload.frame_count} frames` },
  }[type] || { icon: '•', color: '#64748b', text: type };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-2.5 py-1.5 border-b border-white/5 last:border-0"
    >
      <span className="text-[13px] shrink-0 mt-0.5">{config.icon}</span>
      <p className="text-[11px] font-medium flex-1 leading-relaxed" style={{ color: config.color }}>
        {config.text}
      </p>
      <span className="text-[9px] text-slate-600 shrink-0 mt-0.5 font-mono">
        {new Date(ts).toLocaleTimeString()}
      </span>
    </motion.div>
  );
};

// ─── Phase progress bar ───────────────────────────────────────────────────────
const PhaseBar = ({ currentPhase }) => (
  <div className="flex items-center gap-1">
    {PHASES.map((p) => {
      const Icon = p.icon;
      const done    = currentPhase > p.num;
      const active  = currentPhase === p.num;
      return (
        <React.Fragment key={p.num}>
          <div className="flex flex-col items-center gap-1">
            <motion.div
              animate={active ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-300"
              style={{
                backgroundColor: done ? `${p.color}20` : active ? `${p.color}18` : 'rgba(255,255,255,0.03)',
                borderColor:     done ? p.color : active ? p.color : 'rgba(255,255,255,0.08)',
                boxShadow:       active ? `0 0 12px ${p.color}40` : 'none',
              }}
            >
              {done
                ? <CheckCircle2 className="w-4 h-4" style={{ color: p.color }} />
                : <Icon className="w-3.5 h-3.5" style={{ color: active ? p.color : '#475569' }} />
              }
            </motion.div>
            <span className="text-[8px] font-bold uppercase tracking-wider"
              style={{ color: active ? p.color : done ? '#64748b' : '#334155' }}>
              {p.agent}
            </span>
          </div>
          {p.num < 5 && (
            <div className="flex-1 h-px mb-4 transition-all duration-500"
              style={{ background: done ? `linear-gradient(to right, ${p.color}, ${PHASES[p.num].color})` : 'rgba(255,255,255,0.06)' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ThreatHunter = () => {
  const { activeJobId, setActiveJobId, swarmPhase, swarmRunning, swarmComplete, setSwarmComplete, addNotification, joinRoom } = useDashboard();
  const { eventLog } = useSocket();

  const [url,        setUrl]        = useState('');
  const [launching,  setLaunching]  = useState(false);
  const [error,      setError]      = useState('');
  const logRef = useRef(null);

  // Filter log to current job only
  const jobLog = activeJobId
    ? eventLog.filter(e => e.payload?.jobId === activeJobId || !e.payload?.jobId)
    : eventLog.slice(0, 30);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [jobLog.length]);

  const currentPhase = swarmPhase?.phase || 0;

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setLaunching(true);
    setSwarmComplete(null);

    try {
      const res = await swarmService.run(url.trim());
      const { jobId } = res.data;
      setActiveJobId(jobId);
      joinRoom(jobId);
      addNotification({ type: 'agent', title: 'Swarm Deployed', message: `Job ${jobId.slice(0, 8)} — monitoring all phases.` });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to launch swarm. Is the backend running?');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-4 -mt-4">

      {/* ── URL launcher ── */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Deploy Agent Swarm</h3>
            <p className="text-[11px] text-slate-400">Paste an official video URL — all 5 phases run autonomously</p>
          </div>
          {swarmRunning && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                {swarmPhase?.agent || 'Running'}
              </span>
            </div>
          )}
          {swarmComplete && !swarmRunning && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Complete</span>
            </div>
          )}
        </div>

        <form onSubmit={handleLaunch} className="flex gap-3">
          <div className="flex-1 relative">
            <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-slate-950 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
              disabled={swarmRunning}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={swarmRunning || launching || !url.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            {launching || swarmRunning
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Play className="w-4 h-4" />
            }
            {swarmRunning ? 'Running...' : 'Launch'}
          </motion.button>
        </form>

        {error && (
          <p className="mt-2 text-[11px] text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />{error}
          </p>
        )}

        {/* Phase progress */}
        {(swarmRunning || swarmComplete) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <PhaseBar currentPhase={swarmRunning ? currentPhase : 6} />
          </motion.div>
        )}

        {/* Swarm summary */}
        <AnimatePresence>
          {swarmComplete && !swarmRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 grid grid-cols-4 gap-3"
            >
              {[
                { label: 'Suspects',  value: swarmComplete.total_suspects  || 0, color: '#818cf8' },
                { label: 'Piracy',    value: swarmComplete.piracy_count    || 0, color: '#f87171' },
                { label: 'DMCA',      value: swarmComplete.dmca_drafted    || 0, color: '#fbbf24' },
                { label: 'Contracts', value: swarmComplete.contracts_minted|| 0, color: '#34d399' },
              ].map(s => (
                <div key={s.label} className="bg-slate-950/60 rounded-xl p-3 border border-white/5 text-center">
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main area: map + live log ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">

        {/* Map */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950">
          <ThreatMap />
        </div>

        {/* Live agent log */}
        <div className="flex flex-col bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Live Agent Feed</span>
            </div>
            <span className="text-[10px] text-slate-600">{jobLog.length} events</span>
          </div>

          <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-0 custom-scrollbar">
            <AnimatePresence initial={false}>
              {jobLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <Shield className="w-8 h-8 text-slate-700 mb-3" />
                  <p className="text-[11px] text-slate-600 font-medium">No activity yet.</p>
                  <p className="text-[10px] text-slate-700 mt-1">Launch a swarm to see live events.</p>
                </div>
              ) : (
                jobLog.map((e, i) => <LogEntry key={`${e.type}-${e.ts}`} event={e} />)
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatHunter;
