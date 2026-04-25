import React from 'react';
import { Search, Bell, Zap, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';

const G = {
  teal:    '#0d9488',
  tealBg:  'rgba(13,148,136,0.08)',
  tealBdr: 'rgba(13,148,136,0.2)',
  bg:      '#ffffff',
  border:  'rgba(148,163,184,0.15)',
  text:    '#0f172a',
  sub:     '#64748b',
  muted:   '#94a3b8',
};

const Header = ({ title }) => {
  const navigate = useNavigate();
  const { notifications, swarmRunning, swarmPhase } = useDashboard();
  const { isConnected } = useSocket();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header style={{
      height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', position: 'sticky', top: 0, zIndex: 40,
      background: 'rgba(255,255,255,0.95)', borderBottom: `1px solid ${G.border}`,
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <h1 style={{ fontSize: '0.95rem', fontWeight: 700, color: G.text, margin: 0 }}>{title}</h1>
        <div style={{ width: 1, height: 16, background: G.border }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
          borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
          background: swarmRunning ? G.tealBg : '#f1f5f9',
          border: `1px solid ${swarmRunning ? G.tealBdr : G.border}`,
          color: swarmRunning ? G.teal : G.sub,
        }}>
          <Zap size={11} style={{ fill: swarmRunning ? G.teal : 'none', color: swarmRunning ? G.teal : G.muted }} />
          {swarmRunning ? `${swarmPhase?.agent || 'Swarm'} Running` : 'Live Agent Swarm'}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Search */}
        <div style={{ position: 'relative', display: 'none' }} className="md:block">
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: G.muted }} />
          <input
            type="text"
            placeholder="Search assets, incidents..."
            style={{
              fontSize: '0.8rem', borderRadius: 10, paddingLeft: 36, paddingRight: 16, paddingTop: 7, paddingBottom: 7,
              border: `1px solid ${G.border}`, background: '#f8fafc', color: G.text, outline: 'none', width: 260,
            }}
            onFocus={e => e.target.style.borderColor = G.tealBdr}
            onBlur={e => e.target.style.borderColor = G.border}
          />
        </div>

        {/* Socket indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
          borderRadius: 8, fontSize: '0.68rem', fontWeight: 700,
          background: isConnected ? G.tealBg : 'rgba(245,158,11,0.08)',
          border: `1px solid ${isConnected ? G.tealBdr : 'rgba(245,158,11,0.25)'}`,
          color: isConnected ? G.teal : '#f59e0b',
        }}>
          {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
          {isConnected ? 'Live' : 'Offline'}
        </div>

        {/* Bell */}
        <button
          onClick={() => navigate('/dashboard/notifications')}
          style={{
            position: 'relative', padding: 8, borderRadius: 10, border: `1px solid ${G.border}`,
            background: 'transparent', cursor: 'pointer', color: G.sub, display: 'flex', alignItems: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = G.text; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = G.sub; }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 7, height: 7, borderRadius: '50%', background: '#ef4444',
              boxShadow: '0 0 0 2px #fff',
            }} />
          )}
        </button>

        {/* Avatar */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 5px',
          borderRadius: 999, border: `1px solid ${G.border}`, background: 'transparent', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${G.teal}, #2dd4bf)`,
            fontSize: '0.65rem', fontWeight: 800, color: '#fff',
          }}>MG</div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: G.text }}>Admin</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
