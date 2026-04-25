import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Database, Search,
  ShieldAlert, Gavel, Coins, Bell, Settings, HelpCircle, Zap,
} from 'lucide-react';
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

const navItems = [
  { id: 'overview',      label: 'Overview',      icon: LayoutDashboard, color: '#0d9488', path: '/dashboard/overview'      },
  { id: 'vault',         label: 'Asset Vault',   icon: Database,        color: '#6366f1', path: '/dashboard/vault'         },
  { id: 'hunter',        label: 'Threat Hunter', icon: Search,          color: '#f59e0b', path: '/dashboard/hunter'        },
  { id: 'incidents',     label: 'Incidents',     icon: ShieldAlert,     color: '#f97316', path: '/dashboard/incidents'     },
  { id: 'enforcer',      label: 'Enforcement',   icon: Gavel,           color: '#ef4444', path: '/dashboard/enforcer'      },
  { id: 'broker',        label: 'Monetization',  icon: Coins,           color: '#0d9488', path: '/dashboard/broker'        },
  { id: 'notifications', label: 'Swarm Logs',    icon: Bell,            color: '#a855f7', path: '/dashboard/notifications' },
];

const Sidebar = () => {
  const { swarmRunning, swarmPhase, backendOnline } = useDashboard();
  const { isConnected } = useSocket();

  return (
    <aside style={{
      width: 256, display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0, flexShrink: 0,
      background: G.bg, borderRight: `1px solid ${G.border}`,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${G.border}` }}>
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: G.tealBg, border: `1px solid ${G.tealBdr}`,
          }}>
            <Shield size={18} style={{ color: G.teal }} />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 800, color: G.text, margin: 0, lineHeight: 1 }}>MediaGuard</p>
            <p style={{ fontSize: '0.65rem', color: G.sub, margin: '2px 0 0' }}>AI Control Center</p>
          </div>
        </NavLink>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: G.muted, padding: '0 10px', marginBottom: 8 }}>
          Swarm Command
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10, marginBottom: 2,
              textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600,
              transition: 'all 0.15s',
              background: isActive ? `${item.color}10` : 'transparent',
              border: isActive ? `1px solid ${item.color}25` : '1px solid transparent',
              color: isActive ? item.color : G.sub,
            })}
          >
            {({ isActive }) => (
              <>
                <item.icon size={16} style={{ color: isActive ? item.color : G.muted, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status footer */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${G.border}` }}>
        <div style={{
          borderRadius: 12, padding: '12px 14px', marginBottom: 8,
          background: '#f8fafc', border: `1px solid ${G.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: swarmRunning ? G.teal : backendOnline ? G.teal : '#ef4444',
              animation: swarmRunning ? 'pulse 1s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: G.text }}>
              {swarmRunning ? `${swarmPhase?.agent || 'Swarm'} Active` : backendOnline ? 'System Online' : 'Backend Offline'}
            </span>
          </div>
          {[
            { label: 'ML Nodes',  ok: backendOnline },
            { label: 'Socket.io', ok: isConnected   },
          ].map(({ label, ok }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: G.muted }}>{label}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: ok ? G.teal : '#ef4444' }}>{ok ? 'Online' : 'Offline'}</span>
            </div>
          ))}
          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
            <div style={{
              height: '100%', borderRadius: 99, transition: 'width 0.5s',
              width: backendOnline ? '92%' : '0%',
              background: `linear-gradient(to right, ${G.teal}, #2dd4bf)`,
            }} />
          </div>
        </div>

        {[
          { icon: Settings,   label: 'Settings' },
          { icon: HelpCircle, label: 'Support'  },
        ].map(({ icon: Icon, label }) => (
          <button key={label} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent',
            fontSize: '0.8rem', color: G.sub, cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = G.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = G.sub; }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </aside>
  );
};

export default Sidebar;
