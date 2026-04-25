import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import { Radar, ShieldAlert, Globe, Loader, RefreshCw, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { renderToStaticMarkup } from 'react-dom/server';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Custom marker ────────────────────────────────────────────────────────────
const createCustomIcon = (severity) => {
  const color = severity === 'CRITICAL' ? '#ef4444' : severity === 'WARNING' ? '#f59e0b' : '#10b981';
  const html = renderToStaticMarkup(
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', width: 32, height: 32, borderRadius: '50%',
        backgroundColor: color, opacity: 0.2,
        animation: severity === 'CRITICAL' ? 'ping 1.2s ease-in-out infinite' : 'none',
      }} />
      <div style={{
        position: 'relative', width: 14, height: 14, borderRadius: '50%',
        backgroundColor: color, border: '2.5px solid rgba(255,255,255,0.9)',
        boxShadow: `0 0 12px ${color}80`,
      }} />
    </div>
  );
  return L.divIcon({
    html: `${html}<style>@keyframes ping{0%,100%{transform:scale(1);opacity:0.2}50%{transform:scale(1.8);opacity:0}}</style>`,
    className: 'custom-map-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// ─── Live feed entry ──────────────────────────────────────────────────────────
const FeedEntry = ({ event }) => {
  const { type, payload } = event;
  const labels = {
    'swarm:phase':           { color: '#6366f1', text: `Phase ${payload?.phase}: ${payload?.agent}` },
    'sentinel:threat_found': { color: payload?.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', text: `${payload?.severity}: ${payload?.title?.slice(0, 30)}` },
    'adjudicator:verdict':   { color: '#a855f7', text: `Verdict: ${payload?.verdict?.classification}` },
    'enforcer:notice_ready': { color: '#ef4444', text: `DMCA drafted (${payload?.tier})` },
    'broker:contract_ready': { color: '#10b981', text: `Contract minted: ${payload?.tier}` },
    'swarm:complete':        { color: '#10b981', text: `Swarm complete — ${payload?.total_suspects || 0} suspects` },
  };
  const cfg = labels[type] || { color: '#475569', text: type };
  return (
    <div className="flex items-start gap-2 py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: cfg.color }} />
      <p className="text-[10px] font-medium flex-1 leading-relaxed" style={{ color: cfg.color }}>
        {cfg.text}
      </p>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const ThreatMap = () => {
  const { incidents, swarmRunning, swarmPhase } = useDashboard();
  const { eventLog, isConnected } = useSocket();
  const navigate = useNavigate();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { setMapReady(true); }, []);

  const liveFeed = eventLog.slice(0, 5);
  const critical = incidents.filter(i => i.severity === 'CRITICAL').length;

  if (!mapReady) return null;

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[20, 0]} zoom={3}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        {/* Dark Carto tile — matches Vihaan dark theme */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />

        {incidents.filter(i => i.coordinates?.lat && i.coordinates?.lng).map((inc) => (
          <React.Fragment key={inc._id}>
            {/* Connection line from origin */}
            <Polyline
              positions={[[40.7128, -74.006], [inc.coordinates.lat, inc.coordinates.lng]]}
              pathOptions={{
                color: inc.severity === 'CRITICAL' ? '#ef4444' : '#6366f1',
                weight: 1, dashArray: '4,8', opacity: 0.3,
              }}
            />
            {/* Radius circle */}
            <Circle
              center={[inc.coordinates.lat, inc.coordinates.lng]}
              radius={350000}
              pathOptions={{
                color: inc.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                fillColor: inc.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                fillOpacity: 0.06, weight: 1,
              }}
            />
            <Marker
              position={[inc.coordinates.lat, inc.coordinates.lng]}
              icon={createCustomIcon(inc.severity)}
            >
              <Popup>
                <div style={{
                  background: 'oklch(0.17 0 0)', color: '#fff',
                  borderRadius: 12, padding: 14, minWidth: 210,
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em',
                    color: inc.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', marginBottom: 6 }}>
                    {inc.severity} Threat
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{inc.title}</p>
                  <p style={{ fontSize: 10, color: '#475569', marginBottom: 10 }}>
                    {inc.platform} · @{inc.account_handle || 'unknown'}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                    background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8 }}>
                    <div>
                      <p style={{ fontSize: 8, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Confidence</p>
                      <p style={{ fontSize: 13, fontWeight: 900, color: '#6366f1' }}>{inc.confidence_score}%</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 8, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</p>
                      <p style={{ fontSize: 13, fontWeight: 900, color: '#10b981' }}>{inc.status}</p>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>

      {/* ── HUD top-left ── */}
      <div className="absolute top-5 left-5 z-[1000] space-y-3">
        {/* Sentinel card */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(12,13,18,0.88)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Radar className={cn('w-5 h-5', swarmRunning && 'animate-spin')} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: '#475569' }}>Neural Sentinel</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">{incidents.length}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: isConnected ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  color: isConnected ? '#10b981' : '#ef4444',
                  border: isConnected ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                }}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Critical card */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(12,13,18,0.88)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <ShieldAlert className="w-5 h-5" style={{ color: '#ef4444' }} />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: '#475569' }}>Critical Nodes</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">{critical}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                CRITICAL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── HUD top-right: live feed ── */}
      <div className="absolute top-5 right-5 z-[1000] w-64 hidden md:block">
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(12,13,18,0.88)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className={cn('w-1.5 h-1.5 rounded-full', swarmRunning ? 'animate-pulse' : '')}
              style={{ background: swarmRunning ? '#10b981' : '#334155' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
              {swarmRunning ? `${swarmPhase?.agent || 'Swarm'} Active` : 'Live Feed'}
            </span>
          </div>
          <div className="px-4 py-3 space-y-0 max-h-48 overflow-y-auto">
            {liveFeed.length > 0
              ? liveFeed.map((e, i) => <FeedEntry key={i} event={e} />)
              : <p className="text-[10px] italic" style={{ color: '#334155' }}>No events yet. Launch a swarm.</p>
            }
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-4 pointer-events-none">
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/dashboard/hunter')}
          disabled={swarmRunning}
          className="flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm pointer-events-auto transition-all"
          style={{
            background: swarmRunning
              ? 'rgba(99,102,241,0.2)'
              : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: '1px solid rgba(99,102,241,0.4)',
            color: '#fff',
            boxShadow: swarmRunning ? 'none' : '0 0 40px rgba(99,102,241,0.35)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {swarmRunning
            ? <><Loader className="w-5 h-5 animate-spin" /><span>Swarm Running…</span></>
            : <><Globe className="w-5 h-5" /><span>Launch Swarm</span></>
          }
        </motion.button>

        {/* Legend */}
        <div className="flex gap-5 px-5 py-2 rounded-full pointer-events-auto"
          style={{
            background: 'rgba(12,13,18,0.75)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
          }}>
          {[
            { color: '#6366f1', label: 'Broadcast Origin' },
            { color: '#ef4444', label: 'Active Piracy',   pulse: true },
            { color: '#f59e0b', label: 'Fair Use Node'    },
          ].map(({ color, label, pulse }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={cn('w-2 h-2 rounded-full', pulse && 'animate-pulse')} style={{ background: color }} />
              <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#475569' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThreatMap;
