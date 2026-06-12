import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { useDashboard } from '../../context/DashboardContext';

const SEV_COLOR = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#0d9488' };

function getSev(inc) {
  if (inc.match_confirmed || (inc.confidence_score || 0) >= 75) return 'critical';
  if ((inc.confidence_score || 0) >= 50) return 'high';
  if ((inc.confidence_score || 0) >= 30) return 'medium';
  return 'low';
}

const ThreatFeed = () => {
  const { eventLog } = useSocket();
  const { incidents } = useDashboard();

  // Build feed from real socket events + incidents
  const feed = React.useMemo(() => {
    const items = [];

    // From socket event log (most recent events)
    eventLog.slice(0, 15).forEach(e => {
      const p = e.payload || {};
      let msg = '', severity = 'medium', action = '';

      switch (e.type) {
        case 'sentinel:threat_found':
          msg = `${p.platform || 'Unknown'}: "${(p.title || '').slice(0, 40)}" — ${p.confidence_score?.toFixed(0)}%`;
          severity = p.match_confirmed ? 'critical' : (p.confidence_score >= 60 ? 'high' : 'medium');
          action = p.match_confirmed ? 'DMCA queued' : 'Scanning';
          break;
        case 'watchdog:alert':
          msg = `Watchdog: ${(p.alerts || []).length} new piracy detections for "${(p.asset_title || '').slice(0, 30)}"`;
          severity = 'critical'; action = 'Auto-detected';
          break;
        case 'adjudicator:verdict':
          msg = `Verdict: ${p.verdict?.classification} → ${p.next_agent}`;
          severity = p.verdict?.routing === 'Enforcer' ? 'critical' : 'low';
          action = p.verdict?.routing || 'Classified';
          break;
        case 'enforcer:notice_ready':
          msg = `DMCA drafted for ${p.platform} — tier: ${p.tier}`;
          severity = 'critical'; action = 'Drafted';
          break;
        case 'broker:contract_ready':
          msg = `Rev-share contract: ${p.tier} tier — $${p.estimated_monthly_revenue}/mo`;
          severity = 'low'; action = 'Minted';
          break;
        case 'spider:complete':
          msg = `Spider found ${p.total || 0} suspects across platforms`;
          severity = 'medium'; action = 'Crawled';
          break;
        case 'swarm:complete':
          msg = `Swarm complete: ${p.piracy_count || 0} piracy, ${p.fair_use_count || 0} fair use`;
          severity = p.piracy_count > 0 ? 'high' : 'low'; action = 'Complete';
          break;
        case 'leak:chain_detected':
          msg = `Leak chain: ${p.first_leak_platform} — risk: ${p.leak_risk}`;
          severity = p.leak_risk === 'critical' ? 'critical' : 'high'; action = 'Chain found';
          break;
        default: return;
      }
      if (msg) items.push({ id: e.ts || Date.now() + Math.random(), time: new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), severity, msg, action });
    });

    // If no events yet, show from incidents as initial data
    if (items.length < 3) {
      incidents.slice(0, 8).forEach((inc, i) => {
        items.push({
          id: `inc_${inc._id}_${i}`,
          time: inc.createdAt ? new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--',
          severity: getSev(inc),
          msg: `${inc.platform || 'Unknown'}: "${(inc.title || 'Unknown').slice(0, 40)}" — ${Math.round(inc.confidence_score || 0)}%`,
          action: inc.classification === 'SEVERE PIRACY' ? 'DMCA' : inc.classification === 'FAIR USE / FAN CONTENT' ? 'Fair use' : 'Detected',
        });
      });
    }

    return items.slice(0, 12);
  }, [eventLog, incidents]);

  return (
    <div style={{ background: '#0a0f1a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Threat Feed</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', animation: 'blink 1.4s infinite' }} />
          <span style={{ fontSize: 7, color: '#ef4444', fontWeight: 700 }}>LIVE</span>
        </div>
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto', padding: '4px 8px' }}>
        <AnimatePresence>
          {feed.map((item, i) => (
            <motion.div key={item.id}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              style={{ display: 'flex', gap: 8, padding: '6px 4px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
            >
              <span style={{ fontSize: 8, color: '#334155', fontFamily: 'monospace', flexShrink: 0, marginTop: 1 }}>{item.time}</span>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: SEV_COLOR[item.severity], flexShrink: 0, marginTop: 3, boxShadow: `0 0 4px ${SEV_COLOR[item.severity]}40` }} />
              <p style={{ fontSize: 9, color: '#94a3b8', margin: 0, flex: 1, lineHeight: 1.4 }}>{item.msg}</p>
              <span style={{ fontSize: 7, color: '#475569', flexShrink: 0, padding: '2px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.03)', fontWeight: 600 }}>{item.action}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {feed.length === 0 && <p style={{ padding: 16, textAlign: 'center', fontSize: 9, color: '#334155' }}>No events yet. Run a swarm to generate threat data.</p>}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  );
};

export default ThreatFeed;
