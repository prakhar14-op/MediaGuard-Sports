import React, { useState } from 'react';
import {
  ShieldCheck, AlertCircle, TrendingUp, Box,
  Cpu, Globe, Lock, Zap, Wifi, WifiOff, Play,
  ChevronDown, Activity,
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ─── GSSoC color tokens ───────────────────────────────────────────────────────
const G = {
  teal:    '#0d9488',
  tealLt:  '#2dd4bf',
  tealBg:  'rgba(13,148,136,0.08)',
  tealBdr: 'rgba(13,148,136,0.2)',
  bg:      '#f6f7fc',
  card:    '#ffffff',
  border:  'rgba(148,163,184,0.2)',
  text:    '#0f172a',
  sub:     '#64748b',
  muted:   '#94a3b8',
};

// ─── Stat card (GSSoC white card style) ──────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.10)' }}
    transition={{ duration: 0.3 }}
    style={{
      background: G.card, borderRadius: 20, padding: '22px 24px',
      border: `1px solid ${G.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: G.sub, margin: '0 0 8px' }}>
          {label}
        </p>
        <p style={{ fontSize: '2rem', fontWeight: 900, color: G.text, margin: '0 0 4px', lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: '0.72rem', color: G.muted, margin: 0 }}>{sub}</p>
      </div>
      <div style={{
        width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}15`, border: `1px solid ${color}30`,
      }}>
        <Icon size={20} style={{ color }} />
      </div>
    </div>
    <div style={{ marginTop: 14, height: 3, background: 'rgba(0,0,0,0.05)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: '70%', background: `linear-gradient(to right, ${color}, ${color}80)`, borderRadius: 99 }} />
    </div>
  </motion.div>
);

// ─── Vihaan Section collapsible ───────────────────────────────────────────────
const Section = ({ title, accent, count, defaultOpen = false, children, liveIndicator }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ margin: '0 0 12px', borderRadius: 16, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '13px 20px', cursor: 'pointer', userSelect: 'none',
          background: open ? `${accent}12` : `${accent}08`,
          border: open ? `2px solid ${accent}40` : `1px solid ${accent}20`,
          borderRadius: open ? '16px 16px 0 0' : 16,
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '18px 18px', pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: accent, letterSpacing: '0.04em' }}>{title}</span>
          {count !== undefined && count > 0 && (
            <span style={{ background: accent, color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>{count}</span>
          )}
          {liveIndicator && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', color: accent }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
              LIVE
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          style={{ width: 28, height: 28, background: `${accent}15`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          <ChevronDown size={14} />
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', border: `2px solid ${accent}30`, borderTop: 'none', borderRadius: '0 0 16px 16px', background: G.card }}>
            <div style={{ padding: '16px 20px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
};

// ─── Agent card ───────────────────────────────────────────────────────────────
const AGENTS = [
  { name: 'Archivist',   icon: Lock,       color: '#6366f1', desc: 'CLIP + FAISS vault'      },
  { name: 'Spider',      icon: Zap,         color: '#8b5cf6', desc: 'OSINT crawler'           },
  { name: 'Sentinel',    icon: Globe,       color: '#f59e0b', desc: 'pHash + CLIP scan'       },
  { name: 'Adjudicator', icon: Cpu,         color: '#a855f7', desc: 'Gemini 2.5 Flash triage' },
  { name: 'Enforcer',    icon: ShieldCheck, color: '#ef4444', desc: '17 U.S.C. § 512(c)'      },
  { name: 'Broker',      icon: TrendingUp,  color: G.teal,    desc: 'Polygon rev-share'       },
];

const AgentCard = ({ agent, isActive }) => {
  const Icon = agent.icon;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        background: isActive ? `${agent.color}10` : G.card,
        border: isActive ? `2px solid ${agent.color}40` : `1px solid ${G.border}`,
        borderRadius: 16, padding: '16px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        boxShadow: isActive ? `0 0 20px ${agent.color}20` : '0 1px 6px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${agent.color}15`, border: `1px solid ${agent.color}25`, marginBottom: 10,
      }}>
        <Icon size={20} style={{ color: agent.color }} />
      </div>
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: G.text, margin: '0 0 2px' }}>{agent.name}</p>
      <p style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: isActive ? agent.color : G.muted, margin: '0 0 6px' }}>
        {isActive ? 'Running' : 'Standby'}
      </p>
      <p style={{ fontSize: '0.65rem', color: G.muted, margin: 0 }}>{agent.desc}</p>
      {isActive && (
        <div style={{ marginTop: 10, width: '100%', height: 3, background: `${agent.color}20`, borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: agent.color, borderRadius: 99 }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  );
};

// ─── Activity feed item ───────────────────────────────────────────────────────
const FeedItem = ({ notif }) => {
  const colors = { threat: '#ef4444', success: G.teal, agent: '#6366f1' };
  const color = colors[notif.type] || G.muted;
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 0',
      borderBottom: `1px solid ${G.border}`,
    }}>
      <div style={{ width: 3, borderRadius: 99, background: color, flexShrink: 0, alignSelf: 'stretch' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.78rem', color: G.text, margin: '0 0 2px', lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700, color }}>{notif.title}</span>: {notif.message}
        </p>
        <p style={{ fontSize: '0.65rem', color: G.muted, margin: 0 }}>
          {new Date(notif.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Overview = () => {
  const { stats, notifications, backendOnline, swarmRunning, swarmPhase } = useDashboard();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const activeAgent = swarmPhase?.agent || null;

  return (
    <div style={{ color: G.text }}>

      {/* Status banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderRadius: 14, marginBottom: 24,
          background: backendOnline ? G.tealBg : 'rgba(245,158,11,0.08)',
          border: `1px solid ${backendOnline ? G.tealBdr : 'rgba(245,158,11,0.25)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {backendOnline
            ? <Wifi size={16} style={{ color: G.teal }} />
            : <WifiOff size={16} style={{ color: '#f59e0b' }} />
          }
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: backendOnline ? G.teal : '#f59e0b' }}>
            {backendOnline
              ? isConnected ? 'Backend online · Socket.io connected · Real-time updates active'
                            : 'Backend online · Socket.io connecting…'
              : 'Backend offline — showing mock data. Start the Node.js server on port 8000.'
            }
          </span>
        </div>
        {!swarmRunning ? (
          <button
            onClick={() => navigate('/dashboard/hunter')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              background: G.tealBg, border: `1px solid ${G.tealBdr}`, color: G.teal,
            }}
          >
            <Play size={11} /> Launch Swarm
          </button>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            borderRadius: 999, background: G.tealBg, border: `1px solid ${G.tealBdr}`,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: G.teal, animation: 'pulse 1s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: G.teal }}>
              {swarmPhase?.agent || 'Swarm'} running…
            </span>
          </div>
        )}
      </motion.div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Detections"  value={stats.totalDetections}  sub="Across 7 platforms"         color="#f59e0b" icon={AlertCircle}  />
        <StatCard label="Critical Threats"  value={stats.criticalThreats}  sub="Awaiting enforcement"       color="#ef4444" icon={ShieldCheck}  />
        <StatCard label="Monthly Revenue"   value={stats.revenueProtected > 0 ? `$${stats.revenueProtected.toFixed(0)}` : '$0'} sub="Active rev-share" color={G.teal} icon={TrendingUp} />
        <StatCard label="Assets Vaulted"    value={stats.assetsInVault}    sub="FAISS fingerprints"         color="#6366f1" icon={Box}          />
      </div>

      {/* Agent swarm section */}
      <Section title="Agent Swarm Heartbeat" accent={G.teal} defaultOpen={true}
        liveIndicator={swarmRunning} count={swarmRunning ? 1 : undefined}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {AGENTS.map(a => (
            <AgentCard key={a.name} agent={a} isActive={swarmRunning && activeAgent === a.name} />
          ))}
        </div>
      </Section>

      {/* Activity feed section */}
      <Section title="Activity Feed" accent="#6366f1" defaultOpen={true}
        count={notifications.filter(n => !n.read).length}>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {notifications.slice(0, 15).map(n => <FeedItem key={n.id} notif={n} />)}
          {notifications.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: G.muted }}>
              <Activity size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.82rem', margin: 0 }}>No activity yet. Launch a swarm to see live events.</p>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/dashboard/notifications')}
          style={{
            marginTop: 12, width: '100%', padding: '8px 0', borderRadius: 10,
            background: G.tealBg, border: `1px solid ${G.tealBdr}`,
            color: G.teal, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          View All Logs →
        </button>
      </Section>

    </div>
  );
};

export default Overview;
