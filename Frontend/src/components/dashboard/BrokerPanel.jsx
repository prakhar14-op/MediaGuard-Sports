import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { brokerService } from '../../services/api';
import { Coins, CheckCircle, TrendingUp, Wallet, ArrowRight, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

const BrokerPanel = () => {
  const { contracts, refresh } = useDashboard();
  const [processingId, setProcessingId] = useState(null);

  const handleActivate = async (id) => {
    try {
      setProcessingId(id);
      await brokerService.activate(id);
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Monetization Broker</h2>
          <p className="text-slate-400 text-sm">Convert fair-use fan engagement into revenue-sharing smart contracts.</p>
        </div>
        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400">Yield Optimization Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contracts.map((contract) => (
          <div key={contract._id} className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 group hover:border-emerald-500/20 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Coins className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-tight">{contract.virality_tier} Tier</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Smart Contract #{contract._id.slice(-6)}</p>
                  </div>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                  contract.status === 'active' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                )}>
                  {contract.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Rev Share</p>
                  <p className="text-2xl font-bold text-white">{contract.rev_share_split}%</p>
                  <p className="text-[10px] text-emerald-400 font-medium mt-1">Optimized by Gemini</p>
                </div>
                <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Proj. Revenue</p>
                  <p className="text-2xl font-bold text-white">${contract.projected_revenue}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Based on CPM indices</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Asset Hash</span>
                  <span className="text-slate-300 font-mono">{contract.integrity_hash?.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Polygon TX</span>
                  <span className="text-blue-400 font-mono cursor-pointer hover:underline">View on Explorer</span>
                </div>
              </div>

              {contract.status !== 'active' ? (
                <button 
                  onClick={() => handleActivate(contract._id)}
                  disabled={!!processingId}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  {processingId === contract._id ? <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> : <Wallet className="w-4 h-4" />}
                  Activate Smart Contract
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-bold text-sm">
                  <Activity className="w-4 h-4 animate-pulse" /> Live & Yielding
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {contracts.length === 0 && (
        <div className="py-20 text-center bg-slate-900/20 border border-dashed border-white/10 rounded-3xl">
          <Coins className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No monetization contracts staged. Agents monitoring for fair-use content.</p>
        </div>
      )}
    </div>
  );
};

export default BrokerPanel;
