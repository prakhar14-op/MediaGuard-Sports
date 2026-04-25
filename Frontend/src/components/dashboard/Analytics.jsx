import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart, Bar, Line, Area, AreaChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import {
  TrendingUp, Shield, Coins, AlertTriangle, RefreshCw,
  Activity, BarChart3, PieChart as PieIcon, Zap,
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

const COLORS = {
  piracy:   '#ef4444',
  fairuse:  G.teal,
  warning:  '#f59e0b',
  info:     '#6366f1',
  purple:   '#a855f7',
  dmca:     '#ef4444',
  contract: G.teal,
};

const PLATFORM_COLORS = {
  YouTube:   '#ef4444',
  TikTok:    '#000000',
  Twitter:   '#1d9bf0',
  Instagram: '#e1306c',
  Telegram:  '#2ca5e0',
  Reddit:    '#ff4500',
  Other:     G.muted,
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: G.card, border: `1px solid ${G.border}`, borderRadius: 10,
      padding: '10px 14px', fontSize: 11, boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
    }}>
      <p style={{ color: G.sub, margin: '0 0 6px', fontWeight: 700 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color || G.text, margin: '2px 0', fontWeight: 600 }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Metric card ──────────────────────────────────────────────────────────────
const MetricCard = ({ icon: Icon, value, label, color, sub, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
    style={{
      background: G.card, borderRadius: 16, padding: '18px 20px',
      border: `1px solid ${G.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: G.muted, margin: '0 0 8px' }}>{label}</p>
        <p style={{ fontSize: 28, fontWeight: 900, color, margin: '0 0 3px' }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: G.sub, margin: 0 }}>{sub}</p>}
      </div>
      <div style={{
        width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}12`, border: `1px solid ${color}25`,
      }}>
        <Icon size={18} style={{ color }} />
      </div>
    </div>
    <div style={{ marginTop: 12, height: 3, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: '70%', background: `linear-gradient(to right, ${color}, ${color}80)`, borderRadius: 99 }} />
    </div>
  </motion.div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const Analytics = () => {
  const { incidents, dmcas, contracts, stats, refresh } = useDashboard();
  const { eventLog, isConnected } = useSocket();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [liveCount,  setLiveCount]  = useState(0);

  // Update on new socket events
  useEffect(() => {
    if (eventLog.length > 0) {
      setLastUpdate(new Date());
      setLiveCount(c => c + 1);
    }
  }, [eventLog.length]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Confidence over time (last 24 incidents)
  const confidenceData = useMemo(() => {
    return [...incidents]
      .filter(i => i.confidence_score && i.createdAt)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-24)
      .map((inc, i) => ({
        name: `#${i + 1}`,
        confidence: Math.round(inc.confidence_score || 0),
        critical: inc.severity === 'CRITICAL' ? Math.round(inc.confidence_score || 0) : null,
        time: new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
  }, [incidents]);

  // Platform breakdown
  const platformData = useMemo(() => {
    const counts = {};
    incidents.forEach(i => { counts[i.platform || 'Other'] = (counts[i.platform || 'Other'] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, color: PLATFORM_COLORS[name] || G.muted }));
  }, [incidents]);

  // Classification breakdown
  const classData = useMemo(() => {
    const piracy  = incidents.filter(i => i.classification === 'SEVERE PIRACY').length;
    const fairuse = incidents.filter(i => i.classification === 'FAIR USE / FAN CONTENT').length;
    const pending = incidents.filter(i => !i.classification || i.classification === 'UNREVIEWED').length;
    return [
      { name: 'Severe Piracy',  value: piracy,  color: COLORS.piracy  },
      { name: 'Fair Use',       value: fairuse, color: COLORS.fairuse },
      { name: 'Unreviewed',     value: pending, color: G.muted        },
    ].filter(d => d.value > 0);
  }, [incidents]);

  // DMCA + contracts over time (last 10 events)
  const actionData = useMemo(() => {
    const slots = Array.from({ length: 10 }, (_, i) => ({
      name: `T-${9 - i}`,
      dmca:     0,
      contracts: 0,
      incidents: 0,
    }));
    // Distribute incidents across slots
    incidents.slice(-30).forEach((inc, i) => {
      const slot = Math.min(9, Math.floor(i / 3));
      slots[slot].incidents++;
      if (inc.status === 'takedown_pending' || inc.status === 'takedown_sent') slots[slot].dmca++;
      if (inc.status === 'monetized') slots[slot].contracts++;
    });
    return slots;
  }, [incidents, dmcas, contracts]);

  // Severity distribution
  const sevData = useMemo(() => {
    const critical = incidents.filter(i => i.severity === 'CRITICAL').length;
    const warning  = incidents.filter(i => i.severity === 'WARNING').length;
    const info     = incidents.filter(i => i.severity === 'INFO').length;
    return [
      { name: 'Critical', value: critical, color: COLORS.piracy  },
      { name: 'Warning',  value: warning,  color: COLORS.warning },
      { name: 'Info',     value: info,     color: COLORS.info    },
    ].filter(d => d.value > 0);
  }, [incidents]);

  const totalRevenue = contracts.reduce((s, c) => s + (Number(c.estimated_monthly_revenue) || 0), 0);
  const avgConf = incidents.length > 0
    ? Math.round(incidents.reduce((s, i) => s + (i.confidence_score || 0), 0) / incidents.length)
    : 0;

  return (
    <div style={{ color: G.text }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: G.text, margin: 0 }}>
            ⚡ Intelligence Analytics
          </h2>
          <p style={{ fontSize: 12, color: G.sub, margin: '3px 0 0' }}>
            MediaGuard detection metrics · Live from swarm agents
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
            borderRadius: 999, fontSize: 10, fontWeight: 700,
            background: isConnected ? G.tealBg : 'rgba(245,158,11,0.08)',
            border: `1px solid ${isConnected ? G.tealBdr : 'rgba(245,158,11,0.25)'}`,
            color: isConnected ? G.teal : '#f59e0b',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? G.teal : '#f59e0b', animation: isConnected ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
          <div style={{ fontSize: 10, color: G.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={11} style={{ animation: 'spin 4s linear infinite' }} />
            {lastUpdate.toLocaleTimeString()}
            {liveCount > 0 && (
              <span style={{ background: G.tealBg, color: G.teal, border: `1px solid ${G.tealBdr}`, padding: '1px 7px', borderRadius: 999, fontWeight: 700 }}>
                +{liveCount} live
              </span>
            )}
          </div>
          <button onClick={refresh} style={{
            padding: '5px 12px', borderRadius: 8, border: `1px solid ${G.border}`,
            background: G.card, cursor: 'pointer', fontSize: 11, color: G.sub,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>
      {/* Main chart: Confidence over time + action bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginBottom: 16 }}>

        {/* LEFT: Confidence area chart */}
        <div style={{
          background: G.card, borderRadius: 18, padding: '18px 16px',
          border: `1px solid ${G.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={15} style={{ color: G.teal }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: G.text, margin: 0 }}>Confidence Score Timeline</p>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: G.muted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: G.teal, display: 'inline-block' }} /> Confidence
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.piracy, display: 'inline-block' }} /> Critical
              </span>
            </div>
          </div>

          {confidenceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={confidenceData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={G.teal} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={G.teal} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: G.muted }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: G.muted }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={55} stroke={COLORS.warning} strokeDasharray="4 2" strokeWidth={1}
                  label={{ value: 'Threshold 55%', position: 'right', fontSize: 8, fill: COLORS.warning }} />
                <Area type="monotone" dataKey="confidence" name="Confidence" stroke={G.teal}
                  strokeWidth={2.5} fill="url(#confGrad)" dot={{ r: 3, fill: G.teal, strokeWidth: 0 }} />
                <Bar dataKey="critical" name="Critical" fill={COLORS.piracy} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <BarChart3 size={28} style={{ color: G.muted, opacity: 0.4 }} />
              <p style={{ fontSize: 12, color: G.muted, margin: 0 }}>Chart populates as incidents are detected</p>
            </div>
          )}
        </div>

        {/* RIGHT: Classification pie */}
        <div style={{
          background: G.card, borderRadius: 18, padding: '18px 16px',
          border: `1px solid ${G.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <PieIcon size={15} style={{ color: '#a855f7' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: G.text, margin: 0 }}>Classification Split</p>
          </div>

          {classData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={classData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    paddingAngle={3} dataKey="value">
                    {classData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {classData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                      <span style={{ fontSize: 11, color: G.sub }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <PieIcon size={28} style={{ color: G.muted, opacity: 0.4 }} />
              <p style={{ fontSize: 12, color: G.muted, margin: 0 }}>No classifications yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Action bars + Platform breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* DMCA + Contracts bar chart */}
        <div style={{
          background: G.card, borderRadius: 18, padding: '18px 16px',
          border: `1px solid ${G.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={15} style={{ color: COLORS.warning }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: G.text, margin: 0 }}>Enforcement Activity</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={actionData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: G.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: G.muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: G.sub }} />
              <Bar dataKey="incidents" name="Incidents" fill={`${COLORS.info}80`} radius={[3, 3, 0, 0]} />
              <Bar dataKey="dmca"      name="DMCA"      fill={`${COLORS.piracy}80`} radius={[3, 3, 0, 0]} />
              <Bar dataKey="contracts" name="Contracts" fill={`${G.teal}80`} radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="incidents" stroke={COLORS.info} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Platform breakdown */}
        <div style={{
          background: G.card, borderRadius: 18, padding: '18px 16px',
          border: `1px solid ${G.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingUp size={15} style={{ color: COLORS.info }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: G.text, margin: 0 }}>Platform Breakdown</p>
          </div>

          {platformData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {platformData.slice(0, 6).map((p, i) => {
                const max = platformData[0].value;
                return (
                  <motion.div key={p.name}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: G.text }}>{p.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: p.color }}>{p.value}</span>
                    </div>
                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p.value / max) * 100}%` }}
                        transition={{ delay: i * 0.06 + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: '100%', background: p.color, borderRadius: 99 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, height: 160 }}>
              <BarChart3 size={28} style={{ color: G.muted, opacity: 0.4 }} />
              <p style={{ fontSize: 12, color: G.muted, margin: 0 }}>No platform data yet</p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
};

export default Analytics;
