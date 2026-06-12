import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpotlightCard from './SpotlightCard';
import LeakChainGraph from './LeakChainGraph';
import { X } from 'lucide-react';

/**
 * LiveStreamAlert — dark floating notification cards for live stream detections.
 * Top-right, stacks vertically, auto-dismisses after 10s.
 * Dark glass aesthetic with SpotlightCard glow.
 */

const SEVERITY_CONFIG = {
  CRITICAL: { accent: '#ef4444', glow: 'rgba(239,68,68,0.25)', label: 'PIRACY' },
  WARNING:  { accent: '#f59e0b', glow: 'rgba(245,158,11,0.2)', label: 'SUSPECT' },
  INFO:     { accent: '#0d9488', glow: 'rgba(13,148,136,0.2)',  label: 'SCANNING' },
};

const AlertCard = ({ alert, onDismiss }) => {
  const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
  const hasChain = alert.forensics_chain && alert.forensics_chain.length > 0;

  useEffect(() => {
    // Longer timeout for chain alerts so graph is visible
    const timer = setTimeout(() => onDismiss(alert.id), hasChain ? 18000 : 10000);
    return () => clearTimeout(timer);
  }, [alert.id, onDismiss, hasChain]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92 }}
      transition={{ type: 'spring', damping: 28, stiffness: 400 }}
    >
      <SpotlightCard
        spotlightColor={sev.glow}
        style={{
          width: hasChain ? 400 : 340,
          background: '#0f172a',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ padding: '14px 16px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
          {/* Thumbnail / accent indicator */}
          <div style={{
            width: 42, height: 42, borderRadius: 10, overflow: 'hidden',
            flexShrink: 0, background: 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {alert.thumbnail ? (
              <img src={alert.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: sev.accent,
                boxShadow: `0 0 10px ${sev.accent}`,
                animation: alert.severity === 'CRITICAL' ? 'pulse 1.2s ease-in-out infinite' : 'none',
              }} />
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Severity + confidence */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                background: `${sev.accent}20`, color: sev.accent,
              }}>
                {sev.label}
              </span>
              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>
                {alert.confidence?.toFixed(1)}%
              </span>
            </div>

            {/* Title */}
            <p style={{
              fontSize: 12, fontWeight: 600, color: '#e2e8f0', margin: '0 0 4px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {alert.title}
            </p>

            {/* Meta line */}
            <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>
              {alert.platform} &middot; {alert.account} &middot; Seg #{alert.segment || 0}
            </p>

            {/* Leak chain graph (delayed appearance) */}
            {alert.forensics_chain && alert.forensics_chain.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 1.5, duration: 0.4 }}
                style={{ marginTop: 8, overflow: 'hidden' }}
              >
                <LeakChainGraph
                  chain={alert.forensics_chain}
                  confidence={alert.confidence ? alert.confidence / 100 : 0}
                  leakRisk={alert.leak_risk || 'low'}
                  firstPlatform={alert.forensics_chain[0] || ''}
                />
              </motion.div>
            )}

            {/* Link */}
            {alert.url && (
              <a href={alert.url} target="_blank" rel="noreferrer"
                style={{
                  display: 'inline-block', marginTop: 5,
                  fontSize: 10, fontWeight: 600, color: sev.accent, textDecoration: 'none',
                  opacity: 0.8,
                }}>
                View source →
              </a>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(alert.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 3,
              borderRadius: 4, display: 'flex', opacity: 0.4,
            }}
          >
            <X size={13} style={{ color: '#94a3b8' }} />
          </button>
        </div>

        {/* Auto-dismiss progress */}
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: hasChain ? 18 : 10, ease: 'linear' }}
          style={{
            height: 2, background: `linear-gradient(to right, ${sev.accent}, transparent)`,
            position: 'absolute', bottom: 0, left: 0,
            borderRadius: '0 0 16px 16px',
          }}
        />
      </SpotlightCard>
    </motion.div>
  );
};

const LiveStreamAlerts = ({ alerts = [], onDismiss }) => {
  return (
    <div style={{
      position: 'fixed', top: 80, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
      pointerEvents: 'none',
    }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)}}`}</style>
      <AnimatePresence mode="popLayout">
        {alerts.slice(0, 5).map(alert => (
          <div key={alert.id} style={{ pointerEvents: 'auto' }}>
            <AlertCard alert={alert} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LiveStreamAlerts;
