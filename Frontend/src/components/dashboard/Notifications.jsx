import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import {
  Bell, BellOff, CheckCheck, Trash2, AlertTriangle, Zap,
  Brain, Shield, CheckCircle, Info, ChevronDown,
  Wifi, WifiOff, ShieldAlert, Coins, Eye, Activity,
} from 'lucide-react';

// ─── GSSoC tokens ─────────────────────────────────────────────────────────────
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

// ─── Notification type config ─────────────────────────────────────────────────
const NOTIF_CFG = {
  threat:  { icon: ShieldAlert, color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'   },
  agent:   { icon: Brain,       color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)'  },
  success: { icon: CheckCircle, color: G.teal,    bg: G.tealBg,                 border: G.tealBdr               },
  default: { icon: Info,        color: G.sub,     bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.15)'},
};

// ─── Vihaan Section ───────────────────────────────────────────────────────────
const Section = ({ title, accent, count, defaultOpen = false, children, liveIndicator }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ margin: '0 0 12px', borderRadius: 16, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '13px 20px', cursor: 'pointer', userSelect: 'none',
          background: open ? `${accent}12` : `${accent}07`,
          border: open ? `2px solid ${accent}40` : `1px solid ${accent}20`,
          borderRadius: open ? '16px 16px 0 0' : 16,
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.025) 1px, transparent 1px)',
          backgroundSize: '18px 18px', pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: accent }}>{title}</span>
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
            style={{ overflow: 'hidden', border: `2px solid ${accent}25`, borderTop: 'none', borderRadius: '0 0 16px 16px', background: G.card }}>
            <div style={{ padding: '16px 20px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
};

// ─── Vihaan StatBadge ─────────────────────────────────────────────────────────
const StatBadge = ({ label, value, active, accent = G.teal }) => (
  <div style={{
    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '8px 14px',
    background: active ? `${accent}10` : 'rgba(0,0,0,0.03)',
    border: `2px solid ${active ? accent : G.border}`,
    borderRadius: 10, minWidth: 72,
  }}>
    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: active ? accent : G.muted }}>{value}</span>
    <span style={{ fontSize: '0.6rem', color: G.sub, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>{label}</span>
  </div>
);

// ─── Notification item (Vihaan NotifItem adapted to GSSoC light) ──────────────
const NotifItem = ({ notif, onDelete }) => {
  const cfg = NOTIF_CFG[notif.type] || NOTIF_CFG.default;
  const Icon = cfg.icon;
  const isUnread = !notif.read;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ scale: 1.005 }}
      style={{
        position: 'relative', display: 'flex', gap: 12, padding: '13px 15px',
        borderRadius: 12, marginBottom: 8, cursor: 'default',
        border: isUnread ? `1px solid ${G.tealBdr}` : `1px solid ${G.border}`,
        background: isUnread ? G.tealBg : G.card,
        boxShadow: isUnread ? '0 2px 12px rgba(13,148,136,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
      }}>
        <Icon size={18} style={{ color: cfg.color }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
          <p style={{
            fontSize: '0.85rem', fontWeight: isUnread ? 700 : 500,
            color: isUnread ? G.text : G.sub, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {notif.title}
          </p>
          <span style={{ fontSize: '0.68rem', color: G.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p style={{
          fontSize: '0.76rem', color: G.sub, margin: 0, lineHeight: 1.5,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {notif.message}
        </p>
        {notif.severity && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4,
            fontSize: '0.62rem', color: '#ef4444',
            background: 'rgba(239,68,68,0.08)', padding: '1px 7px', borderRadius: 999,
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <ShieldAlert size={9} /> {notif.severity}
          </span>
        )}
      </div>

      {isUnread && (
        <div style={{
          position: 'absolute', top: 13, right: 13,
          width: 7, height: 7, borderRadius: '50%', background: G.teal,
          boxShadow: `0 0 6px ${G.teal}`,
        }} />
      )}

      <button
        onClick={() => onDelete(notif.id)}
        style={{
          position: 'absolute', bottom: 9, right: 11,
          background: 'none', border: 'none', cursor: 'pointer',
          color: G.muted, padding: 2,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = G.muted}
      >
        <Trash2 size={11} />
      </button>
    </motion.div>
  );
};

// ─── Socket event item ────────────────────────────────────────────────────────
const EVENT_CFG = {
  'swarm:phase':            { color: '#6366f1', icon: Zap },
  'spider:complete':        { color: '#8b5cf6', icon: Eye },
  'sentinel:threat_found':  { color: '#ef4444', icon: ShieldAlert },
  'adjudicator:verdict':    { color: '#a855f7', icon: Brain },
  'enforcer:notice_ready':  { color: '#ef4444', icon: Shield },
  'broker:contract_ready':  { color: G.teal,    icon: Coins },
  'swarm:complete':         { color: G.teal,    icon: CheckCircle },
  'swarm:error':            { color: '#ef4444', icon: AlertTriangle },
  'ingest:complete':        { color: G.teal,    icon: CheckCircle },
};

const eventText = (type, payload) => ({
  'swarm:phase':            `Phase ${payload?.phase}: ${payload?.agent} — ${payload?.message}`,
  'spider:complete':        `Spider found ${payload?.total || 0} suspects`,
  'sentinel:threat_found':  `${payload?.severity}: ${payload?.title} on ${payload?.platform} (${payload?.confidence_score}%)`,
  'adjudicator:verdict':    `Verdict: ${payload?.verdict?.classification} → ${payload?.next_agent}`,
  'enforcer:notice_ready':  `DMCA drafted (${payload?.tier}) — awaiting approval`,
  'broker:contract_ready':  `Contract minted: ${payload?.tier} tier`,
  'swarm:complete':         `Swarm complete — ${payload?.total_suspects || 0} suspects, ${payload?.dmca_drafted || 0} DMCA`,
  'swarm:error':            `Error: ${payload?.message}`,
  'ingest:complete':        `Vaulted: "${payload?.title}" — ${payload?.frame_count} frames`,
}[type] || type);

const EventItem = ({ event }) => {
  const cfg = EVENT_CFG[event.type] || { color: G.muted, icon: Info };
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px', borderRadius: 10, marginBottom: 6,
        background: `${cfg.color}07`, border: `1px solid ${cfg.color}18`,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${cfg.color}12`,
      }}>
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.78rem', color: G.text, margin: '0 0 2px', lineHeight: 1.4, fontWeight: 500 }}>
          {eventText(event.type, event.payload)}
        </p>
        <span style={{ fontSize: '0.62rem', color: G.muted }}>
          {new Date(event.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Notifications = () => {
  const { notifications, backendOnline } = useDashboard();
  const { isConnected, eventLog } = useSocket();
  const [localNotifs, setLocalNotifs] = useState(notifications);
  const [filterType, setFilterType] = useState('all');

  React.useEffect(() => { setLocalNotifs(notifications); }, [notifications]);

  const unread     = localNotifs.filter(n => !n.read).length;
  const markAllRead = () => setLocalNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll    = () => setLocalNotifs([]);
  const deleteOne   = (id) => setLocalNotifs(prev => prev.filter(n => n.id !== id));
  const filtered    = localNotifs.filter(n => filterType === 'all' || n.type === filterType);

  return (
    <div style={{ color: G.text }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: G.text, margin: 0 }}>Intelligence Logs</h2>
          <p style={{ fontSize: '0.75rem', color: G.sub, margin: '3px 0 0' }}>
            Real-time feed of swarm detections and agent actions
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
            borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
            background: isConnected ? G.tealBg : 'rgba(245,158,11,0.08)',
            border: `1px solid ${isConnected ? G.tealBdr : 'rgba(245,158,11,0.25)'}`,
            color: isConnected ? G.teal : '#f59e0b',
          }}>
            {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isConnected ? 'Socket Live' : 'Disconnected'}
          </div>
          {!backendOnline && (
            <div style={{
              padding: '5px 12px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b',
            }}>⚠ Backend Offline</div>
          )}
        </div>
      </div>

      {/* Stat badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <StatBadge label="Total Events"  value={localNotifs.length}                                    active={localNotifs.length > 0} accent={G.teal}    />
        <StatBadge label="Unread"        value={unread}                                                active={unread > 0}             accent={G.teal}    />
        <StatBadge label="Socket Events" value={eventLog.length}                                       active={eventLog.length > 0}    accent="#6366f1"   />
        <StatBadge label="Threats"       value={localNotifs.filter(n => n.type === 'threat').length}   active={true}                   accent="#ef4444"   />
        <StatBadge label="Agent Actions" value={localNotifs.filter(n => n.type === 'agent').length}    active={true}                   accent="#a855f7"   />
      </div>

      {/* Section 01: Notifications */}
      <Section title="01 · Live Notifications" accent={G.teal} count={unread} defaultOpen={true} liveIndicator={true}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {['all', 'threat', 'agent', 'success'].map(t => (
              <button key={t} onClick={() => setFilterType(t)} style={{
                padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                borderColor: filterType === t ? G.teal : G.border,
                background: filterType === t ? G.tealBg : 'transparent',
                color: filterType === t ? G.teal : G.sub,
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
                borderRadius: 8, fontSize: '0.68rem', border: `1px solid ${G.border}`,
                background: 'transparent', color: G.sub, cursor: 'pointer',
              }}>
                <CheckCheck size={11} /> Mark all read
              </button>
            )}
            {localNotifs.length > 0 && (
              <button onClick={clearAll} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                borderRadius: 8, fontSize: '0.68rem', border: '1px solid rgba(239,68,68,0.2)',
                background: 'rgba(239,68,68,0.05)', color: '#ef4444', cursor: 'pointer',
              }}>
                <Trash2 size={11} /> Clear all
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {filtered.length > 0
            ? filtered.map(n => <NotifItem key={n.id} notif={n} onDelete={deleteOne} />)
            : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: G.muted }}>
                <BellOff size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.85rem', margin: 0, color: G.sub }}>No notifications yet.</p>
                <p style={{ fontSize: '0.72rem', margin: '4px 0 0', color: G.muted }}>Launch a swarm to see live agent events here.</p>
              </div>
            )
          }
        </AnimatePresence>
      </Section>

      {/* Section 02: Socket Event Stream */}
      <Section title="02 · Socket Event Stream" accent="#6366f1" count={eventLog.length} defaultOpen={false} liveIndicator={isConnected}>
        {eventLog.length > 0
          ? eventLog.slice(0, 50).map((e, i) => <EventItem key={`${e.type}-${e.ts}-${i}`} event={e} />)
          : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: G.muted }}>
              <Activity size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p style={{ fontSize: '0.8rem', margin: 0, color: G.sub }}>No socket events yet.</p>
            </div>
          )
        }
      </Section>

    </div>
  );
};

export default Notifications;
