import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { adjudicatorService, enforcerService, brokerService, sentinelService } from '../../services/api';
import { cn } from '../../lib/utils';
import {
  ExternalLink, ShieldAlert, Search, CheckCircle,
  Clock, AlertTriangle, Gavel, Coins, Brain, RefreshCw, ChevronDown,
} from 'lucide-react';

const SEV_COLOR = {
  CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/20',
  WARNING:  'text-orange-400 bg-orange-400/10 border-orange-400/20',
  INFO:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

const STATUS_ICON = {
  detected:        <Search className="w-3 h-3" />,
  reviewing:       <Clock className="w-3 h-3" />,
  takedown_pending:<ShieldAlert className="w-3 h-3" />,
  takedown_sent:   <ShieldAlert className="w-3 h-3 text-red-400" />,
  monetized:       <CheckCircle className="w-3 h-3 text-emerald-400" />,
  cleared:         <CheckCircle className="w-3 h-3 text-slate-400" />,
};

// ─── Action menu for a single incident ───────────────────────────────────────
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

  const adjudicate = () => run('Adjudicate', () =>
    adjudicatorService.adjudicate({
      incident_id:      incident._id,
      sentinel_report:  `[SCAN] Confidence: ${incident.confidence_score}% | Severity: ${incident.severity}`,
      platform:         incident.platform || 'YouTube',
      account_handle:   incident.account_handle || 'unknown',
      video_title:      incident.title || 'Unknown',
      description:      '',
      country:          incident.country || '',
      confidence_score: incident.confidence_score || 50,
    })
  );

  const enforce = () => run('Draft DMCA', () =>
    enforcerService.enforce({
      incident_id:      incident._id,
      target_account:   incident.account_handle || 'unknown',
      platform:         incident.platform || 'YouTube',
      video_title:      incident.title || 'Unknown',
      video_url:        incident.url || '',
      confidence_score: incident.confidence_score || 50,
      classification:   incident.classification || 'SEVERE PIRACY',
      justification:    incident.adjudicator_justification || 'High confidence match detected by Sentinel.',
      integrity_hash:   '',
    })
  );

  const broker = () => run('Mint Contract', () =>
    brokerService.broker({
      incident_id:    incident._id,
      target_account: incident.account_handle || 'unknown',
      platform:       incident.platform || 'YouTube',
      video_title:    incident.title || 'Unknown',
      video_url:      incident.url || '',
      justification:  incident.adjudicator_justification || 'Fair use content identified.',
      view_count:     0,
      risk_score:     30,
    })
  );

  const canAdjudicate = ['detected', 'reviewing'].includes(incident.status) && !incident.classification?.includes('PIRACY') && incident.classification !== 'FAIR USE / FAN CONTENT';
  const canEnforce    = ['detected', 'reviewing', 'takedown_pending'].includes(incident.status);
  const canBroker     = ['detected', 'reviewing'].includes(incident.status);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/5 transition-all flex items-center gap-1"
      >
        <span className="text-[10px] text-slate-400 font-bold">Actions</span>
        <ChevronDown className={cn('w-3 h-3 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+6px)] z-50 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden w-44"
          >
            {error && <p className="px-3 py-2 text-[10px] text-red-400 border-b border-white/5">{error}</p>}

            <button
              onClick={adjudicate}
              disabled={!canAdjudicate || !!processing}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              {processing === 'Adjudicate' ? 'Running…' : 'Adjudicate'}
            </button>

            <button
              onClick={enforce}
              disabled={!canEnforce || !!processing}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-t border-white/5"
            >
              <Gavel className="w-3.5 h-3.5 text-red-400" />
              {processing === 'Draft DMCA' ? 'Drafting…' : 'Draft DMCA'}
            </button>

            <button
              onClick={broker}
              disabled={!canBroker || !!processing}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-t border-white/5"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              {processing === 'Mint Contract' ? 'Minting…' : 'Mint Contract'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main table ───────────────────────────────────────────────────────────────
const IncidentTable = () => {
  const { incidents, loading, refresh } = useDashboard();

  const [platform, setPlatform] = useState('');
  const [severity, setSeverity] = useState('');
  const [status,   setStatus]   = useState('');

  const filtered = incidents.filter(inc => {
    if (platform && inc.platform !== platform) return false;
    if (severity && inc.severity !== severity) return false;
    if (status   && inc.status   !== status)   return false;
    return true;
  });

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden">
      {/* Header + filters */}
      <div className="p-5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Detection Intelligence</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{filtered.length} incidents{incidents.length !== filtered.length ? ` (${incidents.length} total)` : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { value: platform, set: setPlatform, options: ['', 'YouTube', 'TikTok', 'Twitter', 'Instagram', 'Telegram', 'Reddit'], placeholder: 'All Platforms' },
            { value: severity, set: setSeverity, options: ['', 'CRITICAL', 'WARNING', 'INFO'], placeholder: 'All Severities' },
            { value: status,   set: setStatus,   options: ['', 'detected', 'reviewing', 'takedown_pending', 'takedown_sent', 'monetized', 'cleared'], placeholder: 'All Statuses' },
          ].map(({ value, set, options, placeholder }) => (
            <select
              key={placeholder}
              value={value}
              onChange={e => set(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {options.map(o => <option key={o} value={o}>{o || placeholder}</option>)}
            </select>
          ))}
          <button
            onClick={refresh}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.03] text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="px-5 py-3.5">Threat Node</th>
              <th className="px-5 py-3.5">Platform</th>
              <th className="px-5 py-3.5">Confidence</th>
              <th className="px-5 py-3.5">Severity</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Classification</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((inc) => (
              <tr key={inc._id} className="group hover:bg-white/[0.03] transition-colors">
                {/* Threat node */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-white/5">
                      {inc.thumbnail_url
                        ? <img src={inc.thumbnail_url} alt={inc.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-slate-600" /></div>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate max-w-[220px]">{inc.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">@{inc.account_handle || 'anonymous'}</p>
                    </div>
                  </div>
                </td>

                {/* Platform */}
                <td className="px-5 py-3.5 text-sm font-medium text-slate-300">{inc.platform}</td>

                {/* Confidence */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-14 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', inc.confidence_score > 90 ? 'bg-emerald-500' : inc.confidence_score > 70 ? 'bg-blue-500' : 'bg-amber-500')}
                        style={{ width: `${inc.confidence_score || 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{inc.confidence_score ?? '—'}%</span>
                  </div>
                </td>

                {/* Severity */}
                <td className="px-5 py-3.5">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider', SEV_COLOR[inc.severity] || SEV_COLOR.INFO)}>
                    {inc.severity || '—'}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <div className={cn('p-1 rounded-md bg-white/5 border border-white/10', inc.status === 'monetized' ? 'text-emerald-400' : 'text-slate-400')}>
                      {STATUS_ICON[inc.status] || <AlertTriangle className="w-3 h-3" />}
                    </div>
                    <span className="capitalize text-[11px]">{(inc.status || '').replace(/_/g, ' ')}</span>
                  </div>
                </td>

                {/* Classification */}
                <td className="px-5 py-3.5">
                  {inc.classification && inc.classification !== 'UNREVIEWED' && inc.classification !== 'PENDING' ? (
                    <span className={cn(
                      'text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider',
                      inc.classification === 'SEVERE PIRACY'
                        ? 'text-red-400 bg-red-400/10 border-red-400/20'
                        : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    )}>
                      {inc.classification === 'SEVERE PIRACY' ? 'Piracy' : 'Fair Use'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">Pending</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    {inc.url && (
                      <a href={inc.url} target="_blank" rel="noreferrer"
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/5 transition-all opacity-0 group-hover:opacity-100">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </a>
                    )}
                    <ActionMenu incident={inc} onDone={refresh} />
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center text-slate-500 text-sm italic">
                  {incidents.length === 0
                    ? 'No incidents detected. Run the swarm to start scanning.'
                    : 'No incidents match the current filters.'
                  }
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center">
                  <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncidentTable;
