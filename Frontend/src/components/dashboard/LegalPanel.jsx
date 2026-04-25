import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { enforcerService } from '../../services/api';
import { Gavel, CheckCircle, XCircle, FileText, Shield, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const TIER_COLORS = {
  standard:       'text-blue-400 bg-blue-400/10 border-blue-400/20',
  expedited:      'text-amber-400 bg-amber-400/10 border-amber-400/20',
  legal_referral: 'text-red-400 bg-red-400/10 border-red-400/20',
};

const STATUS_COLORS = {
  drafted:     'text-amber-400 bg-amber-400/10 border-amber-400/20',
  sent:        'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  rejected:    'text-slate-400 bg-slate-400/10 border-slate-400/20',
  acknowledged:'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

const DMCACard = ({ dmca, onApprove, onReject, processing }) => {
  const [expanded, setExpanded] = useState(false);
  const isDrafted = dmca.status === 'drafted';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20 shrink-0">
            <FileText className="w-5 h-5 text-red-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-bold text-white text-sm">
                DMCA #{dmca._id?.slice(-8) || '—'}
              </h4>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${STATUS_COLORS[dmca.status] || STATUS_COLORS.drafted}`}>
                {dmca.status}
              </span>
              {dmca.tier && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${TIER_COLORS[dmca.tier] || TIER_COLORS.standard}`}>
                  {dmca.tier?.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {dmca.platform} · @{dmca.target_account}
              {dmca.offence_number > 1 && <span className="text-amber-400 ml-2">Offence #{dmca.offence_number}</span>}
            </p>
          </div>

          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {/* Notice preview */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-4 bg-slate-950/80 rounded-xl p-4 font-mono text-[10px] text-slate-400 max-h-40 overflow-y-auto border border-white/5 whitespace-pre-wrap custom-scrollbar">
                {dmca.notice_text || dmca.notice_content || 'Notice content not available.'}
              </div>
              {dmca.legal_contact && (
                <p className="mt-2 text-[10px] text-slate-500">
                  Legal contact: <span className="text-teal-400">{dmca.legal_contact}</span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {isDrafted && (
          <div className="flex gap-3 mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onApprove(dmca._id)}
              disabled={!!processing}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              {processing === dmca._id
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Shield className="w-4 h-4" />
              }
              Approve &amp; Send
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onReject(dmca._id)}
              disabled={!!processing}
              className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all text-sm"
            >
              <XCircle className="w-4 h-4" /> Reject
            </motion.button>
          </div>
        )}

        {dmca.status === 'sent' && (
          <div className="mt-4 flex items-center gap-2 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl justify-center text-emerald-400 text-sm font-bold">
            <CheckCircle className="w-4 h-4" /> Dispatched to {dmca.platform} legal
          </div>
        )}
      </div>
    </motion.div>
  );
};

const LegalPanel = () => {
  const { dmcas, refresh, addNotification } = useDashboard();
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');

  const drafted = dmcas.filter(d => d.status === 'drafted');
  const sent    = dmcas.filter(d => d.status === 'sent');
  const other   = dmcas.filter(d => d.status !== 'drafted' && d.status !== 'sent');

  const handleApprove = async (id) => {
    setProcessing(id);
    setError('');
    try {
      await enforcerService.approve(id);
      addNotification({ type: 'success', title: 'DMCA Sent', message: 'Takedown notice dispatched to platform legal team.' });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to approve DMCA.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    setProcessing(id);
    setError('');
    try {
      await enforcerService.reject(id);
      addNotification({ type: 'agent', title: 'DMCA Rejected', message: 'Incident cleared as false positive.' });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reject DMCA.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">DMCA Enforcement</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Review AI-drafted takedown notices. You approve — the Enforcer dispatches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {drafted.length > 0 && (
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-xs font-bold text-amber-400">{drafted.length} Awaiting Approval</span>
            </div>
          )}
          <div className="px-4 py-2 bg-slate-900/40 border border-white/5 rounded-xl">
            <span className="text-xs font-bold text-slate-400">{sent.length} Sent</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Drafted — needs approval */}
      {drafted.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-3">Awaiting Your Approval</p>
          <div className="space-y-4">
            {drafted.map(d => (
              <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />
            ))}
          </div>
        </div>
      )}

      {/* Sent */}
      {sent.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">Dispatched</p>
          <div className="space-y-4">
            {sent.map(d => (
              <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />
            ))}
          </div>
        </div>
      )}

      {/* Other */}
      {other.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Other</p>
          <div className="space-y-4">
            {other.map(d => (
              <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} processing={processing} />
            ))}
          </div>
        </div>
      )}

      {dmcas.length === 0 && (
        <div className="py-20 text-center bg-slate-900/20 border border-dashed border-white/10 rounded-3xl">
          <Gavel className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No DMCA notices staged.</p>
          <p className="text-slate-600 text-sm mt-1">Run the swarm to generate takedown notices automatically.</p>
        </div>
      )}
    </div>
  );
};

export default LegalPanel;
