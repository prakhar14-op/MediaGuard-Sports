import React from 'react';
import { Search, Bell, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';

const Header = ({ title }) => {
  const navigate = useNavigate();
  const { notifications } = useDashboard();
  const unreadCount = notifications.length;
  return (
    <header className="h-16 border-b border-white/5 bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
          <Zap className="w-3 h-3 fill-emerald-500" />
          Live Agent Swarm
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group hidden md:block">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search assets, incidents, hashes..." 
            className="bg-slate-900/50 border border-white/5 text-sm text-slate-200 placeholder-slate-500 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all w-80"
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard/notifications')}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>
          
          <div className="h-8 w-px bg-white/10 mx-1" />
          
          <button className="flex items-center gap-3 pl-1 pr-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-all group">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
              JD
            </div>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white">Admin User</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
