import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { adjudicatorService, enforcerService, brokerService } from '../../services/api';
import {
  ExternalLink, ShieldAlert, Search, CheckCircle, Clock,
  AlertTriangle, Gavel, Coins, Brain, RefreshCw, ChevronDown,
  ChevronLeft, ChevronRight, Filter, MapPin,
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

const SEV_CFG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   dot: '#ef4444' },
  WARNING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  dot: '#f59e0b' },
  INFO:     { color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)',  dot: '#6366f1' },
};

const STATUS_CFG = {
  detected:         { color: '#6366f1', label: 'Detected',        bg: 'rgba(99,102,241,0.08)'  },
  reviewing:        { color: '#f59e0b', label: 'Reviewing',       bg: 'rgba(245,158,11,0.08)'  },
  takedown_pending: { color: '#ef4444', label: 'Takedown Pending', bg: 'rgba(239,68,68,0.08)'  },
  takedown_sent:    { color: '#ef4444', label: 'Takedown Sent',    bg: 'rgba(239,68,68,0.08)'  },
  monetized:        { color: G.teal,    label: 'Monetized',       bg: G.tealBg                 },
  cleared:          { color: G.muted,   label: 'Cleared',         bg: 'rgba(148,163,184,0.08)' },
};

const VALID_PLATFORMS = ['YouTube', 'TikTok', 'Twitter', 'Instagram', 'Telegram', 'Reddit', 'Other'];
const safePlatform = (p) => VALID_PLATFORMS.includes(p) ? p : 'Other';

// ─── Action dropdown ──────────────────────────────────────────────────────────
const ActionMenu = ({ incident, onDone }) => {
  const [open,       setOpen]       = useState(false);
  const [processing, setProcessing] = useState('');
  const [error,      setError]      = useState('');
  const { addNotification } = useDashboard();

  const run = async (label, fn) => {
    setProcessing(label);
    setError('');
    try {
      await fn();
      addNotification({ type: 'agent', title: label, message: `Action completed for: ${incident.title}` });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed');
    } finally {
      setProcessing('');
      setOpen(false);
    }
  };

  const adjudicate = () => run('Adjudicate', () => adjudicatorService.adjudicate({
    incident_id: incident._id, sentinel_report: `[SCAN] Confidence: ${incident.confidence_score}% | Severity: ${incident.severity}`,
    platform: safePlatform(incident.platform), account_handle: incident.account_handle || 'unknown',
    video_title: incident.title || 'Unknown', description: '',
    country: (incident.country || '').toUpperCase().slice(0, 2) || undefined,
    confidence_score: incident.confidence_score || 50,
  }));

  const enforce = () => run('Draft DMCA', () => enforcerService.enforce({
    incident_id: incident._id, target_account: incident.account_handle || 'unknown',
    platform: safePlatform(incident.platform), video_title: incident.title || 'Unknown',
    video_url: incident.url || '', confidence_score: incident.confidence_score || 50,
    classification: (incident.classification === 'SEVERE PIRACY' || incident.classification === 'FAIR USE / FAN CONTENT')
      ? incident.classification : 'SEVERE PIRACY',
    justification: incident.adjudicator_justification || 'High confidence match detected by Sentinel.',
    integrity_hash: '',
  }));

  const broker = () => run('Mint Contract', () => brokerService.broker({
    incident_id: incident._id, target_account: incident.account_handle || 'unknown',
    platform: safePlatform(incident.platform), video_title: incident.title || 'Unknown',
    video_url: incident.url || '', justification: incident.adjudicator_justification || 'Fair use content identified.',
    view_count: 0, risk_score: 30,
  }));

  const canAdjudicate = ['detected', 'reviewing'].includes(incident.status) && !incident.classification?.includes('PIRACY') && incident.classification !== 'FAIR USE / FAN CONTENT';
  const canEnforce    = ['detected', 'reviewing', 'takedown_pending'].includes(incident.status);
  const canBroker     = ['detected', 'reviewing'].includes(incident.status);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
          borderRadius: 8, border: `1px solid ${G.border}`, background: 'transparent',
          fontSize: 11, fontWeight: 700, color: G.sub, cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = G.text; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = G.sub; }}
      >
        Actions
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 50,
              background: G.card, border: `1px solid ${G.border}`, borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden', width: 160,
            }}
          >
            {error && <p style={{ padding: '6px 12px', fontSize: 10, color: '#ef4444', borderBottom: `1px solid ${G.border}`, margin: 0 }}>{error}</p>}
            {[
              { label: 'Adjudicate', fn: adjudicate, can: canAdjudicate, icon: Brain,  color: '#a855f7' },
              { label: 'Draft DMCA', fn: enforce,    can: canEnforce,    icon: Gavel,  color: '#ef4444' },
              { label: 'Mint Contract', fn: broker,  can: canBroker,     icon: Coins,  color: G.teal    },
            ].map(({ label, fn, can, icon: Icon, color }, i) => (
              <button key={label} onClick={fn} disabled={!can || !!processing}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', border: 'none', background: 'transparent',
                  fontSize: 11, fontWeight: 600, color: can ? G.text : G.muted,
                  cursor: can ? 'pointer' : 'not-allowed', textAlign: 'left',
                  borderTop: i > 0 ? `1px solid ${G.border}` : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (can) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={13} style={{ color: can ? color : G.muted, flexShrink: 0 }} />
                {processing === label ? 'Running…' : label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Incident card (Vihaan StationsSlider style) ──────────────────────────────
const IncidentCard = ({ incident, onDone, isSelected, onSelect }) => {
  const sev = SEV_CFG[incident.severity] || SEV_CFG.INFO;
  const sta = STATUS_CFG[incident.status] || STATUS_CFG.detected;
  const conf = incident.confidence_score || 0;
  const confColor = conf > 90 ? G.teal : conf > 70 ? '#6366f1' : '#f59e0b';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
      onClick={() => onSelect(incident._id)}
      style={{
        background: G.card, borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        border: isSelected ? `2px solid ${G.teal}` : `1px solid ${G.border}`,
        boxShadow: isSelected ? `0 0 0 3px ${G.tealBg}` : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', aspectRatio: '16/7', background: '#e2e8f0', overflow: 'hidden' }}>
        {incident.thumbnail_url ? (
          <img src={incident.thumbnail_url} alt={incident.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={24} style={{ color: G.muted }} />
          </div>
        )}
        {/* Severity badge */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
          borderRadius: 999, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          border: `1px solid ${sev.border}`, fontSize: 9, fontWeight: 800,
          color: sev.color, textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sev.dot, display: 'inline-block' }} />
          {incident.severity || '—'}
        </div>
        {/* Platform badge */}
        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          padding: '3px 8px', borderRadius: 999,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          fontSize: 9, fontWeight: 700, color: G.text,
        }}>
          {incident.platform || '—'}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: G.text, margin: '0 0 2px', lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {incident.title || 'Unknown'}
        </p>
        <p style={{ fontSize: 11, color: G.sub, margin: '0 0 10px' }}>
          @{incident.account_handle || 'anonymous'}
          {incident.country && <span style={{ marginLeft: 6, color: G.muted }}>· {incident.country}</span>}
        </p>

        {/* Confidence bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: G.sub, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Confidence</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: confColor }}>{conf}%</span>
          </div>
          <div style={{ height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${conf}%`, background: confColor, borderRadius: 99, transition: 'width 0.8s ease' }} />
          </div>
        </div>

        {/* Status + classification row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
            borderRadius: 999, background: sta.bg, fontSize: 9, fontWeight: 700,
            color: sta.color, textTransform: 'capitalize',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sta.color, display: 'inline-block' }} />
            {sta.label}
          </div>
          {incident.classification && incident.classification !== 'UNREVIEWED' && incident.classification !== 'PENDING' && (
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
              background: incident.classification === 'SEVERE PIRACY' ? 'rgba(239,68,68,0.08)' : G.tealBg,
              color: incident.classification === 'SEVERE PIRACY' ? '#ef4444' : G.teal,
              border: `1px solid ${incident.classification === 'SEVERE PIRACY' ? 'rgba(239,68,68,0.2)' : G.tealBdr}`,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {incident.classification === 'SEVERE PIRACY' ? 'Piracy' : 'Fair Use'}
            </span>
          )}
        </div>

        {/* Actions row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${G.border}`, paddingTop: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {incident.url && (
              <a href={incident.url} target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
                  borderRadius: 7, border: `1px solid ${G.border}`, background: 'transparent',
                  fontSize: 10, fontWeight: 600, color: G.sub, textDecoration: 'none',
                  transition: 'all 0.15s',
                }}>
                <ExternalLink size={11} /> View
              </a>
            )}
          </div>
          <div onClick={e => e.stopPropagation()}>
            <ActionMenu incident={incident} onDone={onDone} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const IncidentTable = () => {
  const { incidents, loading, refresh } = useDashboard();
  const [platform,   setPlatform]   = useState('');
  const [severity,   setSeverity]   = useState('');
  const [status,     setStatus]     = useState('');
  const [selected,   setSelected]   = useState(null);
  const [page,       setPage]       = useState(0);
  const PER_PAGE = 6;

  const filtered = incidents.filter(inc => {
    if (platform && inc.platform !== platform) return false;
    if (severity && inc.severity !== severity) return false;
    if (status   && inc.status   !== status)   return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const visible    = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const handleRefresh = () => { refresh(); setPage(0); };

  return (
    <div style={{ color: G.text }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: G.text, margin: 0 }}>Detection Intelligence</h2>
          <p style={{ fontSize: 12, color: G.sub, margin: '3px 0 0' }}>
            {filtered.length} incidents{incidents.length !== filtered.length ? ` of ${incidents.length} total` : ''}
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: G.sub, fontSize: 11 }}>
            <Filter size={13} /> Filters:
          </div>
          {[
            { value: platform, set: setPlatform, options: ['', 'YouTube', 'TikTok', 'Twitter', 'Instagram', 'Telegram', 'Reddit'], placeholder: 'Platform' },
            { value: severity, set: setSeverity, options: ['', 'CRITICAL', 'WARNING', 'INFO'], placeholder: 'Severity' },
            { value: status,   set: setStatus,   options: ['', 'detected', 'reviewing', 'takedown_pending', 'takedown_sent', 'monetized', 'cleared'], placeholder: 'Status' },
          ].map(({ value, set, options, placeholder }) => (
            <select key={placeholder} value={value} onChange={e => { set(e.target.value); setPage(0); }}
              style={{
                padding: '5px 10px', borderRadius: 8, border: `1px solid ${G.border}`,
                background: G.card, fontSize: 11, color: G.text, outline: 'none', cursor: 'pointer',
              }}>
              {options.map(o => <option key={o} value={o}>{o || placeholder}</option>)}
            </select>
          ))}
          <button onClick={handleRefresh} style={{
            padding: '5px 10px', borderRadius: 8, border: `1px solid ${G.border}`,
            background: G.card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: G.sub, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = G.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = G.card; e.currentTarget.style.color = G.sub; }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{ width: 24, height: 24, border: `3px solid ${G.tealBdr}`, borderTopColor: G.teal, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 0', background: G.card,
          borderRadius: 20, border: `1px dashed ${G.border}`,
        }}>
          <ShieldAlert size={40} style={{ color: G.muted, margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: G.sub, margin: 0 }}>
            {incidents.length === 0 ? 'No incidents detected.' : 'No incidents match the filters.'}
          </p>
          <p style={{ fontSize: 12, color: G.muted, margin: '4px 0 0' }}>
            {incidents.length === 0 ? 'Run the swarm to start scanning.' : 'Try adjusting your filter settings.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {visible.map(inc => (
              <IncidentCard
                key={inc._id} incident={inc} onDone={handleRefresh}
                isSelected={selected === inc._id}
                onSelect={setSelected}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <span style={{ fontSize: 12, color: G.sub }}>
                Showing {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  style={{
                    padding: '6px 10px', borderRadius: 8, border: `1px solid ${G.border}`,
                    background: G.card, cursor: page === 0 ? 'not-allowed' : 'pointer',
                    opacity: page === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center',
                  }}>
                  <ChevronLeft size={14} style={{ color: G.sub }} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: `1px solid ${i === page ? G.teal : G.border}`,
                      background: i === page ? G.tealBg : G.card, cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, color: i === page ? G.teal : G.sub,
                    }}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  style={{
                    padding: '6px 10px', borderRadius: 8, border: `1px solid ${G.border}`,
                    background: G.card, cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
                    opacity: page === totalPages - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center',
                  }}>
                  <ChevronRight size={14} style={{ color: G.sub }} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default IncidentTable;
