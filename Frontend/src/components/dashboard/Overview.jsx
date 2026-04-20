import React from 'react';
import StatCard from '../shared/StatCard';
import { 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp, 
  Box,
  Cpu,
  Globe,
  Lock,
  Zap
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const agents = [
  { name: 'Archivist', status: 'Standby', icon: Lock, color: 'text-blue-400' },
  { name: 'Sentinel', status: 'Scanning', icon: Globe, color: 'text-amber-400', active: true },
  { name: 'Adjudicator', status: 'Processing', icon: Cpu, color: 'text-purple-400', active: true },
  { name: 'Enforcer', status: 'Standby', icon: ShieldCheck, color: 'text-red-400' },
  { name: 'Broker', status: 'Active', icon: TrendingUp, color: 'text-emerald-400' },
  { name: 'Spider', status: 'Crawling', icon: Zap, color: 'text-blue-400', active: true },
];

const Overview = () => {
  const { stats, notifications } = useDashboard();

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Detections" 
          value={stats.totalDetections} 
          subValue="Across 7 platforms"
          icon={AlertCircle} 
          color="amber" 
          trend={12} 
        />
        <StatCard 
          label="Critical Threats" 
          value={stats.criticalThreats} 
          subValue="Awaiting enforcement"
          icon={ShieldCheck} 
          color="red" 
          trend={-5} 
        />
        <StatCard 
          label="Projected Revenue" 
          value={`$${(stats.revenueProtected / 1000).toFixed(1)}k`} 
          subValue="Active rev-share"
          icon={TrendingUp} 
          color="emerald" 
          trend={24} 
        />
        <StatCard 
          label="Assets Vaulted" 
          value={stats.assetsInVault} 
          subValue="Digital fingerprints"
          icon={Box} 
          color="blue" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Heartbeat */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Agent Swarm Heartbeat</h3>
              <p className="text-sm text-slate-400">Real-time status of autonomous processing nodes</p>
            </div>
            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Neural Link Active</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div key={agent.name} className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-white/10 transition-all">
                <div className={`p-3 rounded-xl bg-white/5 mb-3 group-hover:scale-110 transition-transform ${agent.active ? 'shadow-[0_0_15px_rgba(59,130,246,0.1)]' : ''}`}>
                  <agent.icon className={`w-6 h-6 ${agent.color}`} />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{agent.name}</h4>
                <span className={`text-[10px] font-medium uppercase tracking-widest ${agent.active ? 'text-blue-400' : 'text-slate-500'}`}>
                  {agent.status}
                </span>
                {agent.active && (
                  <div className="mt-3 w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-500"
                      animate={{ x: [-20, 100] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* System Logs / Feed */}
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex flex-col">
          <h3 className="text-xl font-bold text-white tracking-tight mb-6">Activity Feed</h3>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[340px] pr-2 custom-scrollbar">
            {notifications.slice(0, 8).map((notif) => (
              <div key={notif.id} className={cn(
                "flex gap-3 text-sm border-l-2 pl-4 py-1",
                notif.type === 'threat' ? 'border-red-500/40' : 'border-blue-500/40'
              )}>
                <div className="flex-1">
                  <p className="text-slate-200">
                    <span className={cn("font-bold", notif.type === 'threat' ? 'text-red-400' : 'text-blue-400')}>
                      {notif.title}
                    </span>: {notif.message}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(notif.timestamp).toLocaleTimeString()} • Verified
                  </p>
                </div>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-slate-500 text-xs italic">No activity logs found.</p>}
          </div>
          <button className="mt-6 w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all border border-white/5">
            View All Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default Overview;
