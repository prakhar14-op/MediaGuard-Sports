import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as echarts from 'echarts';
import { useDashboard } from '../../context/DashboardContext';
import { enforcerService, brokerService } from '../../services/api';
import SpotlightCard from '../ui/SpotlightCard';
import { Gavel, Coins, Send, CheckCircle, XCircle, FileText, Shield, Clock, ChevronDown } from 'lucide-react';

const TIER_CFG = {
  standard:       { color: '#6366f1', label: 'Standard' },
  expedited:      { color: '#f59e0b', label: 'Expedited' },
  legal_referral: { color: '#ef4444', label: 'Legal Referral' },
};

// ─── Stats Bar ───────────────────────────────────────────────────────────────
const StatsBar = ({ dmcas, contracts }) => {
  const drafted = dmcas.filter(d => d.status === 'drafted').length;
  const sent    = dmcas.filter(d => d.status === 'sent').length;
  const active  = contracts.filter(c => c.status === 'active' || c.status === 'minted').length;
  const revenue = contracts.reduce((s, c) => s + (c.estimated_monthly_revenue || 0), 0);

  const stats = [
    { label: 'DMCA Drafted', value: drafted, color: '#f59e0b' },
    { label: 'DMCA Sent', value: sent, color: '#0d9488' },
    { label: 'Total Notices', value: dmcas.length, color: '#6366f1' },
    { label: 'Contracts Active', value: active, color: '#a855f7' },
    { label: 'Monthly Revenue', value: `$${revenue}`, color: '#0d9488' },
    { label: 'Success Rate', value: `${dmcas.length > 0 ? Math.round((sent / dmcas.length) * 100) : 0}%`, color: '#0d9488' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 14 }}>
      {stats.map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          style={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px' }}>
          <p style={{ fontSize: 7, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 3px' }}>{s.label}</p>
          <p style={{ fontSize: 17, fontWeight: 900, color: s.color, margin: 0, fontFamily: 'monospace' }}>{s.value}</p>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Tier Distribution Chart ─────────────────────────────────────────────────
const TierChart = ({ dmcas }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, 'dark');
    const standard = dmcas.filter(d => d.tier === 'standard').length;
    const expedited = dmcas.filter(d => d.tier === 'expedited').length;
    const legal = dmcas.filter(d => d.tier === 'legal_referral').length;

    c.setOption({
      backgroundColor: 'transparent',
      tooltip: { backgroundColor: '#1e293b', borderColor: 'transparent', textStyle: { color: '#e2e8f0', fontSize: 10 } },
      series: [{ type: 'pie', radius: ['40%', '70%'], center: ['50%', '50%'], label: { color: '#94a3b8', fontSize: 8 }, data: [
        { value: standard || 1, name: 'Standard', itemStyle: { color: '#6366f1' } },
        { value: expedited || 1, name: 'Expedited', itemStyle: { color: '#f59e0b' } },
        { value: legal || 1, name: 'Legal Referral', itemStyle: { color: '#ef4444' } },
      ]}],
    });
    const r = () => c.resize(); window.addEventListener('resize', r);
    return () => { c.dispose(); window.removeEventListener('resize', r); };
  }, [dmcas]);
  return <div ref={ref} style={{ height: 160 }} />;
};

// ─── Revenue Chart ───────────────────────────────────────────────────────────
const RevenueChart = ({ contracts }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, 'dark');
    const tiers = {};
    contracts.forEach(ct => { tiers[ct.tier || 'Bronze'] = (tiers[ct.tier || 'Bronze'] || 0) + (ct.estimated_monthly_revenue || 0); });

    c.setOption({
      backgroundColor: 'transparent',
      grid: { top: 16, right: 10, bottom: 20, left: 34 },
      xAxis: { type: 'category', data: Object.keys(tiers), axisLabel: { color: '#475569', fontSize: 8 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } }, axisLabel: { color: '#475569', fontSize: 8, formatter: '${value}' } },
      tooltip: { backgroundColor: '#1e293b', borderColor: 'transparent', textStyle: { color: '#e2e8f0', fontSize: 10 } },
      series: [{ type: 'bar', data: Object.values(tiers), itemStyle: { color: '#0d9488', borderRadius: [4, 4, 0, 0] }, barWidth: 28 }],
    });
    const r = () => c.resize(); window.addEventListener('resize', r);
    return () => { c.dispose(); window.removeEventListener('resize', r); };
  }, [contracts]);
  return <div ref={ref} style={{ height: 160 }} />;
};

// ─── DMCA Card ───────────────────────────────────────────────────────────────
const DMCACard = ({ dmca, onApprove, onReject }) => {
  const [expanded, setExpanded] = useState(false);
  const tier = TIER_CFG[dmca.tier] || TIER_CFG.standard;

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ background: '#0a0f1a', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', padding: '12px 14px', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: tier.color, boxShadow: `0 0 6px ${tier.color}40` }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dmca.target_account || 'Unknown'} — {dmca.platform || '?'}
          </p>
          <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
            <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${tier.color}15`, color: tier.color }}>{tier.label}</span>
            <span style={{ fontSize: 7, color: '#475569' }}>Offence #{dmca.offence_number || 1}</span>
            <span style={{ fontSize: 7, color: '#475569' }}>{dmca.legal_contact}</span>
          </div>
        </div>
        <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: dmca.status === 'sent' ? 'rgba(13,148,136,0.1)' : 'rgba(245,158,11,0.1)', color: dmca.status === 'sent' ? '#0d9488' : '#f59e0b', textTransform: 'uppercase' }}>
          {dmca.status}
        </span>
        <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronDown size={12} style={{ color: '#64748b', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontFamily: 'monospace', fontSize: 9, color: '#94a3b8', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto' }}>
              {dmca.notice_text || 'No notice text available.'}
            </div>
            {dmca.status === 'drafted' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={() => onApprove?.(dmca._id)} style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 9, fontWeight: 700, background: 'rgba(13,148,136,0.08)', color: '#2dd4bf', border: '1px solid rgba(13,148,136,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Send size={10} /> Approve & Send
                </button>
                <button onClick={() => onReject?.(dmca._id)} style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <XCircle size={10} /> Reject
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Contract Card ───────────────────────────────────────────────────────────
const ContractCard = ({ contract, onActivate, onDispute }) => (
  <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    style={{ background: '#0a0f1a', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', padding: '12px 14px', marginBottom: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Coins size={14} style={{ color: '#0d9488', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{contract.target_account} — {contract.platform}</p>
        <p style={{ fontSize: 9, color: '#64748b', margin: '2px 0 0' }}>{contract.video_title || 'Content'}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: 14, fontWeight: 900, color: '#0d9488', margin: 0, fontFamily: 'monospace' }}>${contract.estimated_monthly_revenue || 0}/mo</p>
        <p style={{ fontSize: 8, color: '#64748b', margin: 0 }}>{contract.copyright_holder_share}% / {contract.creator_share}%</p>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: 'rgba(13,148,136,0.08)', color: '#0d9488', fontWeight: 700 }}>{contract.tier || 'Bronze'}</span>
      <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: 'rgba(99,102,241,0.08)', color: '#818cf8', fontFamily: 'monospace' }}>{(contract.tx_hash || '').slice(0, 14)}…</span>
      <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: contract.status === 'active' ? 'rgba(13,148,136,0.1)' : 'rgba(167,139,250,0.08)', color: contract.status === 'active' ? '#0d9488' : '#a78bfa', fontWeight: 700, textTransform: 'uppercase' }}>{contract.status}</span>
      <div style={{ flex: 1 }} />
      {contract.status === 'minted' && (
        <>
          <button onClick={() => onActivate?.(contract._id)} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 8, fontWeight: 700, background: 'rgba(13,148,136,0.08)', color: '#2dd4bf', border: '1px solid rgba(13,148,136,0.15)', cursor: 'pointer' }}>
            Activate
          </button>
          <button onClick={() => onDispute?.(contract._id)} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 8, fontWeight: 700, background: 'rgba(239,68,68,0.06)', color: '#f87171', border: '1px solid rgba(239,68,68,0.12)', cursor: 'pointer' }}>
            Dispute
          </button>
        </>
      )}
    </div>
  </motion.div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
const EnforcementHub = () => {
  const { dmcas, contracts, refresh, addNotification } = useDashboard();

  const handleApprove = async (id) => {
    try {
      await enforcerService.approve(id);
      addNotification({ type: 'success', title: 'DMCA Sent', message: 'Notice dispatched to platform.' });
      refresh();
    } catch { addNotification({ type: 'threat', title: 'Error', message: 'Failed to send DMCA.' }); }
  };

  const handleReject = async (id) => {
    try {
      await enforcerService.reject(id);
      addNotification({ type: 'agent', title: 'Rejected', message: 'DMCA notice rejected.' });
      refresh();
    } catch { addNotification({ type: 'threat', title: 'Error', message: 'Failed to reject.' }); }
  };

  const handleActivate = async (id) => {
    try {
      await brokerService.activate(id);
      addNotification({ type: 'success', title: 'Contract Activated', message: 'Rev-share is now live.' });
      refresh();
    } catch { addNotification({ type: 'threat', title: 'Error', message: 'Failed to activate.' }); }
  };

  const handleDispute = async (id) => {
    try {
      await brokerService.dispute(id);
      addNotification({ type: 'agent', title: 'Disputed', message: 'Contract under dispute review.' });
      refresh();
    } catch { addNotification({ type: 'threat', title: 'Error', message: 'Failed to dispute.' }); }
  };

  return (
    <div style={{ background: '#050810', borderRadius: 18, padding: 20, minHeight: 'calc(100vh - 140px)', color: '#e2e8f0' }}>
      <StatsBar dmcas={dmcas} contracts={contracts} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Charts */}
        <div style={{ background: '#0a0f1a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: 14 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>DMCA Tier Distribution</p>
          <TierChart dmcas={dmcas} />
        </div>
        <div style={{ background: '#0a0f1a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: 14 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Revenue by Tier</p>
          <RevenueChart contracts={contracts} />
        </div>
      </div>

      {/* Two columns: DMCA + Contracts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* DMCA Notices */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Gavel size={13} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9' }}>DMCA Notices</span>
            <span style={{ fontSize: 8, color: '#475569' }}>{dmcas.length} total</span>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {dmcas.length > 0 ? dmcas.map(d => <DMCACard key={d._id} dmca={d} onApprove={handleApprove} onReject={handleReject} />) :
              <p style={{ fontSize: 10, color: '#334155', textAlign: 'center', padding: 30 }}>No DMCA notices yet. Run a swarm to generate.</p>}
          </div>
        </div>

        {/* Contracts */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Coins size={13} style={{ color: '#0d9488' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9' }}>Rev-Share Contracts</span>
            <span style={{ fontSize: 8, color: '#475569' }}>{contracts.length} total</span>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {contracts.length > 0 ? contracts.map(c => <ContractCard key={c._id} contract={c} onActivate={handleActivate} onDispute={handleDispute} />) :
              <p style={{ fontSize: 10, color: '#334155', textAlign: 'center', padding: 30 }}>No contracts yet. Fair-use content generates rev-share deals.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnforcementHub;
