import React from 'react';
import StatCard from '../shared/StatCard';
import {
  ShieldCheck, AlertCircle, TrendingUp, Box,
  Cpu, Globe, Lock, Zap, Wifi, WifiOff, Play,
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const AGENTS = [
  { name: 'Archivist',   icon: Lock,       color: 'text-blue-400',    desc: 'CLIP + FAISS vault'       },
  { name: 'Spider',      icon: Zap,         color: 'text-indigo-400',  desc: 'OSINT crawler'            },
  { name: 'Sentinel',    icon: Globe,       color: 'text-amber-400',   desc: 'pHash + CLIP scan'        },
  { name: 'Adjudicator', icon: Cpu,         color: 'text-purple-400',  desc: 'Gemini 2.5 Flash triage'  },
  { name: 'Enforcer',    icon: ShieldCheck, color: 'text-red-400',     desc: '17 U.S.C. § 512(c)'       },
  { name: 'Broker',      icon: TrendingUp,  color: 'text-emerald-400', desc: 'Polygon rev-share'        },
];

const Overview = () => {
  const { stats, notifications, backendOnline, swarmRunning, swarmPhase } = useDashboard();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  // Determine which agent is currently active
  const activeAgent = swarmPhase?.agent || null;

  return (
    <div className="space-y-8">

      {/* Status banner */}
      <div className={cn(
        'flex items-center justify-between px-5 py-3 rounded-2xl border text-sm',
        backendOnline
          ? 'bg-emerald-500/5 border-emerald-500/15'
          : 'bg-amber-500/5 border-amber-500/15'
      )}>
        <div className="flex items-center gap-3">
          {backendOnline
            ? <Wifi className="w-4 h-4 text-emerald-400" />
            : <WifiOff className="w-4 h-4 text-amber-400" />
          }
          <span className={backendOnline ? 'text-emerald-300' : 'text-amber-300'}>
            {backendOnline
              ? isConnected ? 'Backend online · Socket.io connected · Real-time updates active' : 'Backend online · Socket.io connecting…'
              : 'Backend offline — showing mock data. Start the Node.js server on port 8000.'
            }
          </span>
        </div>
        {!swarmRunning && (
          <button
            onClick={() => navigate('/dashboard/hunter')}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500/15 border border-blue-500/25 rounded-full text-[11px] font-bold text-blue-400 hover:bg-blue-500/25 transition-colors"
          >
            <Play className="w-3 h-3" /> Launch Swarm
          </button>
        )}
        {swarmRunning && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/15 border border-blue-500/25 rounded-full">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              {swarmPhase?.agent || 'Swarm'} running…
            </span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Detections"
          value={stats.totalDetections}
          subValue="Across 7 platforms"
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          label="Critical Threats"
          value={stats.criticalThreats}
          subValue="Awaiting enforcement"
          icon={ShieldCheck}
          color="red"
        />
        <StatCard
          label="Monthly Revenue"
          value={stats.revenueProtected > 0 ? `$${stats.revenueProtected.toFixed(0)}` : '$0'}
          subValue="Active rev-share contracts"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          label="Assets Vaulted"
          value={stats.assetsInVault}
          subValue="FAISS fingerprints"
          icon={Box}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Agent heartbeat */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Agent Swarm Heartbeat</h3>
              <p className="text-sm text-slate-400">Autonomous processing nodes</p>
            </div>
            <div className={cn(
              'px-3 py-1 rounded-full flex items-center gap-2 border',
              swarmRunning
                ? 'bg-blue-500/10 border-blue-500/20'
                : 'bg-slate-800/60 border-white/5'
            )}>
              <span className={cn('w-2 h-2 rounded-full', swarmRunning ? 'bg-blue-400 animate-pulse' : 'bg-slate-600')} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {swarmRunning ? `${activeAgent || 'Swarm'} Active` : 'Standby'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {AGENTS.map((agent) => {
              const isActive = swarmRunning && activeAgent === agent.name;
              return (
                <div key={agent.name}
                  className={cn(
                    'bg-slate-950/50 border rounded-2xl p-4 flex flex-col items-center text-center group transition-all',
                    isActive ? 'border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.08)]' : 'border-white/5 hover:border-white/10'
                  )}>
                  <div className={cn('p-3 rounded-xl bg-white/5 mb-3 transition-transform group-hover:scale-110', isActive && 'shadow-[0_0_15px_rgba(59,130,246,0.15)]')}>
                    <agent.icon className={cn('w-6 h-6', agent.color)} />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-0.5">{agent.name}</h4>
                  <span className={cn('text-[9px] font-medium uppercase tracking-widest mb-2', isActive ? 'text-blue-400' : 'text-slate-600')}>
                    {isActive ? 'Running' : 'Standby'}
                  </span>
                  <p className="text-[9px] text-slate-600">{agent.desc}</p>
                  {isActive && (
                    <div className="mt-3 w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex flex-col">
          <h3 className="text-xl font-bold text-white tracking-tight mb-5">Activity Feed</h3>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[340px] pr-1 custom-scrollbar">
            {notifications.slice(0, 12).map((notif) => (
              <div key={notif.id}
                className={cn(
                  'flex gap-3 text-sm border-l-2 pl-3 py-1',
                  notif.type === 'threat'   ? 'border-red-500/40' :
                  notif.type === 'success'  ? 'border-emerald-500/40' :
                                              'border-blue-500/40'
                )}>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-[12px] leading-snug">
                    <span className={cn(
                      'font-bold',
                      notif.type === 'threat'  ? 'text-red-400' :
                      notif.type === 'success' ? 'text-emerald-400' :
                                                 'text-blue-400'
                    )}>
                      {notif.title}
                    </span>
                    {': '}{notif.message}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-slate-600 text-xs italic">No activity yet. Launch a swarm to see live events.</p>
            )}
          </div>
          <button
            onClick={() => navigate('/dashboard/notifications')}
            className="mt-5 w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all border border-white/5"
          >
            View All Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default Overview;
