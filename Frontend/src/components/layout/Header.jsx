import React from 'react';
import { Search, Bell, Zap, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';

const Header = ({ title }) => {
  const navigate = useNavigate();
  const { notifications, swarmRunning, swarmPhase } = useDashboard();
  const { isConnected } = useSocket();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header
      className="h-16 flex items-center justify-between px-6 sticky top-0 z-40"
      style={{
        background: 'rgba(12,13,18,0.92)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-4">
        <h1 className="text-[15px] font-bold text-white tracking-tight">{title}</h1>
        <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Live status pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: swarmRunning ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
            border: swarmRunning ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.06)',
            color: swarmRunning ? '#10b981' : '#475569',
          }}>
          <Zap className="w-3 h-3" style={{ fill: swarmRunning ? '#10b981' : 'none' }} />
          {swarmRunning ? `${swarmPhase?.agent || 'Swarm'} Running` : 'Live Agent Swarm'}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: '#334155' }} />
          <input
            type="text"
            placeholder="Search assets, incidents..."
            className="text-sm rounded-xl pl-10 pr-4 py-2 focus:outline-none transition-all w-72"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#e2e8f0',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.4)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          />
        </div>

        {/* Socket indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold"
          style={{
            background: isConnected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: isConnected ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
            color: isConnected ? '#10b981' : '#ef4444',
          }}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isConnected ? 'Live' : 'Offline'}
        </div>

        {/* Notifications */}
        <button
          onClick={() => navigate('/dashboard/notifications')}
          className="relative p-2 rounded-xl transition-colors"
          style={{ color: '#64748b' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: '#ef4444' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#ef4444' }} />
            </span>
          )}
        </button>

        {/* Avatar */}
        <button className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            MG
          </div>
          <span className="text-sm font-medium text-white">Admin</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
