import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import { archivistService } from '../../services/api';
import {
  Plus, Link as LinkIcon, Database, CheckCircle, ExternalLink,
  Loader2, AlertTriangle, Hash, Shield, Layers, Clock, RefreshCw,
} from 'lucide-react';

const STATUS_COLORS = {
  complete:    { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  processing:  { text: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20'    },
  downloading: { text: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20'   },
  failed:      { text: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20'     },
};

const STAGES = ['queued', 'downloading', 'processing', 'complete'];

// ─── Live progress timeline ───────────────────────────────────────────────────
const ProgressTimeline = ({ stage, message }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
    className="mt-5 bg-slate-950/60 border border-blue-500/15 rounded-2xl p-5"
  >
    <div className="flex items-center gap-2 mb-4">
      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Archivist Running</span>
    </div>
    <div className="flex items-center gap-0 mb-4">
      {STAGES.map((s, i) => {
        const idx     = STAGES.indexOf(stage);
        const done    = i < idx;
        const active  = i === idx;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-300 ${
                done   ? 'bg-blue-500 border-blue-500' :
                active ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]' :
                         'bg-slate-900 border-white/10'
              }`}>
                {done
                  ? <CheckCircle className="w-3.5 h-3.5 text-white" />
                  : <div className={`w-2 h-2 rounded-full ${active ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`} />
                }
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-wider ${active ? 'text-blue-400' : done ? 'text-slate-400' : 'text-slate-700'}`}>
                {s}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-px mb-4 transition-all duration-500 ${i < idx ? 'bg-blue-500' : 'bg-white/8'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
    <p className="text-[12px] text-slate-300 leading-relaxed">{message}</p>
  </motion.div>
);

// ─── Asset card ───────────────────────────────────────────────────────────────
const AssetCard = ({ asset }) => {
  const s = STATUS_COLORS[asset.status] || STATUS_COLORS.processing;
  const thumbId = asset.official_video_url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1];
  const thumb   = thumbId ? `https://i.ytimg.com/vi/${thumbId}/mqdefault.jpg` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden group hover:border-white/10 hover:shadow-lg hover:shadow-black/20 transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-slate-800 relative overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={asset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Database className="w-10 h-10 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

        {/* Status badge */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-bold border flex items-center gap-1.5 backdrop-blur-sm ${s.text} ${s.bg} ${s.border}`}>
          {asset.status === 'complete' && <CheckCircle className="w-3 h-3" />}
          {asset.status === 'complete' ? 'PROTECTED' : (asset.status || 'UNKNOWN').toUpperCase()}
        </div>

        {/* Frame count overlay */}
        {asset.frame_count > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
            <Layers className="w-3 h-3 text-blue-400" />
            <span className="text-[9px] font-bold text-white">{asset.frame_count} frames</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h4 className="font-bold text-white truncate mb-1 text-sm">{asset.title || 'Processing...'}</h4>
        <p className="text-[10px] text-slate-500 mb-4 truncate">{asset.official_video_url}</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: 'Vault Vectors', value: asset.vault_size ? `${asset.vault_size}` : '—',         color: 'text-blue-400'    },
            { label: 'Frames',        value: asset.frame_count ? `${asset.frame_count}` : '—',       color: 'text-purple-400'  },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-950/50 rounded-xl p-3 border border-white/5">
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-lg font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Hashes */}
        <div className="space-y-1.5 mb-4">
          {asset.integrity_hash && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 flex items-center gap-1"><Hash className="w-2.5 h-2.5" />Integrity</span>
              <span className="text-teal-400 font-mono">{asset.integrity_hash.slice(0, 16)}…</span>
            </div>
          )}
          {asset.tx_hash && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 flex items-center gap-1">
                <svg viewBox="0 0 38 33" className="w-2.5 h-2.5 fill-violet-400"><path d="M29 10.2L19 4.6 9 10.2v11.2l10 5.6 10-5.6V10.2zM19 0L38 11v11L19 33 0 22V11L19 0z"/></svg>
                Polygon TX
              </span>
              <span className="text-violet-400 font-mono">{asset.tx_hash.slice(0, 16)}…</span>
            </div>
          )}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Ingested</span>
            <span className="text-slate-400">{new Date(asset.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <div className="flex-1 py-2 bg-white/5 rounded-lg text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5 border border-white/5">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400">Fingerprint Active</span>
          </div>
          {asset.official_video_url && (
            <a href={asset.official_video_url} target="_blank" rel="noreferrer"
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all">
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const AssetVault = () => {
  const { assets, refresh } = useDashboard();
  const { eventLog, joinIngest } = useSocket();

  const [url,       setUrl]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [progress,  setProgress]  = useState(null);
  const [activeJob, setActiveJob] = useState(null);

  useEffect(() => {
    if (!activeJob) return;
    const latest = eventLog.find(e =>
      ['ingest:progress', 'ingest:complete', 'ingest:error'].includes(e.type) &&
      e.payload?.jobId === activeJob
    );
    if (!latest) return;

    if (latest.type === 'ingest:progress') {
      setProgress({ stage: latest.payload.stage, message: latest.payload.message });
    } else if (latest.type === 'ingest:complete') {
      setProgress({ stage: 'complete', message: `"${latest.payload.title}" — ${latest.payload.frame_count} frames stored.` });
      setTimeout(() => { setProgress(null); setActiveJob(null); setLoading(false); refresh(); }, 2000);
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

  const totalVectors = assets.reduce((s, a) => s + (a.vault_size || 0), 0);

  return (
    <div className="space-y-8">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Assets Vaulted',  value: assets.length,                          color: 'text-blue-400'    },
          { label: 'Total Vectors',   value: totalVectors > 0 ? totalVectors : '—',  color: 'text-purple-400'  },
          { label: 'Protected',       value: assets.filter(a => a.status === 'complete').length, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Ingest form */}
      <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-3xl p-7">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Ingest Official Content</h2>
            <p className="text-slate-400 text-sm max-w-xl">
              The Archivist downloads via yt-dlp, extracts 1 frame/sec, embeds each through
              CLIP (512-dim), and stores vectors in the FAISS vault with a SHA-256 integrity hash.
            </p>
          </div>
          <button onClick={refresh} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all" title="Refresh">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleIngest} className="flex gap-3">
          <div className="flex-1 relative">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="url" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
              disabled={loading} required
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            type="submit" disabled={loading || !url.trim()}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.25)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Ingest
          </motion.button>
        </form>

        <AnimatePresence>
          {progress && <ProgressTimeline stage={progress.stage} message={progress.message} />}
          {error && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[12px]">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Assets grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-white">Protected Assets</h3>
          <span className="text-sm text-slate-500 font-medium">{assets.length} vaulted</span>
        </div>

        {assets.length === 0 ? (
          <div className="py-24 text-center bg-slate-900/20 border border-dashed border-white/8 rounded-3xl">
            <Database className="w-14 h-14 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-lg mb-1">Vault is empty</p>
            <p className="text-slate-600 text-sm">Ingest an official video above to create the first fingerprint.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assets.map((asset) => <AssetCard key={asset._id} asset={asset} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetVault;
