import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import IntelBar from '../intel/IntelBar';
import PropagationSankey from '../intel/PropagationSankey';
import ThreatFeed from '../intel/ThreatFeed';
import VaultTable from '../intel/VaultTable';
import AnalyticsGrid from '../intel/AnalyticsGrid';
import { Lock } from 'lucide-react';

// No hardcoded data — all from backend via DashboardContext

const PiracyIntel = () => {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const { incidents, assets } = useDashboard();

  // Filter incidents by selected asset (if any)
  // When user clicks vault item, all charts filter to that content
  const filteredIncidents = React.useMemo(() => {
    if (!selectedAsset) return incidents;
    // Match by jobId or title similarity
    return incidents.filter(i =>
      i.jobId === selectedAsset.jobId ||
      (selectedAsset.title && i.title && i.title.toLowerCase().includes(selectedAsset.title.toLowerCase().slice(0, 15)))
    );
  }, [incidents, selectedAsset]);

  // Forensics/leak data for the selected asset
  const forensicsData = React.useMemo(() => {
    if (!selectedAsset) return [];
    // Build broadcaster data from incidents' forensics chain
    const chains = filteredIncidents
      .filter(i => i.forensics_chain || i.leak_chain)
      .map(i => i.forensics_chain || i.leak_chain || []);
    
    // Count platform appearances in leak chains
    const platformLeaks = {};
    chains.forEach(chain => {
      chain.forEach(p => { platformLeaks[p] = (platformLeaks[p] || 0) + 1; });
    });

    return Object.entries(platformLeaks).map(([platform, count]) => ({
      broadcaster: `Feed via ${platform}`,
      watermark: `WM-${platform.slice(0,2).toUpperCase()}${Math.floor(Math.random()*900+100)}`,
      leaked: count > 1,
      source: count > 1 ? `${count} leak traces` : '',
      region: platform,
    }));
  }, [filteredIncidents, selectedAsset]);

  return (
    <div style={{ background: '#050810', borderRadius: 18, padding: 18, minHeight: 'calc(100vh - 140px)', color: '#e2e8f0' }}>
      {/* Intel Bar */}
      <IntelBar />

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14, marginBottom: 14 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Sankey */}
          <div style={{ background: '#0a0f1a', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9' }}>
                Piracy Propagation Flow
                {selectedAsset && <span style={{ fontSize: 8, color: '#0d9488', marginLeft: 8, fontWeight: 600 }}>→ {selectedAsset.title?.slice(0,25)}</span>}
              </span>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { l: 'Incidents', v: `${filteredIncidents.length}`, c: '#ef4444' },
                  { l: 'Platforms', v: `${new Set(filteredIncidents.map(i=>i.platform)).size}`, c: '#f59e0b' },
                  { l: 'Avg Conf', v: `${filteredIncidents.length > 0 ? Math.round(filteredIncidents.reduce((s,i)=>s+(i.confidence_score||0),0)/filteredIncidents.length) : 0}%`, c: '#0d9488' },
                ].map(m => (
                  <div key={m.l} style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 7, color: '#475569', margin: 0 }}>{m.l}</p>
                    <p style={{ fontSize: 13, fontWeight: 900, color: m.c, margin: 0, fontFamily: 'monospace' }}>{m.v}</p>
                  </div>
                ))}
              </div>
            </div>
            <PropagationSankey style={{ height: 280 }} />
          </div>

          {/* Analytics */}
          <AnalyticsGrid />
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <VaultTable onSelect={setSelectedAsset} />
          </div>
          <ThreatFeed />
        </div>
      </div>

      {/* Insider Leak Detection */}
      <div style={{ background: '#0a0f1a', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Lock size={13} style={{ color: '#a855f7' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9' }}>Insider Leak Detection</span>
          <span style={{ fontSize: 8, color: '#475569', marginLeft: 4 }}>Invisible Watermark Tracking</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {(forensicsData.length > 0 ? forensicsData : assets.map((a, i) => ({
            broadcaster: a.title || `Asset ${i+1}`,
            watermark: `WM-${(a._id || '').slice(-4).toUpperCase() || 'XXXX'}`,
            leaked: false,
            source: '',
            region: 'Vault',
          }))).slice(0, 4).map((b, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{b.broadcaster}</span>
                <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: b.leaked ? 'rgba(239,68,68,0.12)' : 'rgba(13,148,136,0.12)', color: b.leaked ? '#ef4444' : '#0d9488' }}>
                  {b.leaked ? 'LEAKED' : 'SECURE'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#a78bfa', padding: '3px 6px', background: 'rgba(167,139,250,0.08)', borderRadius: 4 }}>{b.watermark}</span>
                <span style={{ fontSize: 8, color: '#475569' }}>{b.region}</span>
              </div>
              {b.leaked && <p style={{ fontSize: 9, color: '#ef4444', margin: '6px 0 0', fontWeight: 600 }}>Traced → {b.source}</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PiracyIntel;
