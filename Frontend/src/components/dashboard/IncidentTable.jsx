import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { cn } from '../../lib/utils';
import { 
  ExternalLink, 
  ShieldAlert, 
  MoreHorizontal, 
  Search,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

const IncidentTable = () => {
  const { incidents, loading } = useDashboard();

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'WARNING': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'INFO': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'detected': return <Search className="w-3 h-3" />;
      case 'reviewing': return <Clock className="w-3 h-3" />;
      case 'takedown_sent': return <ShieldAlert className="w-3 h-3" />;
      case 'monetized': return <CheckCircle className="w-3 h-3 text-emerald-400" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xl font-bold text-white tracking-tight">Detection Intelligence</h3>
        <div className="flex gap-2">
          <select className="bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
            <option>All Platforms</option>
            <option>YouTube</option>
            <option>TikTok</option>
            <option>Twitter</option>
          </select>
          <select className="bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
            <option>All Severities</option>
            <option>CRITICAL</option>
            <option>WARNING</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="px-6 py-4">Threat Node</th>
              <th className="px-6 py-4">Platform</th>
              <th className="px-6 py-4">Confidence</th>
              <th className="px-6 py-4">Severity</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {incidents.map((incident) => (
              <tr key={incident._id} className="group hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-white/5">
                      <img src={incident.thumbnail_url} alt={incident.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate max-w-[240px]">{incident.title}</p>
                      <p className="text-xs text-slate-500 truncate">@{incident.account_handle || 'anonymous'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-300">
                  {incident.platform}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full",
                          incident.confidence_score > 90 ? "bg-emerald-500" : 
                          incident.confidence_score > 70 ? "bg-blue-500" : "bg-amber-500"
                        )} 
                        style={{ width: `${incident.confidence_score}%` }} 
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{incident.confidence_score}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", getSeverityColor(incident.severity))}>
                    {incident.severity}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <div className={cn("p-1 rounded-md bg-white/5 border border-white/10", incident.status === 'monetized' ? 'text-emerald-400' : 'text-slate-400')}>
                      {getStatusIcon(incident.status)}
                    </div>
                    <span className="capitalize">{incident.status.replace('_', ' ')}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={incident.url} target="_blank" rel="noreferrer" className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/5 transition-all">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                    <button className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md border border-white/5 transition-all">
                      <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {incidents.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-500 text-sm italic">
                  No incidents detected. System monitoring all nodes...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncidentTable;
