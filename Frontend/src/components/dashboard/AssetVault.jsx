import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import { archivistService } from '../../services/api';
import { Plus, Link as LinkIcon, Database, CheckCircle, ExternalLink, Loader2, AlertTriangle, Hash } from 'lucide-react';

const STATUS_COLORS = {
  complete:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  processing:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  downloading: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  failed:      'text-red-400 bg-red-400/10 border-red-400/20',
};

const AssetVault = () => {
  const { assets, refresh, joinIngest, addNotification } = useDashboard();
  const { eventLog } = useSocket();

  const [url,       setUrl]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [progress,  setProgress]  = useState(null); // { stage, message }
  const [activeJob, setActiveJob] = useState(null);

  // Listen for ingest events for the active job
  useEffect(() => {
    if (!activeJob) return;
    const latest = eventLog.find(e =>
      (e.type === 'ingest:progress' || e.type === 'ingest:complete' || e.type === 'ingest:error')
      && e.payload?.jobId === activeJob
    );
    if (!latest) return;

    if (latest.type === 'ingest:progress') {
      setProgress({ stage: latest.payload.stage, message: latest.payload.message });
    } else if (latest.type === 'ingest:complete') {
      setProgress(null);
      setActiveJob(null);
      setLoading(false);
      refresh();
    } else if (latest.type === 'ingest:error') {
      setError(latest.payload.message);
      setProgress(null);
      setActiveJob(null);
      setLoading(false);
    }
  }, [eventLog, activeJob, refresh]);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setProgress({ stage: 'queued', message: 'Starting ingest job...' });
    setLoading(true);

    try {
      const res = await archivistService.ingest(url.trim());
      const { jobId } = res.data;
      setActiveJob(jobId);
      joinIngest(jobId);
      setUrl('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Ingest failed. Is the backend running?');
      setProgress(null);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Ingest form */}
      <div className="bg-gradient-to-r from-blue-600/15 to-indigo-600/15 border border-blue-500/20 rounded-3xl p-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-1">Ingest Official Content</h2>
          <p className="text-slate-400 text-sm mb-6">
            Paste an official video URL. The Archivist downloads it via yt-dlp, extracts 1 frame/sec,
            embeds each through CLIP, and stores 512-dim vectors in the FAISS vault.
          </p>

          <form onSubmit={handleIngest} className="flex gap-3">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                disabled={loading}
                required
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Ingest
            </motion.button>
          </form>

          {/* Progress */}
          <AnimatePresence>
            {progress && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">{progress.stage}</p>
                  <p className="text-[12px] text-slate-300">{progress.message}</p>
                </div>
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[12px]">
                <AlertTriangle className="w-4 h-4 shrink-0" />{error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Assets grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Protected Assets</h3>
          <span className="text-sm text-slate-500">{assets.length} vaulted</span>
        </div>

        {assets.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/20 border border-dashed border-white/10 rounded-3xl">
            <Database className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No assets vaulted yet.</p>
            <p className="text-slate-600 text-sm mt-1">Ingest an official video to create the first fingerprint.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => (
              <motion.div
                key={asset._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden group hover:border-white/10 transition-all"
              >
                <div className="aspect-video bg-slate-800 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <Database className="w-10 h-10 text-slate-700" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60" />
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1 ${STATUS_COLORS[asset.status] || STATUS_COLORS.processing}`}>
                    {asset.status === 'complete' && <CheckCircle className="w-3 h-3" />}
                    {asset.status === 'complete' ? 'PROTECTED' : asset.status?.toUpperCase()}
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="font-bold text-white truncate mb-3">{asset.title || 'Processing...'}</h4>
                  <div className="space-y-2 mb-4">
                    {[
                      ['Frames',     asset.frame_count ? `${asset.frame_count} extracted` : '—'],
                      ['Vault Size', asset.vault_size  ? `${asset.vault_size} vectors`    : '—'],
                      ['Status',     asset.status || 'unknown'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[10px]">
                        <span className="text-slate-500 uppercase font-bold tracking-wider">{k}</span>
                        <span className="text-slate-300 font-mono">{v}</span>
                      </div>
                    ))}
                    {asset.integrity_hash && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                          <Hash className="w-2.5 h-2.5" />Hash
                        </span>
                        <span className="text-teal-400 font-mono">{asset.integrity_hash.slice(0, 14)}…</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-slate-300 transition-all border border-white/5 flex items-center justify-center gap-1.5">
                      <Database className="w-3 h-3" /> View Vectors
                    </button>
                    {asset.official_video_url && (
                      <a href={asset.official_video_url} target="_blank" rel="noreferrer"
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all">
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetVault;
