import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { archivistService } from '../../services/api';
import { Plus, Link as LinkIcon, Database, CheckCircle, ExternalLink } from 'lucide-react';

const AssetVault = () => {
  const { assets, refresh } = useDashboard();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!url) return;
    try {
      setLoading(true);
      await archivistService.ingest(url);
      setUrl('');
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Ingestion Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-3xl p-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">Ingest New Content</h2>
          <p className="text-slate-400 mb-6">Enter an official video URL to extract its visual fingerprint and store it in the FAISS vector vault.</p>
          
          <form onSubmit={handleIngest} className="flex gap-3">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="url" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..." 
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                required
              />
            </div>
            <button 
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
              Ingest Asset
            </button>
          </form>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white tracking-tight">Protected Assets</h3>
          <span className="text-sm text-slate-500 font-medium">{assets.length} Assets Vaulted</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <div key={asset._id} className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden group hover:border-white/10 transition-all">
              <div className="aspect-video bg-slate-800 relative overflow-hidden">
                <img src={asset.thumbnail_url || 'https://via.placeholder.com/480x270?text=Processing+Video'} alt={asset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60" />
                <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> PROTECTED
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-white truncate mb-2">{asset.title}</h4>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 uppercase font-bold tracking-wider">Vault ID</span>
                    <span className="text-slate-300 font-mono">{asset.asset_id}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 uppercase font-bold tracking-wider">Fingerprint</span>
                    <span className="text-slate-300 font-mono">SHA-256 Verified</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-slate-300 transition-all border border-white/5 flex items-center justify-center gap-2">
                    <Database className="w-3 h-3" /> View Vectors
                  </button>
                  <a href={asset.original_url} target="_blank" rel="noreferrer" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all">
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssetVault;
