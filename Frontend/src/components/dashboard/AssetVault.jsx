import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import { archivistService } from '../../services/api';
import {
  Plus, Link as LinkIcon, Database, CheckCircle, ExternalLink,
  Loader2, AlertTriangle, Hash, Shield, Layers, Clock, RefreshCw, Trash2, X,
} from 'lucide-react';

const G = {
  teal:    '#0d9488',
  tealBg:  'rgba(13,148,136,0.08)',
  tealBdr: 'rgba(13,148,136,0.2)',
  card:    '#ffffff',
  bg:      '#f6f7fc',
  border:  'rgba(148,163,184,0.2)',
  text:    '#0f172a',
  sub:     '#64748b',
  muted:   '#94a3b8',
};

const STATUS_CFG = {
  complete:    { color: G.teal,    bg: G.tealBg,                  border: G.tealBdr,                  label: 'PROTECTED'   },
  processing:  { color: '#6366f1', bg: 'rgba(99,102,241,0.08)',   border: 'rgba(99,102,241,0.2)',      label: 'PROCESSING'  },
  downloading: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.2)',      label: 'DOWNLOADING' },
  failed:      { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.2)',       label: 'FAILED'      },
};

const STAGES = ['queued', 'downloading', 'processing', 'complete'];

// ─── Progress timeline ────────────────────────────────────────────────────────
const ProgressTimeline = ({ stage, message }) => {
  const idx = STAGES.indexOf(stage);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        marginTop: 16, background: '#f8fafc', borderRadius: 14,
        border: `1px solid ${G.tealBdr}`, padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Loader2 size={14} style={{ color: G.teal, animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: G.teal, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Archivist Running
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12 }}>
        {STAGES.map((s, i) => {
          const done   = i < idx;
          const active = i === idx;
          return (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? G.teal : active ? G.tealBg : '#e2e8f0',
                  border: `2px solid ${done || active ? G.teal : G.border}`,
                  boxShadow: active ? `0 0 10px ${G.teal}30` : 'none',
                  transition: 'all 0.3s',
                }}>
                  {done
                    ? <CheckCircle size={13} style={{ color: '#fff' }} />
                    : <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? G.teal : G.muted, animation: active ? 'pulse 1s ease-in-out infinite' : 'none' }} />
                  }
                </div>
                <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: active ? G.teal : done ? G.sub : G.muted }}>
                  {s}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ flex: 1, height: 2, marginBottom: 16, background: i < idx ? G.teal : G.border, borderRadius: 99, transition: 'background 0.5s' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: G.sub, margin: 0 }}>{message}</p>
    </motion.div>
  );
};

// ─── Delete confirmation dialog ───────────────────────────────────────────────
const DeleteConfirm = ({ asset, onConfirm, onCancel, deleting }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
      onClick={e => e.stopPropagation()}
      style={{
        background: '#fff', borderRadius: 20, padding: '28px 28px 24px',
        maxWidth: 400, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        border: '1px solid rgba(148,163,184,0.2)',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: 16,
      }}>
        <Trash2 size={22} style={{ color: '#ef4444' }} />
      </div>

      <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
        Delete from Vault?
      </p>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 6px', lineHeight: 1.5 }}>
        <strong style={{ color: '#0f172a' }}>{asset.title || 'This asset'}</strong> will be permanently removed from the vault.
      </p>
      <p style={{
        fontSize: 11, color: '#ef4444', margin: '0 0 22px', padding: '8px 12px',
        background: 'rgba(239,68,68,0.06)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)',
      }}>
        ⚠️ This also deletes the downloaded video file and its FAISS vectors. Any active swarm using this fingerprint will lose its reference.
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} disabled={deleting}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)',
            background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b',
          }}>
          Cancel
        </button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onConfirm} disabled={deleting}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
            background: deleting ? '#e2e8f0' : 'linear-gradient(135deg, #ef4444, #f87171)',
            cursor: deleting ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700, color: deleting ? '#94a3b8' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: deleting ? 'none' : '0 0 20px rgba(239,68,68,0.25)',
          }}>
          {deleting
            ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Deleting…</>
            : <><Trash2 size={13} /> Delete</>
          }
        </motion.button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Asset card ───────────────────────────────────────────────────────────────
const AssetCard = ({ asset, onDelete }) => {
  const s = STATUS_CFG[asset.status] || STATUS_CFG.processing;
  const thumbId = asset.official_video_url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1];
  const thumb   = thumbId ? `https://i.ytimg.com/vi/${thumbId}/mqdefault.jpg` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.10)' }}
      style={{
        background: G.card, borderRadius: 18, overflow: 'hidden',
        border: `1px solid ${G.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.25s',
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#e2e8f0', overflow: 'hidden' }}>
        {thumb ? (
          <img src={thumb} alt={asset.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={28} style={{ color: G.muted }} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />

        {/* Status badge */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
          borderRadius: 999, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          border: `1px solid ${s.border}`, fontSize: 9, fontWeight: 800, color: s.color,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {asset.status === 'complete' && <CheckCircle size={9} />}
          {s.label}
        </div>

        {/* Frame count */}
        {asset.frame_count > 0 && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
            borderRadius: 999, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
            fontSize: 9, fontWeight: 700, color: G.text,
          }}>
            <Layers size={9} style={{ color: '#6366f1' }} />
            {asset.frame_count} frames
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: G.text, margin: '0 0 2px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {asset.title || 'Processing…'}
        </p>
        <p style={{ fontSize: 10, color: G.muted, margin: '0 0 12px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {asset.official_video_url}
        </p>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Vault Vectors', value: asset.vault_size ? `${asset.vault_size}` : '—', color: '#6366f1' },
            { label: 'Frames',        value: asset.frame_count ? `${asset.frame_count}` : '—', color: '#a855f7' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#f8fafc', borderRadius: 10, padding: '10px 12px',
              border: `1px solid ${G.border}`,
            }}>
              <p style={{ fontSize: 8, fontWeight: 700, color: G.muted, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: 18, fontWeight: 900, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Hashes */}
        <div style={{ marginBottom: 12 }}>
          {asset.integrity_hash && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: G.sub, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Hash size={10} /> Integrity
              </span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: G.teal }}>{asset.integrity_hash.slice(0, 16)}…</span>
            </div>
          )}
          {asset.tx_hash && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: G.sub, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg viewBox="0 0 38 33" style={{ width: 10, height: 10, fill: '#a855f7' }}><path d="M29 10.2L19 4.6 9 10.2v11.2l10 5.6 10-5.6V10.2zM19 0L38 11v11L19 33 0 22V11L19 0z"/></svg>
                Polygon TX
              </span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#a855f7' }}>{asset.tx_hash.slice(0, 16)}…</span>
            </div>
          )}
          {asset.createdAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: G.sub, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} /> Ingested
              </span>
              <span style={{ fontSize: 10, color: G.muted }}>{new Date(asset.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${G.border}`, paddingTop: 12 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '7px 0', borderRadius: 9, background: G.tealBg, border: `1px solid ${G.tealBdr}`,
            fontSize: 10, fontWeight: 700, color: G.teal,
          }}>
            <Shield size={11} /> Fingerprint Active
          </div>
          {asset.official_video_url && (
            <a href={asset.official_video_url} target="_blank" rel="noreferrer"
              style={{
                padding: '7px 10px', borderRadius: 9, border: `1px solid ${G.border}`,
                background: 'transparent', display: 'flex', alignItems: 'center',
              }}>
              <ExternalLink size={13} style={{ color: G.sub }} />
            </a>
          )}
          {/* Delete button */}
          <motion.button
            whileHover={{ scale: 1.05, background: 'rgba(239,68,68,0.08)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDelete(asset)}
            title="Delete from vault"
            style={{
              padding: '7px 10px', borderRadius: 9,
              border: '1px solid rgba(239,68,68,0.2)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', transition: 'all 0.15s',
            }}>
            <Trash2 size={13} style={{ color: '#ef4444' }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const AssetVault = () => {
  const { assets, refresh } = useDashboard();
  const { eventLog, joinIngest } = useSocket();

  const [url,           setUrl]           = useState('');
  const [title,         setTitle]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [progress,      setProgress]      = useState(null);
  const [activeJob,     setActiveJob]     = useState(null);
  const [activeAssetId, setActiveAssetId] = useState(null);

  // Delete state
  const [deleteTarget,  setDeleteTarget]  = useState(null);  // asset object to confirm
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState('');

  const handleDeleteClick = (asset) => {
    setDeleteTarget(asset);
    setDeleteError('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await archivistService.delete(deleteTarget._id);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!activeJob) return;
    // Match by jobId OR assetId — backend now broadcasts globally with both
    const latest = eventLog.find(e =>
      ['ingest:progress', 'ingest:complete', 'ingest:error'].includes(e.type) &&
      (e.payload?.jobId === activeJob || e.payload?.assetId === activeAssetId)
    );
    if (!latest) return;
    if (latest.type === 'ingest:progress') {
      setProgress({ stage: latest.payload.stage, message: latest.payload.message });
    } else if (latest.type === 'ingest:complete') {
      setProgress({ stage: 'complete', message: `"${latest.payload.title}" — ${latest.payload.frame_count} frames stored.` });
      setTimeout(() => { setProgress(null); setActiveJob(null); setActiveAssetId(null); setLoading(false); refresh(); }, 2000);
    } else if (latest.type === 'ingest:error') {
      setError(latest.payload.message);
      setProgress(null); setActiveJob(null); setActiveAssetId(null); setLoading(false);
    }
  }, [eventLog, activeJob, activeAssetId, refresh]);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setProgress({ stage: 'queued', message: 'Starting ingest job… (this takes 2–10 min for long videos)' });
    setLoading(true);
    try {
      const res = await archivistService.ingest(url.trim(), title.trim());
      const { jobId, assetId } = res.data;
      setActiveJob(jobId);
      setActiveAssetId(assetId);
      joinIngest(jobId);
      setUrl('');
      setTitle('');

      // Polling fallback — if socket events don't arrive, poll every 15s
      const pollInterval = setInterval(async () => {
        try {
          const assetRes = await archivistService.getById(assetId);
          const asset = assetRes?.data?.data;
          if (asset?.status === 'complete') {
            clearInterval(pollInterval);
            setProgress({ stage: 'complete', message: `"${asset.title}" — ${asset.frame_count} frames stored.` });
            setTimeout(() => { setProgress(null); setActiveJob(null); setActiveAssetId(null); setLoading(false); refresh(); }, 2000);
          } else if (asset?.status === 'failed') {
            clearInterval(pollInterval);
            setError(asset.error_message || 'Ingest failed.');
            setProgress(null); setActiveJob(null); setActiveAssetId(null); setLoading(false);
          } else if (asset?.status === 'processing') {
            setProgress({ stage: 'processing', message: `Processing frames… (${asset.frame_count || 0} extracted so far)` });
          } else if (asset?.status === 'downloading') {
            setProgress({ stage: 'downloading', message: 'Downloading video via yt-dlp…' });
          }
        } catch { /* ignore poll errors */ }
      }, 15000);

      // Clear poll after 35 minutes max
      setTimeout(() => clearInterval(pollInterval), 35 * 60 * 1000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Ingest failed. Is the backend running?');
      setProgress(null); setLoading(false);
    }
  };

  const totalVectors = assets.reduce((s, a) => s + (a.vault_size || 0), 0);

  return (
    <div style={{ color: G.text }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Assets Vaulted',  value: assets.length,                                          color: '#6366f1' },
          { label: 'Total Vectors',   value: totalVectors > 0 ? totalVectors.toLocaleString() : '—', color: '#a855f7' },
          { label: 'Protected',       value: assets.filter(a => a.status === 'complete').length,      color: G.teal    },
        ].map(({ label, value, color }) => (
          <motion.div key={label} whileHover={{ y: -2 }}
            style={{
              background: G.card, borderRadius: 16, padding: '18px 20px',
              border: `1px solid ${G.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: G.muted, margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 28, fontWeight: 900, color, margin: 0 }}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Ingest form */}
      <div style={{
        background: G.card, borderRadius: 20, padding: '20px 22px', marginBottom: 20,
        border: `1px solid ${G.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: G.text, margin: '0 0 4px' }}>Ingest Official Content</h2>
            <p style={{ fontSize: 12, color: G.sub, margin: 0, maxWidth: 480 }}>
              The Archivist downloads via yt-dlp, extracts 1 frame/sec, embeds each through CLIP (512-dim), and stores vectors in the FAISS vault with a SHA-256 integrity hash.
            </p>
          </div>
          <button onClick={refresh} style={{
            padding: '6px 10px', borderRadius: 9, border: `1px solid ${G.border}`,
            background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: G.sub,
          }}>
            <RefreshCw size={12} />
          </button>
        </div>

        <form onSubmit={handleIngest} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <LinkIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: G.muted }} />
              <input
                type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="YouTube URL or direct .mp4 link (Google Drive, Dropbox…)"
                disabled={loading} required
                style={{
                  width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                  borderRadius: 12, border: `1px solid ${G.border}`, background: '#f8fafc',
                  fontSize: 13, color: G.text, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = G.tealBdr}
                onBlur={e => e.target.style.borderColor = G.border}
              />
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              type="submit" disabled={loading || !url.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
                borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: 13,
                background: loading ? G.border : `linear-gradient(135deg, ${G.teal}, #2dd4bf)`,
                color: loading ? G.muted : '#fff',
                boxShadow: loading ? 'none' : `0 0 20px ${G.teal}25`,
                opacity: (!url.trim() && !loading) ? 0.5 : 1,
              }}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
              Ingest
            </motion.button>
          </div>
          {/* Title field — required for Drive/direct links so Spider can search YouTube */}
          {url && !url.includes('youtube.com') && !url.includes('youtu.be') && (
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Video title (required for non-YouTube links — used for piracy search)"
              disabled={loading}
              style={{
                width: '100%', padding: '10px 14px',
                borderRadius: 12, border: `1px solid ${G.tealBdr}`, background: '#f0fdf9',
                fontSize: 13, color: G.text, outline: 'none', boxSizing: 'border-box',
              }}
            />
          )}
        </form>

        <AnimatePresence>
          {progress && <ProgressTimeline stage={progress.stage} message={progress.message} />}
          {error && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                fontSize: 12, color: '#ef4444',
              }}>
              <AlertTriangle size={14} />{error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Assets grid */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: G.text, margin: 0 }}>Protected Assets</h3>
        <span style={{ fontSize: 12, color: G.sub }}>{assets.length} vaulted</span>
      </div>

      {assets.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 0', background: G.card,
          borderRadius: 20, border: `1px dashed ${G.border}`,
        }}>
          <Database size={40} style={{ color: G.muted, margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: G.sub, margin: 0 }}>Vault is empty</p>
          <p style={{ fontSize: 12, color: G.muted, margin: '4px 0 0' }}>Ingest an official video above to create the first fingerprint.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {assets.map(asset => <AssetCard key={asset._id} asset={asset} onDelete={handleDeleteClick} />)}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            asset={deleteTarget}
            onConfirm={handleDeleteConfirm}
            onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
      {deleteError && (
        <div style={{
          marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          fontSize: 12, color: '#ef4444',
        }}>
          <AlertTriangle size={14} />{deleteError}
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
};

export default AssetVault;
