import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { enforcerService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Gavel, CheckCircle, XCircle, FileText, Shield,
  AlertTriangle, ChevronDown, ChevronUp, Send, Clock,
  TrendingUp, AlertCircle, Zap, Globe, Hash,
} from 'lucide-react';

const G = {
  teal: '#0d9488', tealBg: 'rgba(13,148,136,0.08)', tealBdr: 'rgba(13,148,136,0.2)',
  card: '#ffffff', border: 'rgba(148,163,184,0.15)', text: '#0f172a',
  sub: '#64748b', muted: '#94a3b8', bg: '#f6f7fc',
  red: '#ef4444', redBg: 'rgba(239,68,68,0.08)', redBdr: 'rgba(239,68,68,0.2)',
  amber: '#f59e0b', amberBg: 'rgba(245,158,11,0.08)', amberBdr: 'rgba(245,158,11,0.2)',
  indigo: '#6366f1', indigoBg: 'rgba(99,102,241,0.08)',
};

const TIER_CFG = {
  standard:       { color: G.indigo, bg: G.indigoBg,  label: 'Standard',       icon: '📋', desc: '17 U.S.C. § 512(c)' },
  expedited:      { color: G.amber,  bg: G.amberBg,   label: 'Expedited',      icon: '⚡', desc: 'Repeat infringer'   },
  legal_referral: { color: G.red,    bg: G.redBg,     label: 'Legal Referral', icon: '⚖️', desc: '3+ offences'        },
};

const PLATFORM_COLORS = {
  YouTube: '#ef4444', TikTok: '#000', Twitter: '#1d9bf0',
  Instagram: '#e1306c', Telegram: '#2ca5e0', Reddit: '#ff4500', Other: G.muted,
};

// ─── Summary bar ─────────────────────────────────────────────────────────────
const SummaryBar = ({ dmcas }) => {
  const drafted = dmcas.filter(d => d.status === 'drafted').length;
  const sent    = dmcas.filter(d => d.status === 'sent').length;
  const total   = dmcas.length;
  const rate    = total > 0 ? Math.round((sent / total) * 100) : 0;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28,
    }}>
      {[
        { label: 'Awaiting Approval', value: drafted, color: G.amber,  icon: <Clock size={16} />,      sub: 'Needs your action' },
        { label: 'Dispatched',        value: sent,    color: G.teal,   icon: <Send size={16} />,       sub: 'Sent to platforms' },
        { label: 'Total Notices',     value: total,   color: G.indigo, icon: <FileText size={16} />,   sub: 'All time'          },
        { label: 'Dispatch Rate',     value: `${rate}%`, color: '#a855f7', icon: <TrendingUp size={16} />, sub: 'Success rate'   },
      ].map((s, i) => (
        <motion.div key={s.label}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          style={{
            background: G.card, borderRadius: 16, padding: '18px 20px',
            border: `1px solid ${G.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            position: 'relative', overflow: 'hidden',
          }}>
          {/* Accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: '16px 16px 0 0' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${s.color}12`, color: s.color,
            }}>{s.icon}</div>
          </div>
          <p style={{ fontSize: 28, fontWeight: 900, color: s.color, margin: '0 0 2px', lineHeight: 1 }}>{s.value}</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>{s.label}</p>
          <p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{s.sub}</p>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = () => {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{
        textAlign: 'center', padding: '80px 32px',
        background: `linear-gradient(135deg, ${G.redBg} 0%, rgba(99,102,241,0.04) 100%)`,
        borderRadius: 24, border: `2px dashed ${G.redBdr}`,
      }}>
      <div style={{
        width: 80, height: 80, borderRadius: 24, background: G.redBg,
        border: `2px solid ${G.redBdr}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 24px', fontSize: 36,
      }}>⚖️</div>
      <p style={{ fontSize: 20, fontWeight: 900, color: G.text, margin: '0 0 12px' }}>
        No DMCA Notices Staged
      </p>
      <p style={{ fontSize: 14, color: G.sub, margin: '0 0 32px', maxWidth: 400, marginInline: 'auto', lineHeight: 1.7 }}>
        DMCA notices are auto-drafted when the Adjudicator classifies content as <strong style={{ color: G.red }}>SEVERE PIRACY</strong>. Run the swarm to start detecting violations.
      </p>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/dashboard/hunter')}
        style={{
          padding: '13px 32px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${G.red}, #f87171)`,
          color: '#fff', fontWeight: 700, fontSize: 14,
          boxShadow: '0 0 28px rgba(239,68,68,0.3)',
        }}>
        🚀 Launch Swarm
      </motion.button>
    </motion.div>
  );
};

// ─── DMCA Card ────────────────────────────────────────────────────────────────
const DMCACard = ({ dmca, onApprove, onReject, processing }) => {
  const [expanded, setExpanded] = useState(false);
  const isDrafted = dmca.status === 'drafted';
  const isSent    = dmca.status === 'sent';
  const tier      = TIER_CFG[dmca.tier] || TIER_CFG.standard;
  const platColor = PLATFORM_COLORS[dmca.platform] || G.muted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      layout
      style={{
        background: G.card, borderRadius: 20, overflow: 'hidden',
        border: `1px solid ${isDrafted ? G.amberBdr : isSent ? G.tealBdr : G.border}`,
        boxShadow: isDrafted
          ? '0 4px 24px rgba(245,158,11,0.12), 0 1px 3px rgba(0,0,0,0.04)'
          : isSent
          ? '0 4px 24px rgba(13,148,136,0.10), 0 1px 3px rgba(0,0,0,0.04)'
          : '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Top gradient bar */}
      <div style={{
        height: 5,
        background: isDrafted
          ? 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)'
          : isSent
          ? `linear-gradient(90deg, ${G.teal}, #2dd4bf, ${G.teal})`
          : `linear-gradient(90deg, ${tier.color}, ${tier.color}80)`,
        backgroundSize: isDrafted || isSent ? '200% 100%' : '100%',
        animation: isDrafted ? 'shimmer 2s linear infinite' : 'none',
      }} />

      <div style={{ padding: '20px 22px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          {/* Platform badge */}
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${platColor}12`, border: `1.5px solid ${platColor}25`,
            fontSize: 22,
          }}>
            {dmca.platform === 'YouTube' ? '▶️' :
             dmca.platform === 'TikTok' ? '🎵' :
             dmca.platform === 'Twitter' ? '🐦' :
             dmca.platform === 'Instagram' ? '📸' : '🌐'}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: G.text }}>
                DMCA #{dmca._id?.slice(-8) || '—'}
              </span>
              {/* Status */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
                background: isDrafted ? G.amberBg : isSent ? G.tealBg : 'rgba(148,163,184,0.1)',
                color: isDrafted ? G.amber : isSent ? G.teal : G.muted,
                border: `1px solid ${isDrafted ? G.amberBdr : isSent ? G.tealBdr : 'rgba(148,163,184,0.2)'}`,
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: isDrafted ? G.amber : isSent ? G.teal : G.muted,
                  animation: isDrafted ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }} />
                {isDrafted ? 'Awaiting Approval' : isSent ? 'Dispatched' : dmca.status}
              </span>
              {/* Tier */}
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                background: tier.bg, color: tier.color,
                border: `1px solid ${tier.color}25`,
              }}>
                {tier.icon} {tier.label}
              </span>
              {dmca.offence_number > 1 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
                  background: G.redBg, color: G.red, border: `1px solid ${G.redBdr}`,
                }}>
                  🔁 Offence #{dmca.offence_number}
                </span>
              )}
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 12, fontWeight: 600, color: platColor,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Globe size={11} /> {dmca.platform}
              </span>
              <span style={{ fontSize: 12, color: G.sub }}>@{dmca.target_account || '—'}</span>
              {dmca.legal_contact && (
                <span style={{
                  fontSize: 11, color: G.teal, display: 'flex', alignItems: 'center', gap: 4,
                  background: G.tealBg, padding: '2px 8px', borderRadius: 6, border: `1px solid ${G.tealBdr}`,
                }}>
                  <Send size={9} /> {dmca.legal_contact}
                </span>
              )}
            </div>
          </div>

          {/* Expand */}
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setExpanded(v => !v)}
            style={{
              width: 32, height: 32, borderRadius: 9, border: `1px solid ${G.border}`,
              background: expanded ? G.tealBg : 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
            {expanded
              ? <ChevronUp size={14} style={{ color: G.teal }} />
              : <ChevronDown size={14} style={{ color: G.sub }} />
            }
          </motion.button>
        </div>

        {/* Legal basis strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          background: `${tier.color}08`, borderRadius: 10, marginBottom: 14,
          border: `1px solid ${tier.color}15`,
        }}>
          <span style={{ fontSize: 10, color: tier.color, fontWeight: 700 }}>{tier.icon}</span>
          <span style={{ fontSize: 10, color: tier.color, fontWeight: 600 }}>{tier.desc}</span>
          {dmca.offence_number >= 2 && (
            <span style={{ fontSize: 10, color: G.red, marginLeft: 'auto', fontWeight: 700 }}>
              17 U.S.C. § 512(i) applies
            </span>
          )}
        </div>

        {/* Expandable notice */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                  fontSize: 10, fontWeight: 700, color: G.sub, textTransform: 'uppercase', letterSpacing: '0.12em',
                }}>
                  <FileText size={11} /> Notice Content
                </div>
                <div style={{
                  background: '#0d1117', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.06)', padding: '16px',
                  fontFamily: 'monospace', fontSize: 11, color: '#94a3b8',
                  maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.7,
                }}>
                  {dmca.notice_text || 'Notice content not available.'}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {isDrafted && (
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => onApprove(dmca._id)} disabled={!!processing}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 0', borderRadius: 12, border: 'none',
                cursor: processing ? 'not-allowed' : 'pointer',
                background: processing === dmca._id
                  ? G.border
                  : `linear-gradient(135deg, ${G.teal}, #2dd4bf)`,
                color: processing === dmca._id ? G.muted : '#fff',
                fontWeight: 700, fontSize: 13,
                boxShadow: processing ? 'none' : '0 0 24px rgba(13,148,136,0.35)',
                opacity: processing && processing !== dmca._id ? 0.5 : 1,
              }}>
              {processing === dmca._id
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <Shield size={15} />
              }
              Approve &amp; Dispatch
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => onReject(dmca._id)} disabled={!!processing}
              style={{
                padding: '12px 18px', borderRadius: 12, cursor: processing ? 'not-allowed' : 'pointer',
                background: 'transparent', border: `1px solid ${G.redBdr}`,
                opacity: processing ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6,
                color: G.red, fontWeight: 600, fontSize: 13,
              }}>
              <XCircle size={14} /> Reject
            </motion.button>
          </div>
        )}

        {isSent && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 0', borderRadius: 12, background: G.tealBg,
            border: `1px solid ${G.tealBdr}`, color: G.teal, fontWeight: 700, fontSize: 13,
          }}>
            <CheckCircle size={15} /> Dispatched to {dmca.platform} legal team
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const LegalPanel = () => {
  const { dmcas, refresh, addNotification } = useDashboard();
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const drafted = dmcas.filter(d => d.status === 'drafted');
  const sent    = dmcas.filter(d => d.status === 'sent');
  const other   = dmcas.filter(d => d.status !== 'drafted' && d.status !== 'sent');

  const filtered = useMemo(() => {
    if (filter === 'drafted') return drafted;
    if (filter === 'sent')    return sent;
    return dmcas;
  }, [filter, dmcas, drafted, sent]);

  const handleApprove = async (id) => {
    setProcessing(id); setError('');
    try {
      await enforcerService.approve(id);
      addNotification({ type: 'success', title: 'DMCA Sent', message: 'Takedown notice dispatched to platform legal team.' });
      refresh();
    } catch (err) { setError(err?.response?.data?.message || 'Failed to approve DMCA.'); }
    finally { setProcessing(null); }
  };

  const handleReject = async (id) => {
    setProcessing(id); setError('');
    try {
      await enforcerService.reject(id);
      addNotification({ type: 'agent', title: 'DMCA Rejected', message: 'Incident cleared as false positive.' });
      refresh();
    } catch (err) { setError(err?.response?.data?.message || 'Failed to reject DMCA.'); }
    finally { setProcessing(null); }
  };

  return (
    <div style={{ color: G.text }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: G.redBg,
              border: `1.5px solid ${G.redBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Gavel size={22} style={{ color: G.red }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: G.text, margin: 0, letterSpacing: '-0.02em' }}>
                DMCA Enforcement
              </h2>
              <p style={{ fontSize: 12, color: G.sub, margin: '3px 0 0' }}>
                AI-drafted takedown notices · Human-in-the-loop approval
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          {dmcas.length > 0 && (
            <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
              {[
                { key: 'all',     label: `All (${dmcas.length})` },
                { key: 'drafted', label: `Pending (${drafted.length})` },
                { key: 'sent',    label: `Sent (${sent.length})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)}
                  style={{
                    padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                    background: filter === tab.key ? '#fff' : 'transparent',
                    color: filter === tab.key ? G.text : G.sub,
                    boxShadow: filter === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {dmcas.length > 0 && <SummaryBar dmcas={dmcas} />}

      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', marginBottom: 20,
            borderRadius: 12, background: G.redBg, border: `1px solid ${G.redBdr}`,
            fontSize: 12, color: G.red,
          }}>
          <AlertTriangle size={14} />{error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: G.red }}>
            <XCircle size={14} />
          </button>
        </motion.div>
      )}

      {dmcas.length === 0 ? <EmptyState /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Section headers */}
          {filter === 'all' && drafted.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: G.amber, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: G.amber, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                Awaiting Approval — {drafted.length} notice{drafted.length !== 1 ? 's' : ''}
              </span>
              <div style={{ flex: 1, height: 1, background: `${G.amber}20` }} />
            </div>
          )}

          {filtered.filter(d => d.status === 'drafted').map(d => (
            <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />
          ))}

          {filter === 'all' && sent.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: G.teal }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: G.teal, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                Dispatched — {sent.length} notice{sent.length !== 1 ? 's' : ''}
              </span>
              <div style={{ flex: 1, height: 1, background: `${G.teal}20` }} />
            </div>
          )}

          {filtered.filter(d => d.status === 'sent').map(d => (
            <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />
          ))}

          {filter === 'all' && other.length > 0 && other.map(d => (
            <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin    { from { transform: rotate(0deg)   } to { transform: rotate(360deg) } }
        @keyframes pulse   { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
      `}</style>
    </div>
  );
};

export default LegalPanel;
