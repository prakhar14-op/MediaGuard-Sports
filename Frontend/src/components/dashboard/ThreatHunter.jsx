import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import { swarmService } from '../../services/api';
import ThreatMap from './ThreatMap';
import {
  Play, Loader2, CheckCircle2, AlertTriangle, Zap,
  Globe, Eye, Brain, Gavel, Coins, Shield, Link as LinkIcon,
  Activity, TrendingUp,
} from 'lucide-react';

// ─── GSSoC tokens ─────────────────────────────────────────────────────────────
const G = {
  teal:    '#0d9488',
  tealBg:  'rgba(13,148,136,0.08)',
  tealBdr: 'rgba(13,148,136,0.2)',
  card:    '#ffffff',
  bg:      '#f6f7fc',
  border:  'rgba(148,163,184,0.2)',
  text:    '#0f172a',
  sub:     '#64748b',
  muted:   '#94a3b8',
};

// ─── Phase config ─────────────────────────────────────────────────────────────
const PHASES = [
  { num: 1, agent: 'Spider',      icon: Globe,   color: '#6366f1' },
  { num: 2, agent: 'Sentinel',    icon: Eye,     color: '#f59e0b' },
  { num: 3, agent: 'Adjudicator', icon: Brain,   color: '#a855f7' },
  { num: 4, agent: 'Enforcer',    icon: Gavel,   color: '#ef4444' },
  { num: 5, agent: 'Broker',      icon: Coins,   color: G.teal    },
];

// ─── Agent colors for log ─────────────────────────────────────────────────────
const LOG_CFG = {
  'swarm:phase':              { icon: '⚡', color: '#6366f1' },
  'spider:complete':          { icon: '🕷️', color: '#6366f1' },
  'sentinel:threat_found':    { icon: '👁️', color: '#f59e0b' },
  'sentinel:batch_complete':  { icon: '✅', color: G.teal    },
  'adjudicator:batch_started':{ icon: '⚖️', color: '#a855f7' },
  'adjudicator:thinking':     { icon: '🧠', color: '#a855f7' },
  'adjudicator:verdict':      { icon: '⚖️', color: '#a855f7' },
  'adjudicator:batch_complete':{ icon: '✅', color: '#a855f7' },
  'enforcer:drafting':        { icon: '📝', color: '#ef4444' },
  'enforcer:notice_ready':    { icon: '🔨', color: '#ef4444' },
  'enforcer:batch_complete':  { icon: '✅', color: '#ef4444' },
  'broker:minting':           { icon: '💎', color: G.teal    },
  'broker:contract_ready':    { icon: '💰', color: G.teal    },
  'broker:batch_complete':    { icon: '✅', color: G.teal    },
  'swarm:complete':           { icon: '🏁', color: G.teal    },
  'swarm:error':              { icon: '❌', color: '#ef4444' },
  'ingest:progress':          { icon: '📥', color: '#6366f1' },
  'ingest:complete':          { icon: '✅', color: G.teal    },
};

const logText = (type, payload) => ({
  'swarm:phase':              `Phase ${payload?.phase}: ${payload?.agent} — ${payload?.message}`,
  'spider:complete':          `Spider found ${payload?.total || 0} suspects`,
  'sentinel:threat_found':    `${payload?.severity}: ${payload?.title} on ${payload?.platform} (${payload?.confidence_score}%)`,
  'sentinel:batch_complete':  `Sentinel done — ${payload?.total || 0} scanned`,
  'adjudicator:batch_started':`Adjudicator: ${payload?.total || 0} to analyse`,
  'adjudicator:thinking':     payload?.message || 'Adjudicator thinking...',
  'adjudicator:verdict':      `Verdict: ${payload?.verdict?.classification} → ${payload?.next_agent}`,
  'adjudicator:batch_complete':`Done — ${payload?.enforcer_count || 0} DMCA, ${payload?.broker_count || 0} contracts`,
  'enforcer:drafting':        payload?.message || 'Drafting DMCA notice...',
  'enforcer:notice_ready':    `DMCA drafted (${payload?.tier}) — awaiting approval`,
  'enforcer:batch_complete':  `${payload?.total || 0} DMCA notices drafted`,
  'broker:minting':           payload?.message || 'Calculating rev-share...',
  'broker:contract_ready':    `Contract minted: ${payload?.tier} tier`,
  'broker:batch_complete':    `${payload?.total || 0} contracts minted`,
  'swarm:complete':           `Swarm complete — ${payload?.total_suspects || 0} suspects, ${payload?.dmca_drafted || 0} DMCA`,
  'swarm:error':              `Error: ${payload?.message}`,
  'ingest:progress':          payload?.message,
  'ingest:complete':          `Vaulted: "${payload?.title}" — ${payload?.frame_count} frames`,
}[type] || type);

// ─── Custom tooltip for chart ─────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: G.card, border: `1px solid ${G.border}`, borderRadius: 10,
      padding: '8px 12px', fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      <p style={{ color: G.sub, margin: '0 0 4px', fontWeight: 600 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0', fontWeight: 700 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Phase progress bar ───────────────────────────────────────────────────────
const PhaseBar = ({ currentPhase }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 16 }}>
    {PHASES.map((p, i) => {
      const Icon = p.icon;
      const done   = currentPhase > p.num;
      const active = currentPhase === p.num;
      return (
        <React.Fragment key={p.num}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <motion.div
              animate={active ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? `${p.color}15` : active ? `${p.color}12` : 'rgba(0,0,0,0.04)',
                border: `2px solid ${done || active ? p.color : G.border}`,
                boxShadow: active ? `0 0 12px ${p.color}30` : 'none',
                transition: 'all 0.3s',
              }}
            >
              {done
                ? <CheckCircle2 size={16} style={{ color: p.color }} />
                : <Icon size={14} style={{ color: active ? p.color : G.muted }} />
              }
            </motion.div>
            <span style={{
              fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: active ? p.color : done ? G.sub : G.muted,
            }}>{p.agent}</span>
          </div>
          {i < PHASES.length - 1 && (
            <div style={{
              flex: 1, height: 2, marginBottom: 16, borderRadius: 99,
              background: done ? `linear-gradient(to right, ${p.color}, ${PHASES[i + 1].color})` : G.border,
              transition: 'background 0.5s',
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Log entry (Vihaan terminal style adapted to light) ───────────────────────
const LogEntry = ({ event }) => {
  const { type, payload, ts } = event;
  const cfg = LOG_CFG[type] || { icon: '•', color: G.muted };
  const text = logText(type, payload);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '8px 10px', borderRadius: 8, marginBottom: 4,
        background: `${cfg.color}08`, border: `1px solid ${cfg.color}18`,
      }}
    >
      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
      <p style={{ fontSize: 11, color: G.text, flex: 1, lineHeight: 1.4, margin: 0, fontWeight: 500 }}>
        {text}
      </p>
      <span style={{ fontSize: 9, color: G.muted, flexShrink: 0, fontFamily: 'monospace' }}>
        {new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const ThreatHunter = () => {
  const {
    activeJobId, setActiveJobId, swarmPhase, swarmRunning,
    swarmComplete, setSwarmComplete, addNotification, joinRoom, incidents,
  } = useDashboard();
  const { eventLog } = useSocket();

  const [url,       setUrl]       = useState('');
  const [launching, setLaunching] = useState(false);
  const [error,     setError]     = useState('');
  const logRef = useRef(null);

  // Build live chart data from incidents — confidence over time
  const chartData = useMemo(() => {
    const sorted = [...incidents]
      .filter(i => i.confidence_score && i.createdAt)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-20);
    return sorted.map((inc, i) => ({
      name: `#${i + 1}`,
      confidence: Math.round(inc.confidence_score || 0),
      critical: inc.severity === 'CRITICAL' ? Math.round(inc.confidence_score || 0) : null,
      time: new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
  }, [incidents]);

  const jobLog = activeJobId
    ? eventLog.filter(e => e.payload?.jobId === activeJobId || !e.payload?.jobId)
    : eventLog.slice(0, 40);

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
      setUrl('');
      addNotification({ type: 'agent', title: 'Swarm Deployed', message: `Job ${jobId.slice(0, 8)}… — monitoring all 5 phases.` });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to launch swarm. Is the backend running?');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: G.text }}>

      {/* ── Launch card ── */}
      <div style={{
        background: G.card, borderRadius: 20, padding: 20,
        border: `1px solid ${G.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: G.tealBg, border: `1px solid ${G.tealBdr}`,
          }}>
            <Zap size={18} style={{ color: G.teal }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>Deploy Agent Swarm</p>
            <p style={{ fontSize: 11, color: G.sub, margin: '2px 0 0' }}>Paste an official video URL — all 5 phases run autonomously</p>
          </div>
          {swarmRunning && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 999, background: G.tealBg, border: `1px solid ${G.tealBdr}`,
            }}>
              <Loader2 size={12} style={{ color: G.teal, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: G.teal, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {swarmPhase?.agent || 'Running'}
              </span>
            </div>
          )}
          {swarmComplete && !swarmRunning && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 999, background: 'rgba(13,148,136,0.08)', border: `1px solid ${G.tealBdr}`,
            }}>
              <CheckCircle2 size={12} style={{ color: G.teal }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: G.teal, textTransform: 'uppercase' }}>Complete</span>
            </div>
          )}
        </div>

        <form onSubmit={handleLaunch} style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <LinkIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: G.muted }} />
            <input
              type="url" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={swarmRunning}
              style={{
                width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                borderRadius: 12, border: `1px solid ${G.border}`, background: '#f8fafc',
                fontSize: 13, color: G.text, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = G.tealBdr}
              onBlur={e => e.target.style.borderColor = G.border}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={swarmRunning || launching || !url.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: swarmRunning || launching ? G.border : `linear-gradient(135deg, ${G.teal}, #2dd4bf)`,
              color: swarmRunning || launching ? G.muted : '#fff',
              boxShadow: swarmRunning ? 'none' : `0 0 20px ${G.teal}30`,
              opacity: (!url.trim() && !swarmRunning) ? 0.5 : 1,
            }}
          >
            {launching || swarmRunning ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
            {swarmRunning ? 'Running…' : 'Launch'}
          </motion.button>
        </form>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: '#ef4444' }}>
            <AlertTriangle size={12} />{error}
          </div>
        )}

        {/* Phase bar */}
        {(swarmRunning || swarmComplete) && (
          <PhaseBar currentPhase={swarmRunning ? currentPhase : 6} />
        )}

        {/* Summary grid */}
        <AnimatePresence>
          {swarmComplete && !swarmRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}
            >
              {[
                { label: 'Suspects',  value: swarmComplete.total_suspects   || 0, color: '#6366f1' },
                { label: 'Piracy',    value: swarmComplete.piracy_count     || 0, color: '#ef4444' },
                { label: 'DMCA',      value: swarmComplete.dmca_drafted     || 0, color: '#f59e0b' },
                { label: 'Contracts', value: swarmComplete.contracts_minted || 0, color: G.teal    },
              ].map(s => (
                <div key={s.label} style={{
                  background: `${s.color}08`, border: `1px solid ${s.color}20`,
                  borderRadius: 12, padding: '12px 8px', textAlign: 'center',
                }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: G.sub, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '3px 0 0' }}>{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Live confidence chart ── */}
      <div style={{
        background: G.card, borderRadius: 20, padding: '18px 20px',
        border: `1px solid ${G.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} style={{ color: G.teal }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: G.text, margin: 0 }}>Live Confidence Scores</p>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: G.tealBg, border: `1px solid ${G.tealBdr}`, color: G.teal,
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {incidents.length} incidents
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: G.muted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: G.teal, display: 'inline-block' }} />
              Confidence
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              Critical
            </span>
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={G.teal} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={G.teal} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: G.muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: G.muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={55} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1}
                label={{ value: 'Threshold', position: 'right', fontSize: 8, fill: '#f59e0b' }} />
              <Area type="monotone" dataKey="confidence" name="Confidence" stroke={G.teal}
                strokeWidth={2} fill="url(#confGrad)" dot={{ r: 3, fill: G.teal, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="critical" name="Critical" stroke="#ef4444"
                strokeWidth={2} fill="url(#critGrad)" dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <TrendingUp size={28} style={{ color: G.muted, opacity: 0.4 }} />
            <p style={{ fontSize: 12, color: G.muted, margin: 0 }}>Chart populates as incidents are detected</p>
          </div>
        )}
      </div>

      {/* ── Map + live log ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, minHeight: 420 }}>

        {/* Map */}
        <div style={{
          borderRadius: 20, overflow: 'hidden',
          border: `1px solid ${G.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}>
          <ThreatMap />
        </div>

        {/* Live agent log — Vihaan terminal style */}
        <div style={{
          background: '#0d1117', borderRadius: 20, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          {/* Terminal header */}
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginLeft: 4 }}>
                Live Agent Feed
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: swarmRunning ? '#10b981' : '#334155',
                animation: swarmRunning ? 'pulse 1s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: 9, color: '#475569' }}>{jobLog.length} events</span>
            </div>
          </div>

          {/* Log entries */}
          <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            <AnimatePresence initial={false}>
              {jobLog.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 0', textAlign: 'center' }}>
                  <Shield size={28} style={{ color: '#1e293b', marginBottom: 10 }} />
                  <p style={{ fontSize: 11, color: '#334155', margin: 0 }}>No activity yet.</p>
                  <p style={{ fontSize: 10, color: '#1e293b', margin: '4px 0 0' }}>Launch a swarm to see live events.</p>
                </div>
              ) : (
                jobLog.map((e, i) => <LogEntry key={`${e.type}-${e.ts}-${i}`} event={e} />)
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
};

export default ThreatHunter;
