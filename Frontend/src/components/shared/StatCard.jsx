import React from 'react';
import { cn } from '../../lib/utils';

const StatCard = ({ label, value, subValue, icon: Icon, color, trend }) => {
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group overflow-hidden relative">
      {/* Decorative gradient */}
      <div className={cn(
        "absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500",
        color === 'blue' && "bg-blue-500",
        color === 'emerald' && "bg-emerald-500",
        color === 'amber' && "bg-amber-500",
        color === 'red' && "bg-red-500"
      )} />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
            {trend && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                trend > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              )}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
        <div className={cn(
          "p-2.5 rounded-xl border transition-colors",
          color === 'blue' && "bg-blue-500/10 border-blue-500/20 text-blue-400",
          color === 'emerald' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
          color === 'amber' && "bg-amber-500/10 border-amber-500/20 text-amber-400",
          color === 'red' && "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
