import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import {
  Bell, BellOff, CheckCheck, Trash2, AlertTriangle, Zap,
  Brain, Shield, CheckCircle, Info, ChevronDown, RefreshCw,
  Wifi, WifiOff, Settings, ShieldAlert, Coins, Eye,
} from 'lucide-react';

// ─── GSSoC teal theme tokens ──────────────────────────────────────────────────
const T = {
  bg:       '#06030f',
  card:     '#0d1117',
  border:   'rgba(255,255,255,0.06)',
  teal:     '#2dd4bf',
  tealDim:  'rgba(45,212,191,0.12)',
  tealBdr:  'rgba(45,212,191,0.25)',
  muted:    '#475569',
  text:     '#e2e8f0',
  sub:      '#64748b',
};

// ─── Notification type config ─────────────────────────────────────────────────
const NOTIF_CFG = {
  threat:  { icon: ShieldAlert, color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'   },
  agent:   { icon: Brain,       color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.25)' },
  success: { icon: CheckCircle, color: T.teal,    bg: T.tealDim,                border: T.tealBdr                },
  default: { icon: Info,        color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
};

// ─── Collapsible Section (Vihaan pattern) ─────────────────────────────────────
const Section = ({ title, accent, count, defaultOpen = false, children, liveIndicator }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32 }}
      style={{ margin: '10px 0', borderRadius: 12, overflow: 'hidden' }}
    >
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', cursor: 'pointer', userSelect: 'none',
          background: `${accent}10`,
          border: open ? `2px solid ${accent}50` : `1px solid ${accent}20`,
          borderRadius: open ? '12px 12px 0 0' : 12,
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Dot pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px', pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <span style={{
            fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em',
            color: accent, textShadow: `0 0 20px ${accent}60`,
          }}>
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span style={{
              background: accent, color: '#000', fontSize: '0.68rem',
              fontWeight: 800, padding: '2px 8px', borderRadius: 999,
            }}>{count}</span>
          )}
          {liveIndicator && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: accent }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
              LIVE
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            width: 30, height: 30, background: 'rgba(0,0,0,0.4)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent,
          }}
        >
          <ChevronDown size={15} />
        </motion.div>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            style={{
              overflow: 'hidden',
              border: `2px solid ${accent}35`,
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              background: `${accent}05`,
              position: 'relative',
            }}
          >
            {/* Side dot patterns */}
            {['left', 'right'].map(side => (
              <div key={side} style={{
                position: 'absolute', top: 0, [side]: 0, width: '10%', height: '100%',
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '16px 16px', pointerEvents: 'none', opacity: 0.5,
              }} />
            ))}
            <div style={{ padding: '16px 20px', position: 'relative', zIndex: 1 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </motion.div>
  );
};

// ─── Stat badge (Vihaan StatBadge) ────────────────────────────────────────────
const StatBadge = ({ label, value, active, accent = T.teal }) => (
  <div style={{
    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '8px 14px',
    background: active ? `${accent}18` : 'rgba(255,255,255,0.04)',
    border: `2px solid ${active ? accent : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 10, minWidth: 72,
  }}>
    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: active ? accent : '#555', letterSpacing: '0.04em' }}>
      {value}
    </span>
    <span style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>
      {label}
    </span>
  </div>
);

// ─── Notification item ────────────────────────────────────────────────────────
const NotifItem = ({ notif, onDelete }) => {
  const cfg = NOTIF_CFG[notif.type] || NOTIF_CFG.default;
  const Icon = cfg.icon;
  const isUnread = !notif.read;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ scale: 1.005 }}
      style={{
        position: 'relative', display: 'flex', gap: 12, padding: '13px 15px',
        borderRadius: 12, marginBottom: 8, cursor: 'default',
        border: isUnread ? `1px solid ${T.tealBdr}` : `1px solid ${T.border}`,
        background: isUnread ? T.tealDim : 'rgba(255,255,255,0.02)',
        transition: 'all 0.15s',
      }}
    >
      {/* Icon box */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
      }}>
        <Icon size={18} style={{ color: cfg.color }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
          <p style={{
            fontSize: '0.85rem', fontWeight: isUnread ? 700 : 500,
            color: isUnread ? '#fff' : '#94a3b8', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {notif.title}
          </p>
          <span style={{ fontSize: '0.68rem', color: '#475569', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p style={{
          fontSize: '0.76rem', color: '#64748b', margin: 0, lineHeight: 1.5,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {notif.message}
        </p>
        {notif.severity && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4,
            fontSize: '0.62rem', color: '#ef4444',
            background: 'rgba(239,68,68,0.1)', padding: '1px 7px', borderRadius: 999,
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <ShieldAlert size={9} /> {notif.severity}
          </span>
        )}
      </div>

      {/* Unread dot */}
      {isUnread && (
        <div style={{
          position: 'absolute', top: 13, right: 13,
          width: 7, height: 7, borderRadius: '50%', background: T.teal,
          boxShadow: `0 0 6px ${T.teal}`,
        }} />
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(notif.id)}
        style={{
          position: 'absolute', bottom: 9, right: 11,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#334155', padding: 2, opacity: 0.6,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#334155'}
      >
        <Trash2 size={11} />
      </button>
    </motion.div>
  );
};

// ─── Event log item (swarm events) ───────────────────────────────────────────
const EVENT_CFG = {
  'swarm:phase':            { color: '#818cf8', icon: Zap },
  'spider:complete':        { color: '#818cf8', icon: Eye },
  'sentinel:threat_found':  { color: '#f87171', icon: ShieldAlert },
  'adjudicator:verdict':    { color: '#c084fc', icon: Brain },
  'enforcer:notice_ready':  { color: '#f87171', icon: Shield },
  'broker:contract_ready':  { color: T.teal,    icon: Coins },
  'swarm:complete':         { color: T.teal,    icon: CheckCircle },
  'swarm:error':            { color: '#ef4444', icon: AlertTriangle },
  'ingest:complete':        { color: T.teal,    icon: CheckCircle },
  'ingest:error':           { color: '#ef4444', icon: AlertTriangle },
};

const eventText = (type, payload) => {
  const m = {
    'swarm:phase':            `Phase ${payload?.phase}: ${payload?.agent} — ${payload?.message}`,
    'spider:complete':        `Spider found ${payload?.total || 0} suspects`,
    'sentinel:threat_found':  `${payload?.severity}: ${payload?.title} on ${payload?.platform} (${payload?.confidence_score}%)`,
    'adjudicator:verdict':    `Verdict: ${payload?.verdict?.classification} → ${payload?.next_agent}`,
    'enforcer:notice_ready':  `DMCA drafted (${payload?.tier}) — awaiting approval`,
    'broker:contract_ready':  `Contract minted: ${payload?.tier} tier`,
    'swarm:complete':         `Swarm complete — ${payload?.total_suspects || 0} suspects, ${payload?.dmca_drafted || 0} DMCA, ${payload?.contracts_minted || 0} contracts`,
    'swarm:error':            `Error: ${payload?.message}`,
    'ingest:complete':        `Vaulted: "${payload?.title}" — ${payload?.frame_count} frames`,
    'ingest:error':           `Ingest failed: ${payload?.message}`,
  };
  return m[type] || type;
};

const EventItem = ({ event }) => {
  const cfg = EVENT_CFG[event.type] || { color: '#475569', icon: Info };
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px', borderRadius: 10, marginBottom: 6,
        background: `${cfg.color}08`, border: `1px solid ${cfg.color}20`,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${cfg.color}15`,
      }}>
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.78rem', color: cfg.color, margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
          {eventText(event.type, event.payload)}
        </p>
        <span style={{ fontSize: '0.62rem', color: '#334155' }}>
          {new Date(event.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Notifications = () => {
  const { notifications, backendOnline, addNotification } = useDashboard();
  const { isConnected, eventLog } = useSocket();
  const [localNotifs, setLocalNotifs] = useState(notifications);
  const [filterType, setFilterType] = useState('all');

  // Sync with context
  React.useEffect(() => { setLocalNotifs(notifications); }, [notifications]);

  const unread = localNotifs.filter(n => !n.read).length;

  const markAllRead = () => setLocalNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll    = () => setLocalNotifs([]);
  const deleteOne   = (id) => setLocalNotifs(prev => prev.filter(n => n.id !== id));

  const filtered = localNotifs.filter(n =>
    filterType === 'all' || n.type === filterType
  );

  return (
    <div style={{ width: '100%', color: T.text }}>

      {/* ── Header stats ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Intelligence Logs
          </h2>
          <p style={{ fontSize: '0.75rem', color: T.muted, margin: '3px 0 0' }}>
            Real-time feed of swarm detections and agent actions
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
            borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
            background: isConnected ? 'rgba(45,212,191,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isConnected ? T.tealBdr : 'rgba(239,68,68,0.25)'}`,
            color: isConnected ? T.teal : '#ef4444',
          }}>
            {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isConnected ? 'Socket Live' : 'Disconnected'}
          </div>
          {!backendOnline && (
            <div style={{
              padding: '5px 12px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
              color: '#f59e0b',
            }}>
              ⚠ Backend Offline
            </div>
          )}
        </div>
      </div>

      {/* Stat badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <StatBadge label="Total Events"  value={localNotifs.length} active={localNotifs.length > 0} accent={T.teal} />
        <StatBadge label="Unread"        value={unread}             active={unread > 0}             accent={T.teal} />
        <StatBadge label="Socket Events" value={eventLog.length}    active={eventLog.length > 0}    accent="#818cf8" />
        <StatBadge label="Threats"       value={localNotifs.filter(n => n.type === 'threat').length}  active={true} accent="#ef4444" />
        <StatBadge label="Agent Actions" value={localNotifs.filter(n => n.type === 'agent').length}   active={true} accent="#c084fc" />
      </div>

      {/* ── Section 01: Notifications ── */}
      <Section title="01 · Live Notifications" accent={T.teal} count={unread} defaultOpen={true} liveIndicator={true}>
        {/* Filter + actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {['all', 'threat', 'agent', 'success'].map(t => (
              <button key={t} onClick={() => setFilterType(t)} style={{
                padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                borderColor: filterType === t ? T.teal : 'rgba(255,255,255,0.08)',
                background: filterType === t ? T.tealDim : 'transparent',
                color: filterType === t ? T.teal : '#555',
                transition: 'all 0.15s',
              }}>
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {unread > 0 && (
              <button onClick={markAllRead} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                borderRadius: 8, fontSize: '0.68rem', border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'pointer',
              }}>
                <CheckCheck size={11} /> Mark all read
              </button>
            )}
            {localNotifs.length > 0 && (
              <button onClick={clearAll} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                borderRadius: 8, fontSize: '0.68rem', border: '1px solid rgba(239,68,68,0.2)',
                background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer',
              }}>
                <Trash2 size={11} /> Clear all
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <AnimatePresence>
          {filtered.length > 0
            ? filtered.map(n => <NotifItem key={n.id} notif={n} onDelete={deleteOne} />)
            : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#334155' }}>
                <BellOff size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.85rem', margin: 0 }}>No notifications yet.</p>
                <p style={{ fontSize: '0.72rem', margin: '4px 0 0', color: '#1e293b' }}>
                  Launch a swarm to see live agent events here.
                </p>
              </div>
            )
          }
        </AnimatePresence>
      </Section>

      {/* ── Section 02: Socket Event Log ── */}
      <Section title="02 · Socket Event Stream" accent="#818cf8" count={eventLog.length} defaultOpen={false} liveIndicator={isConnected}>
        {eventLog.length > 0
          ? eventLog.slice(0, 50).map((e, i) => <EventItem key={`${e.type}-${e.ts}`} event={e} />)
          : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#334155' }}>
              <Zap size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p style={{ fontSize: '0.8rem', margin: 0 }}>No socket events yet.</p>
            </div>
          )
        }
      </Section>

    </div>
  );
};

export default Notifications;
