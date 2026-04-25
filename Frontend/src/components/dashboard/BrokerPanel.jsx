import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { brokerService } from '../../services/api';
import { Coins, CheckCircle, TrendingUp, Wallet, Activity, AlertTriangle, XCircle, Hash } from 'lucide-react';

const TIER_COLORS = {
  Platinum: { text: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.2)' },
  Gold:     { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.2)'  },
  Silver:   { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
  Bronze:   { text: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.2)'  },
};

const ContractCard = ({ contract, onActivate, onDispute, processing }) => {
  const tier    = contract.tier || 'Bronze';
  const colors  = TIER_COLORS[tier] || TIER_COLORS.Bronze;
  const isMinted = contract.status === 'minted';
  const isActive = contract.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 group hover:border-emerald-500/15 transition-all relative overflow-hidden"
    >
      {/* Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 blur-3xl -mr-16 -mt-16 pointer-events-none transition-colors group-hover:opacity-100 opacity-0"
        style={{ background: `${colors.text}10` }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
              <Coins className="w-5 h-5" style={{ color: colors.text }} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">{tier} Tier</h4>
              <p className="text-[10px] text-slate-500 font-mono">#{contract._id?.slice(-8)}</p>
            </div>
          </div>
          <span className={`text-[9px] font-bold px-2.5 py-1 rounded border uppercase tracking-widest ${
            isActive  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
            isMinted  ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                        'text-slate-400 bg-slate-400/10 border-slate-400/20'
          }`}>
            {contract.status}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">IP Holder Share</p>
            <p className="text-2xl font-black text-white">{contract.copyright_holder_share ?? '—'}%</p>
            <p className="text-[9px] text-emerald-400 font-medium mt-0.5">Creator: {contract.creator_share ?? '—'}%</p>
          </div>
          <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Est. Monthly</p>
            <p className="text-2xl font-black text-white">
              ${contract.estimated_monthly_revenue != null ? Number(contract.estimated_monthly_revenue).toFixed(2) : '—'}
            </p>
            <p className="text-[9px] text-slate-500 font-medium mt-0.5">Based on CPM</p>
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-2 mb-5">
          {contract.target_account && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Creator</span>
              <span className="text-slate-300">@{contract.target_account}</span>
            </div>
          )}
          {contract.platform && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Platform</span>
              <span className="text-slate-300">{contract.platform}</span>
            </div>
          )}
          {contract.tx_hash && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 flex items-center gap-1">
                <svg viewBox="0 0 38 33" className="w-3 h-3 fill-violet-400"><path d="M29 10.2L19 4.6 9 10.2v11.2l10 5.6 10-5.6V10.2zM19 0L38 11v11L19 33 0 22V11L19 0z"/></svg>
                Polygon TX
              </span>
              <span className="text-violet-400 font-mono">{contract.tx_hash.slice(0, 14)}…</span>
            </div>
          )}
          {contract.integrity_hash && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 flex items-center gap-1"><Hash className="w-3 h-3" />Hash</span>
              <span className="text-teal-400 font-mono">{contract.integrity_hash.slice(0, 14)}…</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {isMinted && (
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onActivate(contract._id)}
              disabled={!!processing}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-sm shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              {processing === contract._id
                ? <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                : <Wallet className="w-4 h-4" />
              }
              Activate Contract
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onDispute(contract._id)}
              disabled={!!processing}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all"
              title="Dispute"
            >
              <XCircle className="w-4 h-4 text-slate-400" />
            </motion.button>
          </div>
        )}

        {isActive && (
          <div className="flex items-center justify-center gap-2 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-bold text-sm">
            <Activity className="w-4 h-4 animate-pulse" /> Live &amp; Yielding
          </div>
        )}
      </div>
    </motion.div>
  );
};

const BrokerPanel = () => {
  const { contracts, refresh, addNotification } = useDashboard();
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');

  const minted = contracts.filter(c => c.status === 'minted');
  const active = contracts.filter(c => c.status === 'active');
  const other  = contracts.filter(c => c.status !== 'minted' && c.status !== 'active');

  const totalRevenue = active.reduce((s, c) => s + (Number(c.estimated_monthly_revenue) || 0), 0);

  const handleActivate = async (id) => {
    setProcessing(id);
    setError('');
    try {
      await brokerService.activate(id);
      addNotification({ type: 'success', title: 'Contract Activated', message: 'Rev-share contract is now live on Polygon.' });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to activate contract.');
    } finally {
      setProcessing(null);
    }
  };

  const handleDispute = async (id) => {
    setProcessing(id);
    setError('');
    try {
      await brokerService.dispute(id);
      addNotification({ type: 'agent', title: 'Contract Disputed', message: 'Incident returned to review queue.' });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to dispute contract.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Monetization Broker</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Activate AI-minted rev-share contracts. Fair use becomes revenue.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {minted.length > 0 && (
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-xs font-bold text-amber-400">{minted.length} Awaiting Activation</span>
            </div>
          )}
          {active.length > 0 && (
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">${totalRevenue.toFixed(2)}/mo active</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {minted.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-3">Awaiting Activation</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {minted.map(c => <ContractCard key={c._id} contract={c} onActivate={handleActivate} onDispute={handleDispute} processing={processing} />)}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">Live Contracts</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {active.map(c => <ContractCard key={c._id} contract={c} onActivate={handleActivate} onDispute={handleDispute} processing={processing} />)}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Other</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {other.map(c => <ContractCard key={c._id} contract={c} onActivate={handleActivate} onDispute={handleDispute} processing={processing} />)}
          </div>
        </div>
      )}

      {contracts.length === 0 && (
        <div className="py-20 text-center bg-slate-900/20 border border-dashed border-white/10 rounded-3xl">
          <Coins className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No contracts minted yet.</p>
          <p className="text-slate-600 text-sm mt-1">Run the swarm — fair use content gets a rev-share contract automatically.</p>
        </div>
      )}
    </div>
  );
};

export default BrokerPanel;
