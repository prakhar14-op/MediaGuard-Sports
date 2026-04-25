import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { enforcerService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Gavel, CheckCircle, XCircle, FileText, Shield,
  AlertTriangle, ChevronDown, ChevronUp, Copy, ExternalLink,
} from 'lucide-react';

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ icon, title, desc, action }) => {
  const navigate = useNavigate();
  return (
    <div style={{
      textAlign: 'center', padding: '56px 32px',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      borderRadius: 20, border: '2px dashed rgba(148,163,184,0.35)',
    }}>
      <div style={{ marginBottom: 16 }}>{icon}</div>
      <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{title}</p>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', maxWidth: 420, marginInline: 'auto', lineHeight: 1.6 }}>{desc}</p>
      {action && (
        <button
          onClick={() => navigate(action.href)}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
            color: '#fff', fontWeight: 700, fontSize: 13,
            boxShadow: '0 0 20px rgba(13,148,136,0.25)',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// ─── NxtDevs-style dark card + GSSoC teal accents ────────────────────────────
const TIER_CFG = {
  standard:       { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',   border: 'rgba(99,102,241,0.25)',   label: 'Standard'       },
  expedited:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)',   label: 'Expedited'      },
  legal_referral: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',    label: 'Legal Referral' },
};

const STATUS_CFG = {
  drafted:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)'  },
  sent:         { color: '#0d9488', bg: 'rgba(13,148,136,0.1)',  border: 'rgba(13,148,136,0.25)'  },
  rejected:     { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.25)' },
  acknowledged: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)'  },
};

// ─── NxtDevs-style stat badge ─────────────────────────────────────────────────
const StatBadge = ({ label, value, color = '#0d9488' }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '10px 16px', borderRadius: 10, minWidth: 80,
    background: `${color}10`, border: `2px solid ${color}30`,
  }}>
    <span style={{ fontSize: '1.3rem', fontWeight: 800, color, letterSpacing: '0.04em' }}>{value}</span>
    <span style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center' }}>{label}</span>
  </div>
);

// ─── DMCA card ────────────────────────────────────────────────────────────────
const DMCACard = ({ dmca, onApprove, onReject, processing }) => {
  const [expanded, setExpanded] = useState(false);
  const isDrafted = dmca.status === 'drafted';
  const tier = TIER_CFG[dmca.tier] || TIER_CFG.standard;
  const sta  = STATUS_CFG[dmca.status] || STATUS_CFG.drafted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#ffffff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid rgba(148,163,184,0.2)`,
        boxShadow: isDrafted ? '0 4px 20px rgba(245,158,11,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
      }}
    >
      {/* Accent top bar */}
      <div style={{ height: 3, background: isDrafted ? '#f59e0b' : sta.color }} />

      <div style={{ padding: '16px 18px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDrafted ? 'rgba(245,158,11,0.1)' : 'rgba(13,148,136,0.1)',
            border: `1px solid ${isDrafted ? 'rgba(245,158,11,0.25)' : 'rgba(13,148,136,0.25)'}`,
            flexShrink: 0,
          }}>
            <FileText size={18} style={{ color: isDrafted ? '#f59e0b' : '#0d9488' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                DMCA #{dmca._id?.slice(-8) || '—'}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                background: sta.bg, border: `1px solid ${sta.border}`, color: sta.color,
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{dmca.status}</span>
              {dmca.tier && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                  background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>{tier.label}</span>
              )}
              {dmca.offence_number > 1 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444',
                }}>Offence #{dmca.offence_number}</span>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
              {dmca.platform} · @{dmca.target_account || '—'}
              {dmca.legal_contact && (
                <span style={{ marginLeft: 8, color: '#0d9488' }}>→ {dmca.legal_contact}</span>
              )}
            </p>
          </div>

          <button onClick={() => setExpanded(v => !v)}
            style={{ padding: 6, borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'transparent', cursor: 'pointer' }}>
            {expanded ? <ChevronUp size={14} style={{ color: '#64748b' }} /> : <ChevronDown size={14} style={{ color: '#64748b' }} />}
          </button>
        </div>

        {/* Expandable notice */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                marginBottom: 12, background: '#f8fafc', borderRadius: 10,
                border: '1px solid rgba(148,163,184,0.2)', padding: '12px 14px',
                fontFamily: 'monospace', fontSize: 10, color: '#475569',
                maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6,
              }}>
                {dmca.notice_text || dmca.notice_content || 'Notice content not available.'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {isDrafted && (
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onApprove(dmca._id)} disabled={!!processing}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
                color: '#fff', fontWeight: 700, fontSize: 13,
                boxShadow: '0 0 20px rgba(13,148,136,0.25)',
                opacity: processing ? 0.5 : 1,
              }}>
              {processing === dmca._id
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <Shield size={14} />
              }
              Approve &amp; Send
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onReject(dmca._id)} disabled={!!processing}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: 'transparent', border: '1px solid rgba(148,163,184,0.3)', color: '#64748b',
                opacity: processing ? 0.5 : 1,
              }}>
              <XCircle size={14} /> Reject
            </motion.button>
          </div>
        )}

        {dmca.status === 'sent' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 0', borderRadius: 10, background: 'rgba(13,148,136,0.08)',
            border: '1px solid rgba(13,148,136,0.2)', color: '#0d9488', fontWeight: 700, fontSize: 13,
          }}>
            <CheckCircle size={14} /> Dispatched to {dmca.platform} legal
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
    <div style={{ color: '#0f172a' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>DMCA Enforcement</h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
            Review AI-drafted takedown notices. You approve — the Enforcer dispatches.
          </p>
        </div>
        {/* NxtDevs-style stat badges */}
        <div style={{ display: 'flex', gap: 8 }}>
          <StatBadge label="Awaiting"  value={drafted.length} color="#f59e0b" />
          <StatBadge label="Sent"      value={sent.length}    color="#0d9488" />
          <StatBadge label="Total"     value={dmcas.length}   color="#6366f1" />
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 16,
          borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          fontSize: 12, color: '#ef4444',
        }}>
          <AlertTriangle size={14} />{error}
        </div>
      )}

      {/* Awaiting approval */}
      {drafted.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>
            ⏳ Awaiting Your Approval
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {drafted.map(d => <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />)}
          </div>
        </div>
      )}

      {/* Sent */}
      {sent.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>
            ✅ Dispatched
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sent.map(d => <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />)}
          </div>
        </div>
      )}

      {/* Other */}
      {other.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>Other</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {other.map(d => <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />)}
          </div>
        </div>
      )}

      {dmcas.length === 0 && (
        <EmptyState
          icon={<Gavel size={40} style={{ color: '#94a3b8', opacity: 0.5 }} />}
          title="No DMCA notices staged yet"
          desc="DMCA notices are generated automatically when the Adjudicator classifies an incident as SEVERE PIRACY. Run the swarm first, then come back here to approve notices."
          action={{ label: '→ Go to Threat Hunter', href: '/dashboard/hunter' }}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default LegalPanel;
