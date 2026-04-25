import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Database, Search,
  ShieldAlert, Gavel, Coins, Bell, Settings, HelpCircle, Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';

const navItems = [
  { id: 'overview',      label: 'Overview',     icon: LayoutDashboard, color: '#10b981', path: '/dashboard/overview'      },
  { id: 'vault',         label: 'Asset Vault',  icon: Database,        color: '#6366f1', path: '/dashboard/vault'         },
  { id: 'hunter',        label: 'Threat Hunter',icon: Search,          color: '#f59e0b', path: '/dashboard/hunter'        },
  { id: 'incidents',     label: 'Incidents',    icon: ShieldAlert,     color: '#f97316', path: '/dashboard/incidents'     },
  { id: 'enforcer',      label: 'Enforcement',  icon: Gavel,           color: '#ef4444', path: '/dashboard/enforcer'      },
  { id: 'broker',        label: 'Monetization', icon: Coins,           color: '#10b981', path: '/dashboard/broker'        },
  { id: 'notifications', label: 'Swarm Logs',   icon: Bell,            color: '#a855f7', path: '/dashboard/notifications' },
];

const Sidebar = () => {
  const { swarmRunning, swarmPhase, backendOnline } = useDashboard();
  const { isConnected } = useSocket();

  return (
    <aside
      className="w-64 flex flex-col h-screen sticky top-0 shrink-0"
      style={{
        background: 'oklch(0.12 0 0)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <Shield className="w-5 h-5" style={{ color: '#10b981' }} />
          </div>
          <div>
            <span className="text-[15px] font-bold text-white tracking-tight">MediaGuard</span>
            <p className="text-[10px] font-medium" style={{ color: '#475569' }}>AI Control Center</p>
          </div>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-3 text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: '#334155' }}>
          Swarm Command
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
              isActive
                ? 'text-white'
                : 'hover:text-white'
            )}
            style={({ isActive }) => isActive ? {
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: '#fff',
            } : {
              color: '#64748b',
              border: '1px solid transparent',
            }}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className="w-4 h-4 transition-colors shrink-0"
                  style={{ color: isActive ? item.color : '#475569' }}
                />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status footer */}
      <div className="p-4 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Swarm status */}
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('w-2 h-2 rounded-full', swarmRunning ? 'animate-pulse' : '')}
              style={{ background: swarmRunning ? '#10b981' : backendOnline ? '#10b981' : '#ef4444' }} />
            <span className="text-[11px] font-semibold text-white">
              {swarmRunning ? `${swarmPhase?.agent || 'Swarm'} Active` : backendOnline ? 'System Online' : 'Backend Offline'}
            </span>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'ML Nodes',  ok: backendOnline },
              { label: 'Socket.io', ok: isConnected   },
            ].map(({ label, ok }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#334155' }}>{label}</span>
                <span className="text-[9px] font-bold" style={{ color: ok ? '#10b981' : '#ef4444' }}>
                  {ok ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
            <div className="h-1.5 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: backendOnline ? '92%' : '0%', background: 'linear-gradient(to right, #10b981, #059669)' }} />
            </div>
          </div>
        </div>

        {/* Bottom links */}
        <div className="flex flex-col gap-0.5">
          {[
            { icon: Settings,    label: 'Settings' },
            { icon: HelpCircle,  label: 'Support'  },
          ].map(({ icon: Icon, label }) => (
            <button key={label}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors hover:text-white"
              style={{ color: '#475569' }}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
