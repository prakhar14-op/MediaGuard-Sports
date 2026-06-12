import React from 'react';
import { motion } from 'framer-motion';

/**
 * LeakChainGraph — visual node graph showing platform sharing chain.
 * Shows: Origin → Platform A → Platform B → ... → Detected Upload
 * Animated nodes with connecting lines and platform labels.
 */

const PLATFORM_COLORS = {
  Facebook:  '#1877f2',
  Instagram: '#e1306c',
  Twitter:   '#1da1f2',
  WhatsApp:  '#25d366',
  Telegram:  '#2ca5e0',
  Flickr:    '#0063dc',
  YouTube:   '#ff0000',
  TikTok:    '#000000',
  Reddit:    '#ff4500',
  Unknown:   '#6366f1',
};

const LeakChainGraph = ({ chain = [], confidence = 0, leakRisk = 'low', firstPlatform = '' }) => {
  if (!chain || chain.length === 0) return null;

  // Build full chain: "Official" → chain platforms → "Detected"
  const fullChain = ['Official', ...chain, 'Detected'];
  const riskColor = leakRisk === 'critical' ? '#ef4444' : leakRisk === 'high' ? '#f59e0b' : '#0d9488';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      style={{
        background: 'rgba(15,23,42,0.95)',
        borderRadius: 14,
        padding: '16px 20px',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Leak Chain Reconstruction
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: riskColor, fontWeight: 700, textTransform: 'uppercase' }}>
            {leakRisk} risk
          </span>
          <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Chain visualization */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
        {fullChain.map((platform, i) => {
          const isFirst = i === 0;
          const isLast = i === fullChain.length - 1;
          const color = isFirst ? '#0d9488' : isLast ? '#ef4444' : (PLATFORM_COLORS[platform] || '#6366f1');

          return (
            <React.Fragment key={`${platform}-${i}`}>
              {/* Node */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + i * 0.15, type: 'spring', damping: 15 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}
              >
                {/* Circle node */}
                <div style={{
                  width: isFirst || isLast ? 32 : 26,
                  height: isFirst || isLast ? 32 : 26,
                  borderRadius: '50%',
                  background: `${color}20`,
                  border: `2px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 12px ${color}40`,
                  position: 'relative',
                }}>
                  {/* Inner dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                  }} />
                  {/* Pulse ring for first leak */}
                  {i === 1 && (
                    <div style={{
                      position: 'absolute', inset: -4, borderRadius: '50%',
                      border: `1px solid ${color}`,
                      animation: 'leakPulse 2s ease-in-out infinite',
                      opacity: 0.5,
                    }} />
                  )}
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 8, fontWeight: 700, color: isFirst ? '#0d9488' : isLast ? '#ef4444' : '#e2e8f0',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  maxWidth: 60, textAlign: 'center', lineHeight: 1.2,
                }}>
                  {isFirst ? 'Source' : isLast ? 'Detected' : platform}
                </span>

                {/* First leak indicator */}
                {platform === firstPlatform && !isFirst && !isLast && (
                  <span style={{
                    fontSize: 7, color: '#f59e0b', fontWeight: 800, marginTop: -2,
                    textTransform: 'uppercase',
                  }}>
                    1st leak
                  </span>
                )}
              </motion.div>

              {/* Connecting line */}
              {i < fullChain.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.3 }}
                  style={{
                    width: 32, height: 2, flexShrink: 0,
                    background: `linear-gradient(to right, ${color}, ${
                      i + 1 < fullChain.length - 1
                        ? (PLATFORM_COLORS[fullChain[i + 1]] || '#6366f1')
                        : '#ef4444'
                    })`,
                    borderRadius: 2,
                    transformOrigin: 'left',
                    marginBottom: 16,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <style>{`@keyframes leakPulse { 0%,100% { transform:scale(1); opacity:0.5; } 50% { transform:scale(1.4); opacity:0; } }`}</style>
    </motion.div>
  );
};

export default LeakChainGraph;
