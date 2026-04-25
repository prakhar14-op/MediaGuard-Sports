import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import { Radar, ShieldAlert, Globe, Loader } from 'lucide-react';
import { cn } from '../../lib/utils';
import { renderToStaticMarkup } from 'react-dom/server';
import { useNavigate } from 'react-router-dom';

const createCustomIcon = (severity) => {
  const color = severity === 'CRITICAL' ? '#ef4444' : '#f59e0b';
  const html = renderToStaticMarkup(
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: 32, height: 32, borderRadius: '50%', backgroundColor: color, opacity: 0.18 }} />
      <div style={{ position: 'relative', width: 14, height: 14, borderRadius: '50%', backgroundColor: color, border: '2px solid white', boxShadow: '0 0 8px rgba(0,0,0,0.5)' }} />
    </div>
  );
  return L.divIcon({ html, className: 'custom-map-marker', iconSize: [32, 32], iconAnchor: [16, 16] });
};

const ThreatMap = () => {
  const { incidents, swarmRunning, swarmPhase } = useDashboard();
  const { eventLog, isConnected } = useSocket();
  const navigate = useNavigate();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { setMapReady(true); }, []);

  // Last 3 real socket events for the live feed panel
  const liveFeed = eventLog.slice(0, 3).map(e => {
    const labels = {
      'swarm:phase':           { agent: e.payload?.agent || 'Swarm',    action: e.payload?.message || '…',          color: 'blue'   },
      'spider:complete':       { agent: 'Spider',                        action: `Found ${e.payload?.total || 0} suspects`, color: 'indigo' },
      'sentinel:threat_found': { agent: 'Sentinel',                      action: `${e.payload?.severity}: ${e.payload?.title?.slice(0,28) || '…'}`, color: 'amber'  },
      'adjudicator:verdict':   { agent: 'Adjudicator',                   action: e.payload?.verdict?.classification || '…', color: 'purple' },
      'enforcer:notice_ready': { agent: 'Enforcer',                      action: `DMCA drafted (${e.payload?.tier || '…'})`, color: 'red'    },
      'broker:contract_ready': { agent: 'Broker',                        action: `Contract minted: ${e.payload?.tier || '…'}`, color: 'green'  },
    };
    return labels[e.type] || { agent: e.type, action: '…', color: 'slate' };
  });

  if (!mapReady) return null;

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[20, 0]} zoom={3}
        style={{ height: '100%', width: '100%', background: '#020617' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {incidents.filter(i => i.coordinates?.lat && i.coordinates?.lng).map((inc) => (
          <React.Fragment key={inc._id}>
            <Polyline
              positions={[[40.7128, -74.006], [inc.coordinates.lat, inc.coordinates.lng]]}
              pathOptions={{ color: inc.severity === 'CRITICAL' ? '#ef4444' : '#3b82f6', weight: 1, dashArray: '5,10', opacity: 0.25 }}
            />
            <Circle
              center={[inc.coordinates.lat, inc.coordinates.lng]}
              radius={300000}
              pathOptions={{ color: inc.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', fillColor: inc.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', fillOpacity: 0.08, weight: 1 }}
            />
            <Marker position={[inc.coordinates.lat, inc.coordinates.lng]} icon={createCustomIcon(inc.severity)}>
              <Popup>
                <div style={{ background: '#0f172a', color: '#fff', borderRadius: 12, padding: 12, minWidth: 200, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: inc.severity === 'CRITICAL' ? '#f87171' : '#fbbf24', marginBottom: 4 }}>
                    {inc.severity} Threat
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{inc.title}</p>
                  <p style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>{inc.platform} · @{inc.account_handle || 'unknown'}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 8 }}>
                    <div><p style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase' }}>Confidence</p><p style={{ fontSize: 12, fontWeight: 900, color: '#60a5fa' }}>{inc.confidence_score}%</p></div>
                    <div><p style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase' }}>Status</p><p style={{ fontSize: 12, fontWeight: 900, color: '#34d399' }}>{inc.status}</p></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>

      {/* HUD top */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between pointer-events-none">
        {/* Left stats */}
        <div className="space-y-3 pointer-events-auto">
          <div className="bg-slate-950/85 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-2xl">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Radar className={cn('w-6 h-6 text-blue-400', swarmRunning && 'animate-spin')} />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Neural Sentinel</h4>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{incidents.length}</span>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', isConnected ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 bg-slate-500/10')}>
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/85 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-2xl">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Critical Nodes</h4>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{incidents.filter(i => i.severity === 'CRITICAL').length}</span>
                <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">CRITICAL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right live feed */}
        <div className="w-64 pointer-events-auto hidden md:block">
          <div className="bg-slate-950/85 backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('w-1.5 h-1.5 rounded-full', swarmRunning ? 'bg-blue-400 animate-pulse' : 'bg-slate-600')} />
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {swarmRunning ? `${swarmPhase?.agent || 'Swarm'} Active` : 'Live Feed'}
              </h4>
            </div>
            {liveFeed.length > 0 ? (
              <div className="space-y-3">
                {liveFeed.map((log, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className={`w-0.5 self-stretch rounded-full bg-${log.color}-500/50`} />
                    <div className="min-w-0">
                      <p className="text-[10px] text-white font-bold">{log.agent}</p>
                      <p className="text-[9px] text-slate-500 truncate">{log.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-slate-600 italic">No events yet. Launch a swarm.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom CTA — navigate to ThreatHunter to launch */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-4 pointer-events-none">
        <button
          onClick={() => navigate('/dashboard/hunter')}
          disabled={swarmRunning}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black py-4 px-10 rounded-3xl flex items-center gap-3 shadow-[0_0_40px_rgba(37,99,235,0.3)] pointer-events-auto transition-all active:scale-95 border border-blue-400/30"
        >
          {swarmRunning
            ? <><Loader className="w-5 h-5 animate-spin" /><span className="text-sm tracking-[0.15em] uppercase">Swarm Running…</span></>
            : <><Globe className="w-5 h-5" /><span className="text-sm tracking-[0.15em] uppercase">Launch Swarm</span></>
          }
        </button>

        <div className="bg-slate-950/60 backdrop-blur-md border border-white/5 px-5 py-2 rounded-full flex gap-5 pointer-events-auto">
          {[
            { color: 'bg-blue-500',   label: 'Broadcast Origin' },
            { color: 'bg-red-500 animate-pulse', label: 'Active Piracy' },
            { color: 'bg-amber-500',  label: 'Fair Use Node'    },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThreatMap;
