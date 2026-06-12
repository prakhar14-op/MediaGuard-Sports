import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';

const AnimatedCounter = ({ end, suffix = '', prefix = '', decimals = 0 }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const step = 16;
    const inc = (end - start) / (duration / step);
    const t = setInterval(() => { start += inc; if (start >= end) { start = end; clearInterval(t); } setVal(start); }, step);
    return () => clearInterval(t);
  }, [end]);
  return <>{prefix}{decimals > 0 ? val.toFixed(decimals) : Math.round(val)}{suffix}</>;
};

const IntelBar = () => {
  const { incidents, assets, dmcas, contracts, stats } = useDashboard();

  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL' || i.match_confirmed || (i.confidence_score || 0) >= 75).length;
  const warningCount = incidents.filter(i => (i.confidence_score || 0) >= 50 && (i.confidence_score || 0) < 75).length;
  const leaksToday = incidents.filter(i => {
    if (!i.createdAt) return false;
    const d = new Date(i.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length || criticalCount;

  const totalRevenue = contracts.reduce((s, c) => s + (c.estimated_monthly_revenue || 0), 0);
  const avgConfidence = incidents.length > 0 ? Math.round(incidents.reduce((s, i) => s + (i.confidence_score || 0), 0) / incidents.length) : 0;

  const data = [
    { label: 'Risk Level', value: Math.min(99, criticalCount * 12 + warningCount * 5 + 40), suffix: '/100', color: '#ef4444', glow: true },
    { label: 'Avg Confidence', value: avgConfidence || 72, suffix: '%', color: '#6366f1' },
    { label: 'Assets Protected', value: assets.length || 4, suffix: '', color: '#0d9488' },
    { label: 'Threats Detected', value: incidents.length, suffix: '', color: '#f59e0b' },
    { label: 'Revenue Protected', value: totalRevenue || 240, suffix: '', prefix: '$', color: '#0d9488' },
    { label: 'DMCA Issued', value: dmcas.length, suffix: '', color: '#ef4444' },
    { label: 'Contracts Active', value: contracts.length, suffix: '', color: '#a855f7' },
    { label: 'Critical Alerts', value: criticalCount, suffix: '', color: '#ef4444', glow: criticalCount > 0 },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 16 }}>
      {data.map((s, i) => (
        <motion.div key={s.label}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          style={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 10px 8px', position: 'relative', overflow: 'hidden' }}
        >
          {s.glow && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />}
          <p style={{ fontSize: 7, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>{s.label}</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: s.color, margin: 0, fontFamily: 'monospace' }}>
            <AnimatedCounter end={s.value} prefix={s.prefix || ''} suffix={s.suffix} decimals={0} />
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default IntelBar;
