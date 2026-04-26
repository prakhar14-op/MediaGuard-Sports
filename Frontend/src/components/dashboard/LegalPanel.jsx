import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { enforcerService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Gavel, CheckCircle, XCircle, FileText, Shield,
  AlertTriangle, ChevronDown, ChevronUp, Send, Clock,
  AlertCircle, RefreshCw,
} from 'lucide-react';

const G = {
  teal: '#0d9488', tealBg: 'rgba(13,148,136,0.08)', tealBdr: 'rgba(13,148,136,0.2)',
  card: '#ffffff', border: 'rgba(148,163,184,0.18)', text: '#0f172a',
  sub: '#64748b', muted: '#94a3b8', bg: '#f6f7fc',
};

const TIER_CFG = {
  standard:       { color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  label: 'Standard',       icon: '📋' },
  expedited:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  label: 'Expedited',      icon: '⚡' },
  legal_referral: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'Legal Referral', icon: '⚖️' },
};

const STATUS_CFG = {
  drafted:      { color: '#f59e0b', label: 'Awaiting Approval', dot: '#f59e0b' },
  sent:         { color: '#0d9488', label: 'Dispatched',        dot: '#0d9488' },
  rejected:     { color: '#94a3b8', label: 'Rejected',          dot: '#94a3b8' },
  acknowledged: { color: '#6366f1', label: 'Acknowledged',      dot: '#6366f1' },
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = () => {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{
        textAlign: 'center', padding: '72px 32px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: 24, border: '2px dashed rgba(148,163,184,0.3)',
      }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, background: 'rgba(13,148,136,0.08)',
        border: '2px solid rgba(13,148,136,0.15)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 20px',
      }}>
        <Gavel size={32} style={{ color: G.teal }} />
      </div>
      <p style={{ fontSize: 18, fontWeight: 800, color: G.text, margin: '0 0 10px' }}>
        No DMCA Notices Yet
      </p>
      <p style={{ fontSize: 13, color: G.sub, margin: '0 0 28px', maxWidth: 380, marginInline: 'auto', lineHeight: 1.7 }}>
        DMCA notices are auto-drafted when the Adjudicator classifies content as <strong>SEVERE PIRACY</strong>. Run the swarm to start detecting violations.
      </p>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/dashboard/hunter')}
        style={{
          padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${G.teal}, #2dd4bf)`,
          color: '#fff', fontWeight: 700, fontSize: 14,
          boxShadow: '0 0 24px rgba(13,148,136,0.3)',
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
  const tier   = TIER_CFG[dmca.tier]   || TIER_CFG.standard;
  const status = STATUS_CFG[dmca.status] || STATUS_CFG.drafted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
      style={{
        background: G.card, borderRadius: 18, overflow: 'hidden',
        border: `1px solid ${G.border}`,
        boxShadow: isDrafted ? '0 4px 24px rgba(245,158,11,0.10)' : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
      }}
    >
      {/* Accent bar */}
      <div style={{
        height: 4,
        background: isDrafted
          ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
          : isSent
          ? `linear-gradient(90deg, ${G.teal}, #2dd4bf)`
          : status.color,
      }} />

      <div style={{ padding: '18px 20px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          {/* Icon */}
          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDrafted ? 'rgba(245,158,11,0.1)' : isSent ? G.tealBg : 'rgba(148,163,184,0.1)',
            border: `1.5px solid ${isDrafted ? 'rgba(245,158,11,0.3)' : isSent ? G.tealBdr : 'rgba(148,163,184,0.2)'}`,
            fontSize: 20,
          }}>
            {tier.icon}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: G.text }}>
                DMCA #{dmca._id?.slice(-8) || '—'}
              </span>
              {/* Status pill */}
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
                background: `${status.color}15`, color: status.color,
                border: `1px solid ${status.color}30`,
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: status.dot,
                  animation: isDrafted ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
                {status.label}
              </span>
              {/* Tier pill */}
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                background: tier.bg, color: tier.color,
                border: `1px solid ${tier.color}25`,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{tier.label}</span>
              {dmca.offence_number > 1 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
                  background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>🔁 Offence #{dmca.offence_number}</span>
              )}
            </div>

            {/* Platform + account */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, color: G.sub, background: '#f8fafc',
                padding: '2px 8px', borderRadius: 6, border: `1px solid ${G.border}`,
              }}>
                {dmca.platform || '—'}
              </span>
              <span style={{ fontSize: 11, color: G.sub }}>
                @{dmca.target_account || '—'}
              </span>
              {dmca.legal_contact && (
                <span style={{ fontSize: 11, color: G.teal, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Send size={9} /> {dmca.legal_contact}
                </span>
              )}
            </div>
          </div>

          {/* Expand toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setExpanded(v => !v)}
            style={{
              width: 30, height: 30, borderRadius: 8, border: `1px solid ${G.border}`,
              background: expanded ? G.tealBg : 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
            {expanded
              ? <ChevronUp size={14} style={{ color: G.teal }} />
              : <ChevronDown size={14} style={{ color: G.sub }} />
            }
          </motion.button>
        </div>

        {/* Expandable notice text */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                marginBottom: 14, background: '#0d1117', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px',
                fontFamily: 'monospace', fontSize: 10.5, color: '#94a3b8',
                maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.7,
              }}>
                <div style={{ color: G.teal, fontWeight: 700, marginBottom: 8, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  📄 Notice Preview
                </div>
                {dmca.notice_text || dmca.notice_content || 'Notice content not available.'}
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
                padding: '11px 0', borderRadius: 11, border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
                background: processing === dmca._id ? G.border : `linear-gradient(135deg, ${G.teal}, #2dd4bf)`,
                color: processing === dmca._id ? G.muted : '#fff', fontWeight: 700, fontSize: 13,
                boxShadow: processing ? 'none' : '0 0 20px rgba(13,148,136,0.3)',
                opacity: processing && processing !== dmca._id ? 0.5 : 1,
              }}>
              {processing === dmca._id
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <Shield size={14} />
              }
              Approve &amp; Send
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => onReject(dmca._id)} disabled={!!processing}
              style={{
                padding: '11px 16px', borderRadius: 11, cursor: processing ? 'not-allowed' : 'pointer',
                background: 'transparent', border: '1px solid rgba(239,68,68,0.25)',
                opacity: processing ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6,
                color: '#ef4444', fontWeight: 600, fontSize: 13,
              }}>
              <XCircle size={14} /> Reject
            </motion.button>
          </div>
        )}

        {isSent && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 0', borderRadius: 11, background: G.tealBg,
            border: `1px solid ${G.tealBdr}`, color: G.teal, fontWeight: 700, fontSize: 13,
          }}>
            <CheckCircle size={14} /> Dispatched to {dmca.platform} legal team
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

  const drafted = dmcas.filter(d => d.status === 'drafted');
  const sent    = dmcas.filter(d => d.status === 'sent');
  const other   = dmcas.filter(d => d.status !== 'drafted' && d.status !== 'sent');

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

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Gavel size={18} style={{ color: '#ef4444' }} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: G.text, margin: 0 }}>DMCA Enforcement</h2>
          </div>
          <p style={{ fontSize: 12, color: G.sub, margin: 0, paddingLeft: 46 }}>
            Review AI-drafted takedown notices. You approve — the Enforcer dispatches.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Awaiting', value: drafted.length, color: '#f59e0b', icon: <Clock size={14} /> },
            { label: 'Sent',     value: sent.length,    color: G.teal,    icon: <Send size={14} /> },
            { label: 'Total',    value: dmcas.length,   color: '#6366f1', icon: <FileText size={14} /> },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '12px 18px', borderRadius: 14, minWidth: 72,
              background: `${s.color}08`, border: `1.5px solid ${s.color}25`,
            }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontSize: '0.6rem', color: G.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', marginBottom: 16,
            borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: 12, color: '#ef4444',
          }}>
          <AlertTriangle size={14} />{error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
            <XCircle size={14} />
          </button>
        </motion.div>
      )}

      {dmcas.length === 0 ? <EmptyState /> : (
        <>
          {drafted.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                  Awaiting Your Approval ({drafted.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {drafted.map(d => <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />)}
              </div>
            </div>
          )}

          {sent.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: G.teal }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: G.teal, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                  Dispatched ({sent.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sent.map(d => <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />)}
              </div>
            </div>
          )}

          {other.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: G.muted }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: G.muted, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                  Other ({other.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {other.map(d => <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />)}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg)   } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>
    </div>
  );
};

export default LegalPanel;
