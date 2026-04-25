import React from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { Bell, AlertTriangle, Zap, CheckCircle, Info, Clock, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const TYPE_CONFIG = {
  threat:  { icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',     badge: 'bg-red-500/10 text-red-400 border-red-500/20'     },
  agent:   { icon: Zap,           color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20'   },
  success: { icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  default: { icon: Info,          color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20',  badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

const Notifications = () => {
  const { notifications, backendOnline } = useDashboard();
  const { isConnected } = useSocket();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Intelligence Logs</h2>
          <p className="text-sm text-slate-400 mt-0.5">Real-time feed of swarm detections and agent actions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${
            isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Socket Live' : 'Disconnected'}
          </div>
          <div className="px-3 py-1.5 bg-slate-900/40 border border-white/5 rounded-xl text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            {notifications.length} Events
          </div>
        </div>
      </div>

      {/* Backend status banner */}
      {!backendOnline && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Backend offline — showing mock data. Start the Node.js server on port 8000.</span>
        </div>
      )}

      {/* Event list */}
      <div className="space-y-3">
        {notifications.map((notif, i) => {
          const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.default;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group"
            >
              <div className="flex gap-4">
                <div className={`p-2.5 rounded-xl border shrink-0 h-fit ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-bold text-white text-sm truncate">{notif.title}</h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <p className="text-[13px] text-slate-400 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${cfg.badge}`}>
                      {notif.type}
                    </span>
                    {notif.severity && (
                      <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                        {notif.severity}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {notifications.length === 0 && (
          <div className="py-32 text-center bg-slate-900/20 border border-dashed border-white/10 rounded-3xl">
            <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No activity logged yet.</p>
            <p className="text-slate-600 text-sm mt-1">Launch a swarm to see live agent events here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
