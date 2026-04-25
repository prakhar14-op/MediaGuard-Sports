import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { brokerService } from '../../services/api';
import {
  Coins, CheckCircle, TrendingUp, Wallet, Activity,
  AlertTriangle, XCircle, Hash, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── NxtDevs-style dark card + GSSoC teal ────────────────────────────────────
const TIER_CFG = {
  Platinum: { color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.25)', emoji: '💎' },
  Gold:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  emoji: '🥇' },
  Silver:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', emoji: '🥈' },
  Bronze:   { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  emoji: '🥉' },
};

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

// ─── Contract card ────────────────────────────────────────────────────────────
const ContractCard = ({ contract, onActivate, onDispute, processing }) => {
  const [expanded, setExpanded] = useState(false);
  const tier     = TIER_CFG[contract.tier] || TIER_CFG.Bronze;
  const isMinted = contract.status === 'minted';
  const isActive = contract.status === 'active';
  const holderPct = contract.copyright_holder_share ?? 0;
  const creatorPct = contract.creator_share ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#ffffff', borderRadius: 16, overflow: 'hidden',
        border: `1px solid rgba(148,163,184,0.2)`,
        boxShadow: isMinted ? '0 4px 20px rgba(245,158,11,0.08)' : isActive ? '0 4px 20px rgba(13,148,136,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
      }}
    >
      {/* Accent bar */}
      <div style={{ height: 3, background: isActive ? '#0d9488' : isMinted ? '#f59e0b' : tier.color }} />

      <div style={{ padding: '16px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: tier.bg, border: `1px solid ${tier.border}`, fontSize: 20,
            }}>
              {tier.emoji}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>{contract.tier || 'Bronze'} Tier</p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0', fontFamily: 'monospace' }}>
                #{contract._id?.slice(-8) || '—'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
              background: isActive ? 'rgba(13,148,136,0.1)' : isMinted ? 'rgba(245,158,11,0.1)' : 'rgba(148,163,184,0.1)',
              border: `1px solid ${isActive ? 'rgba(13,148,136,0.25)' : isMinted ? 'rgba(245,158,11,0.25)' : 'rgba(148,163,184,0.25)'}`,
              color: isActive ? '#0d9488' : isMinted ? '#f59e0b' : '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {contract.status}
            </span>
            <button onClick={() => setExpanded(v => !v)}
              style={{ padding: 6, borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'transparent', cursor: 'pointer' }}>
              {expanded ? <ChevronUp size={13} style={{ color: '#64748b' }} /> : <ChevronDown size={13} style={{ color: '#64748b' }} />}
            </button>
          </div>
        </div>

        {/* Revenue split visual */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Revenue Split</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#0d9488' }}>
              ${contract.estimated_monthly_revenue != null ? Number(contract.estimated_monthly_revenue).toFixed(2) : '0.00'}/mo
            </span>
          </div>
          <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${holderPct}%`, background: '#0d9488', borderRadius: '99px 0 0 99px', transition: 'width 0.8s ease' }} />
            <div style={{ width: `${creatorPct}%`, background: tier.color, borderRadius: '0 99px 99px 0', transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 9, color: '#0d9488', fontWeight: 700 }}>IP Holder {holderPct}%</span>
            <span style={{ fontSize: 9, color: tier.color, fontWeight: 700 }}>Creator {creatorPct}%</span>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {contract.target_account && (
            <span style={{ fontSize: 10, color: '#64748b', background: '#f8fafc', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.2)' }}>
              @{contract.target_account}
            </span>
          )}
          {contract.platform && (
            <span style={{ fontSize: 10, color: '#64748b', background: '#f8fafc', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.2)' }}>
              {contract.platform}
            </span>
          )}
        </div>

        {/* Expandable hashes */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginBottom: 14, background: '#f8fafc', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(148,163,184,0.2)' }}>
                {contract.tx_hash && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg viewBox="0 0 38 33" style={{ width: 10, height: 10, fill: '#a855f7' }}><path d="M29 10.2L19 4.6 9 10.2v11.2l10 5.6 10-5.6V10.2zM19 0L38 11v11L19 33 0 22V11L19 0z"/></svg>
                      Polygon TX
                    </span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#a855f7' }}>{contract.tx_hash.slice(0, 18)}…</span>
                  </div>
                )}
                {contract.integrity_hash && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Hash size={10} /> Integrity
                    </span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#0d9488' }}>{contract.integrity_hash.slice(0, 18)}…</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {isMinted && (
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onActivate(contract._id)} disabled={!!processing}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
                color: '#fff', fontWeight: 700, fontSize: 13,
                boxShadow: '0 0 20px rgba(13,148,136,0.25)',
                opacity: processing ? 0.5 : 1,
              }}>
              {processing === contract._id
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <Wallet size={14} />
              }
              Activate Contract
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onDispute(contract._id)} disabled={!!processing}
              style={{
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                background: 'transparent', border: '1px solid rgba(148,163,184,0.3)',
                opacity: processing ? 0.5 : 1,
              }}>
              <XCircle size={14} style={{ color: '#64748b' }} />
            </motion.button>
          </div>
        )}

        {isActive && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 0', borderRadius: 10, background: 'rgba(13,148,136,0.08)',
            border: '1px solid rgba(13,148,136,0.2)', color: '#0d9488', fontWeight: 700, fontSize: 13,
          }}>
            <Activity size={14} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
            Live &amp; Yielding
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const BrokerPanel = () => {
  const { contracts, refresh, addNotification } = useDashboard();
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');

  const minted = contracts.filter(c => c.status === 'minted');
  const active = contracts.filter(c => c.status === 'active');
  const other  = contracts.filter(c => c.status !== 'minted' && c.status !== 'active');
  const totalRevenue = active.reduce((s, c) => s + (Number(c.estimated_monthly_revenue) || 0), 0);

  const handleActivate = async (id) => {
    setProcessing(id); setError('');
    try {
      await brokerService.activate(id);
      addNotification({ type: 'success', title: 'Contract Activated', message: 'Rev-share contract is now live on Polygon.' });
      refresh();
    } catch (err) { setError(err?.response?.data?.message || 'Failed to activate contract.'); }
    finally { setProcessing(null); }
  };

  const handleDispute = async (id) => {
    setProcessing(id); setError('');
    try {
      await brokerService.dispute(id);
      addNotification({ type: 'agent', title: 'Contract Disputed', message: 'Incident returned to review queue.' });
      refresh();
    } catch (err) { setError(err?.response?.data?.message || 'Failed to dispute contract.'); }
    finally { setProcessing(null); }
  };

  return (
    <div style={{ color: '#0f172a' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Monetization Broker</h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
            Activate AI-minted rev-share contracts. Fair use becomes revenue.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatBadge label="Pending"  value={minted.length}                    color="#f59e0b" />
          <StatBadge label="Active"   value={active.length}                    color="#0d9488" />
          <StatBadge label="Revenue"  value={`$${totalRevenue.toFixed(0)}`}    color="#6366f1" />
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

      {minted.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>
            ⏳ Awaiting Activation
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {minted.map(c => <ContractCard key={c._id} contract={c} onActivate={handleActivate} onDispute={handleDispute} processing={processing} />)}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>
            ✅ Live Contracts
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {active.map(c => <ContractCard key={c._id} contract={c} onActivate={handleActivate} onDispute={handleDispute} processing={processing} />)}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>Other</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {other.map(c => <ContractCard key={c._id} contract={c} onActivate={handleActivate} onDispute={handleDispute} processing={processing} />)}
          </div>
        </div>
      )}

      {contracts.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '64px 0', background: '#ffffff',
          borderRadius: 20, border: '1px dashed rgba(148,163,184,0.3)',
        }}>
          <Coins size={40} style={{ color: '#94a3b8', margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#64748b', margin: 0 }}>No contracts minted yet.</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>Run the swarm — fair use content gets a rev-share contract automatically.</p>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
};

export default BrokerPanel;
