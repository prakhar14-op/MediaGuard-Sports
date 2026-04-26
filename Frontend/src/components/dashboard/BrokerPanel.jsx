import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { brokerService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Coins, CheckCircle, TrendingUp, Wallet, Activity,
  AlertTriangle, XCircle, Hash, ChevronDown, ChevronUp,
  DollarSign, Zap,
} from 'lucide-react';

const G = {
  teal: '#0d9488', tealBg: 'rgba(13,148,136,0.08)', tealBdr: 'rgba(13,148,136,0.2)',
  card: '#ffffff', border: 'rgba(148,163,184,0.18)', text: '#0f172a',
  sub: '#64748b', muted: '#94a3b8', bg: '#f6f7fc',
};

const TIER_CFG = {
  Platinum: { color: '#818cf8', bg: 'rgba(129,140,248,0.08)', emoji: '💎', label: 'Platinum' },
  Gold:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  emoji: '🥇', label: 'Gold'     },
  Silver:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', emoji: '🥈', label: 'Silver'   },
  Bronze:   { color: '#f97316', bg: 'rgba(249,115,22,0.08)',  emoji: '🥉', label: 'Bronze'   },
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
        width: 72, height: 72, borderRadius: 20, background: G.tealBg,
        border: `2px solid ${G.tealBdr}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 20px',
      }}>
        <Coins size={32} style={{ color: G.teal }} />
      </div>
      <p style={{ fontSize: 18, fontWeight: 800, color: G.text, margin: '0 0 10px' }}>
        No Contracts Minted Yet
      </p>
      <p style={{ fontSize: 13, color: G.sub, margin: '0 0 28px', maxWidth: 380, marginInline: 'auto', lineHeight: 1.7 }}>
        Revenue-sharing contracts are minted when the Adjudicator classifies content as <strong>FAIR USE / FAN CONTENT</strong>. Run the swarm to start monetizing.
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

// ─── Revenue bar ──────────────────────────────────────────────────────────────
const RevenueBar = ({ holderPct, creatorPct, tierColor, monthly }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: G.sub }}>Revenue Split</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <DollarSign size={11} style={{ color: G.teal }} />
        <span style={{ fontSize: 13, fontWeight: 900, color: G.teal }}>
          {Number(monthly || 0).toFixed(2)}<span style={{ fontSize: 9, fontWeight: 600, color: G.muted }}>/mo</span>
        </span>
      </div>
    </div>
    <div style={{ height: 10, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 1 }}>
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${holderPct}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: `linear-gradient(90deg, ${G.teal}, #2dd4bf)`, borderRadius: '99px 0 0 99px' }}
      />
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${creatorPct}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        style={{ background: `linear-gradient(90deg, ${tierColor}, ${tierColor}99)`, borderRadius: '0 99px 99px 0' }}
      />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
      <span style={{ fontSize: 9, color: G.teal, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: G.teal, display: 'inline-block' }} />
        IP Holder {holderPct}%
      </span>
      <span style={{ fontSize: 9, color: tierColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
        Creator {creatorPct}%
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: tierColor, display: 'inline-block' }} />
      </span>
    </div>
  </div>
);

// ─── Contract card ────────────────────────────────────────────────────────────
const ContractCard = ({ contract, onActivate, onDispute, processing }) => {
  const [expanded, setExpanded] = useState(false);
  const tier     = TIER_CFG[contract.tier] || TIER_CFG.Bronze;
  const isMinted = contract.status === 'minted';
  const isActive = contract.status === 'active';
  const holderPct  = contract.copyright_holder_share ?? 0;
  const creatorPct = contract.creator_share ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
      style={{
        background: G.card, borderRadius: 18, overflow: 'hidden',
        border: `1px solid ${G.border}`,
        boxShadow: isActive ? '0 4px 24px rgba(13,148,136,0.12)' : isMinted ? '0 4px 24px rgba(245,158,11,0.10)' : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
      }}
    >
      {/* Accent bar */}
      <div style={{
        height: 4,
        background: isActive
          ? `linear-gradient(90deg, ${G.teal}, #2dd4bf)`
          : isMinted
          ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
          : tier.color,
      }} />

      <div style={{ padding: '18px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: tier.bg,
              border: `1.5px solid ${tier.color}30`, fontSize: 22,
            }}>
              {tier.emoji}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: G.text, margin: 0 }}>{tier.label} Tier</p>
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
                  background: isActive ? G.tealBg : isMinted ? 'rgba(245,158,11,0.1)' : 'rgba(148,163,184,0.1)',
                  color: isActive ? G.teal : isMinted ? '#f59e0b' : G.muted,
                  border: `1px solid ${isActive ? G.tealBdr : isMinted ? 'rgba(245,158,11,0.25)' : 'rgba(148,163,184,0.2)'}`,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {isActive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: G.teal, animation: 'pulse 1.5s ease-in-out infinite' }} />}
                  {contract.status}
                </span>
              </div>
              <p style={{ fontSize: 10, color: G.muted, margin: '3px 0 0', fontFamily: 'monospace' }}>
                #{contract._id?.slice(-8) || '—'}
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setExpanded(v => !v)}
            style={{
              width: 30, height: 30, borderRadius: 8, border: `1px solid ${G.border}`,
              background: expanded ? G.tealBg : 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {expanded
              ? <ChevronUp size={14} style={{ color: G.teal }} />
              : <ChevronDown size={14} style={{ color: G.sub }} />
            }
          </motion.button>
        </div>

        {/* Revenue bar */}
        <RevenueBar
          holderPct={holderPct} creatorPct={creatorPct}
          tierColor={tier.color} monthly={contract.estimated_monthly_revenue}
        />

        {/* Meta tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {contract.target_account && (
            <span style={{ fontSize: 10, color: G.sub, background: '#f8fafc', padding: '3px 9px', borderRadius: 6, border: `1px solid ${G.border}` }}>
              @{contract.target_account}
            </span>
          )}
          {contract.platform && (
            <span style={{ fontSize: 10, color: G.sub, background: '#f8fafc', padding: '3px 9px', borderRadius: 6, border: `1px solid ${G.border}` }}>
              {contract.platform}
            </span>
          )}
          {contract.video_title && (
            <span style={{
              fontSize: 10, color: G.sub, background: '#f8fafc', padding: '3px 9px', borderRadius: 6,
              border: `1px solid ${G.border}`, maxWidth: 200,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              🎬 {contract.video_title}
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
              <div style={{
                marginBottom: 14, background: '#f8fafc', borderRadius: 12,
                border: `1px solid ${G.border}`, padding: '12px 14px',
              }}>
                {contract.tx_hash && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: G.sub, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg viewBox="0 0 38 33" style={{ width: 11, height: 11, fill: '#a855f7' }}><path d="M29 10.2L19 4.6 9 10.2v11.2l10 5.6 10-5.6V10.2zM19 0L38 11v11L19 33 0 22V11L19 0z"/></svg>
                      Polygon TX
                    </span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#a855f7', background: 'rgba(168,85,247,0.08)', padding: '2px 8px', borderRadius: 6 }}>
                      {contract.tx_hash.slice(0, 20)}…
                    </span>
                  </div>
                )}
                {contract.integrity_hash && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: G.sub, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Hash size={11} /> Integrity
                    </span>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: G.teal, background: G.tealBg, padding: '2px 8px', borderRadius: 6 }}>
                      {contract.integrity_hash.slice(0, 20)}…
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {isMinted && (
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => onActivate(contract._id)} disabled={!!processing}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 0', borderRadius: 11, border: 'none',
                cursor: processing ? 'not-allowed' : 'pointer',
                background: processing === contract._id ? G.border : `linear-gradient(135deg, ${G.teal}, #2dd4bf)`,
                color: processing === contract._id ? G.muted : '#fff',
                fontWeight: 700, fontSize: 13,
                boxShadow: processing ? 'none' : '0 0 20px rgba(13,148,136,0.3)',
                opacity: processing && processing !== contract._id ? 0.5 : 1,
              }}>
              {processing === contract._id
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <Wallet size={14} />
              }
              Activate Contract
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => onDispute(contract._id)} disabled={!!processing}
              style={{
                padding: '11px 14px', borderRadius: 11, cursor: processing ? 'not-allowed' : 'pointer',
                background: 'transparent', border: `1px solid ${G.border}`,
                opacity: processing ? 0.5 : 1,
              }}>
              <XCircle size={14} style={{ color: G.sub }} />
            </motion.button>
          </div>
        )}

        {isActive && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 0', borderRadius: 11, background: G.tealBg,
            border: `1px solid ${G.tealBdr}`, color: G.teal, fontWeight: 700, fontSize: 13,
          }}>
            <Activity size={14} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
            Live &amp; Yielding Revenue
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
  const totalPending = minted.reduce((s, c) => s + (Number(c.estimated_monthly_revenue) || 0), 0);

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
    <div style={{ color: G.text }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: G.tealBg,
              border: `1px solid ${G.tealBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Coins size={18} style={{ color: G.teal }} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: G.text, margin: 0 }}>Monetization Broker</h2>
          </div>
          <p style={{ fontSize: 12, color: G.sub, margin: 0, paddingLeft: 46 }}>
            Activate AI-minted rev-share contracts. Fair use becomes revenue.
          </p>
        </div>

        {/* Revenue stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Pending',  value: minted.length,              color: '#f59e0b', icon: <Zap size={14} />,         sub: `$${totalPending.toFixed(0)}/mo potential` },
            { label: 'Active',   value: active.length,              color: G.teal,    icon: <Activity size={14} />,    sub: `$${totalRevenue.toFixed(0)}/mo live`      },
            { label: 'Total',    value: contracts.length,           color: '#6366f1', icon: <TrendingUp size={14} />,  sub: 'all contracts'                            },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '12px 16px', borderRadius: 14, minWidth: 80,
              background: `${s.color}08`, border: `1.5px solid ${s.color}25`,
            }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontSize: '0.6rem', color: G.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
              <span style={{ fontSize: '0.55rem', color: s.color, fontWeight: 600 }}>{s.sub}</span>
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

      {contracts.length === 0 ? <EmptyState /> : (
        <>
          {minted.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                  Awaiting Activation ({minted.length})
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                {minted.map(c => <ContractCard key={c._id} contract={c} onActivate={handleActivate} onDispute={handleDispute} processing={processing} />)}
              </div>
            </div>
          )}

          {active.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: G.teal, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: G.teal, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                  Live Contracts ({active.length}) · ${totalRevenue.toFixed(2)}/mo
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                {active.map(c => <ContractCard key={c._id} contract={c} onActivate={handleActivate} onDispute={handleDispute} processing={processing} />)}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                {other.map(c => <ContractCard key={c._id} contract={c} onActivate={handleActivate} onDispute={handleDispute} processing={processing} />)}
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

export default BrokerPanel;
