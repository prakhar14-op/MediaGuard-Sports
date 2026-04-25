import React from 'react';

const COLOR_MAP = {
  blue:    { text: '#6366f1', bg: 'rgba(99,102,241,0.1)',   border: 'rgba(99,102,241,0.2)'  },
  emerald: { text: '#10b981', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.2)'  },
  amber:   { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.2)'  },
  red:     { text: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.2)'   },
  purple:  { text: '#a855f7', bg: 'rgba(168,85,247,0.1)',   border: 'rgba(168,85,247,0.2)'  },
};

const StatCard = ({ label, value, subValue, icon: Icon, color = 'emerald', trend }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.emerald;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'oklch(0.17 0 0)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      {/* Subtle glow */}
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: c.text }} />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#475569' }}>
            {label}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
            {trend !== undefined && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                style={{
                  background: trend > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  color: trend > 0 ? '#10b981' : '#ef4444',
                }}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          {subValue && (
            <p className="text-[11px] mt-1" style={{ color: '#475569' }}>{subValue}</p>
          )}
        </div>
        <div className="p-2.5 rounded-xl border transition-colors"
          style={{ background: c.bg, borderColor: c.border }}>
          <Icon className="w-5 h-5" style={{ color: c.text }} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
