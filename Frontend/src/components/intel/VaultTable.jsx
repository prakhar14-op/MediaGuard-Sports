import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { Shield, Database } from 'lucide-react';

const VaultTable = ({ onSelect }) => {
  const { assets } = useDashboard();

  // Real assets from backend, with fallback
  const displayAssets = assets.length > 0 ? assets : [
    { _id: 'v1', title: 'Champions League Final 2026', status: 'complete', frame_count: 89, vault_size: 89, createdAt: '2026-06-10T08:00:00Z', official_video_url: '' },
    { _id: 'v2', title: 'Alan Walker — Darkside', status: 'complete', frame_count: 13, vault_size: 13, createdAt: '2026-06-12T10:00:00Z', official_video_url: 'https://youtu.be/M-P4QBt-FWw' },
    { _id: 'v3', title: 'IPL Final Broadcast', status: 'complete', frame_count: 145, vault_size: 145, createdAt: '2026-06-08T12:00:00Z', official_video_url: '' },
  ];

  return (
    <div style={{ background: '#0a0f1a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Database size={11} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Protected Assets</span>
        </div>
        <span style={{ fontSize: 8, color: '#0d9488', fontWeight: 700 }}>{displayAssets.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
        {displayAssets.map(a => {
          const thumbId = a.official_video_url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1];
          const thumb = thumbId ? `https://i.ytimg.com/vi/${thumbId}/default.jpg` : '';
          return (
            <div key={a._id} onClick={() => onSelect?.(a)}
              style={{ display: 'flex', gap: 8, padding: '8px 6px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)', borderRadius: 4 }}
            >
              <div style={{ width: 40, height: 26, borderRadius: 4, background: '#1e293b', flexShrink: 0, overflow: 'hidden' }}>
                {thumb ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={10} style={{ color: '#1e293b' }} /></div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 9, fontWeight: 600, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || 'Untitled'}</p>
                <p style={{ fontSize: 7, color: '#475569', margin: '2px 0 0' }}>
                  {a.frame_count || 0} frames · {a.vault_size || 0} vectors · {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                </p>
              </div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.status === 'complete' ? '#0d9488' : '#f59e0b', alignSelf: 'center', boxShadow: `0 0 4px ${a.status === 'complete' ? '#0d9488' : '#f59e0b'}40` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VaultTable;
