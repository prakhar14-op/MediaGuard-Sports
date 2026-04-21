import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { Bell, AlertTriangle, Shield, Zap, Clock, CheckCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const Notifications = () => {
  const { notifications } = useDashboard();

  const getIcon = (type) => {
    switch (type) {
      case 'threat': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'agent': return <Zap className="w-5 h-5 text-blue-400" />;
      default: return <Info className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'threat': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'agent': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Intelligence Logs</h2>
          <p className="text-sm text-slate-400">Historical feed of swarm detections and agent maneuvers.</p>
        </div>
        <div className="px-4 py-2 bg-slate-900/40 border border-white/5 rounded-xl text-xs font-bold text-slate-500 uppercase tracking-widest">
          {notifications.length} Total Events
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {notifications.map((notif, i) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group"
          >
            <div className="flex gap-5">
              <div className={cn("p-3 rounded-xl shrink-0 h-fit", getBadgeStyle(notif.type))}>
                {getIcon(notif.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-white tracking-tight">{notif.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-3">{notif.message}</p>
                <div className="flex items-center gap-4">
                  <span className={cn("text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest", getBadgeStyle(notif.type))}>
                    {notif.type}
                  </span>
                  {notif.severity && (
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
                      <Shield className="w-3 h-3" /> {notif.severity} Severity
                    </span>
                  )}
                </div>
              </div>
              <button className="self-center opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 text-xs font-bold uppercase tracking-widest">
                Details
              </button>
            </div>
          </motion.div>
        ))}

        {notifications.length === 0 && (
          <div className="py-32 text-center bg-slate-900/20 border border-dashed border-white/10 rounded-[3rem]">
            <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-medium tracking-wide">No swarm activity logged in this session.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
