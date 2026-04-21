import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Shield, 
  LayoutDashboard, 
  Database, 
  Search, 
  ShieldAlert, 
  Gavel, 
  Coins, 
  Activity,
  Settings,
  HelpCircle,
  Bell
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'text-blue-400', path: '/dashboard/overview' },
  { id: 'vault', label: 'Asset Vault', icon: Database, color: 'text-indigo-400', path: '/dashboard/vault' },
  { id: 'hunter', label: 'Threat Hunter', icon: Search, color: 'text-amber-400', path: '/dashboard/hunter' },
  { id: 'incidents', label: 'Incidents', icon: ShieldAlert, color: 'text-orange-400', path: '/dashboard/incidents' },
  { id: 'enforcer', label: 'Enforcement', icon: Gavel, color: 'text-red-400', path: '/dashboard/enforcer' },
  { id: 'broker', label: 'Monetization', icon: Coins, color: 'text-emerald-400', path: '/dashboard/broker' },
  { id: 'notifications', label: 'Swarm Logs', icon: Bell, color: 'text-purple-400', path: '/dashboard/notifications' },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-slate-950 border-r border-white/5 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-6">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:border-blue-500/40 transition-colors">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">MediaGuard</span>
        </NavLink>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        <div className="px-3 mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Swarm Command</span>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
              isActive 
                ? "bg-blue-500/10 text-white border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? item.color : "text-slate-500 group-hover:text-slate-400")} />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-white/5">
        <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">System Healthy</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              <span>ML Nodes</span>
              <span className="text-emerald-400">Online</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[92%]" />
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex flex-col gap-1">
          <button className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-colors text-sm">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-colors text-sm">
            <HelpCircle className="w-4 h-4" /> Support
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
