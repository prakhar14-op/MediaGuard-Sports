import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useDashboard } from '../../context/DashboardContext';
import { swarmService } from '../../services/api';
import { Search, Loader, Radar, ShieldAlert, Zap, Cpu, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { renderToStaticMarkup } from 'react-dom/server';

// Custom High-Tech Marker Creator
const createCustomIcon = (severity) => {
  const color = severity === 'CRITICAL' ? '#ef4444' : '#f59e0b';
  const iconHTML = renderToStaticMarkup(
    <div className="relative flex items-center justify-center">
      <div className={`absolute w-8 h-8 rounded-full opacity-20 animate-ping`} style={{ backgroundColor: color }} />
      <div className={`relative w-4 h-4 rounded-full border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)]`} style={{ backgroundColor: color }} />
    </div>
  );
  
  return L.divIcon({
    html: iconHTML,
    className: 'custom-map-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const ThreatMap = () => {
  const { incidents, refresh } = useDashboard();
  const [mapReady, setMapReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  const handleManualScan = async () => {
    try {
      setIsScanning(true);
      await swarmService.run('https://example.com/live-stream'); 
      setTimeout(() => {
        setIsScanning(false);
        refresh();
      }, 5000);
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    }
  };

  if (!mapReady) return null;

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={[20, 0]} 
        zoom={3} 
        style={{ height: '100%', width: '100%', background: '#020617' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {incidents.filter(i => i.coordinates).map((incident) => (
          <React.Fragment key={incident._id}>
            <Polyline 
              positions={[
                [40.7128, -74.0060], 
                [incident.coordinates.lat, incident.coordinates.lng]
              ]}
              pathOptions={{ 
                color: incident.severity === 'CRITICAL' ? '#ef4444' : '#3b82f6',
                weight: 1,
                dashArray: '5, 10',
                opacity: 0.3
              }}
            />
            
            <Circle 
              center={[incident.coordinates.lat, incident.coordinates.lng]}
              radius={300000}
              pathOptions={{ 
                color: incident.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                fillColor: incident.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                fillOpacity: 0.1,
                weight: 1
              }}
            />
            <Marker 
              position={[incident.coordinates.lat, incident.coordinates.lng]}
              icon={createCustomIcon(incident.severity)}
            >
              <Popup>
                <div className="p-3 min-w-[200px] bg-slate-950 text-white rounded-xl border border-white/10 shadow-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className={cn("w-4 h-4", incident.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400')} />
                    <span className={cn("text-[10px] font-black uppercase tracking-tighter", incident.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400')}>
                      {incident.severity} Threat Detected
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm mb-1 leading-tight">{incident.title}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">{incident.platform}</p>
                  
                  <div className="grid grid-cols-2 gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase font-bold">Confidence</p>
                      <p className="text-xs font-black text-blue-400">{incident.confidence_score}%</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase font-bold">Status</p>
                      <p className="text-xs font-black text-emerald-400">Tracking</p>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {isScanning && (
          <Circle 
            center={[40.7128, -74.0060]}
            radius={20000000}
            pathOptions={{ 
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.05,
              weight: 1
            }}
          />
        )}
      </MapContainer>
      
      {/* HUD - Floating Elements */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between pointer-events-none">
        {/* Left Stats */}
        <div className="space-y-3 pointer-events-auto">
          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-2xl">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Radar className={cn("w-6 h-6 text-blue-400", isScanning && "animate-spin")} />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Neural Sentinel</h4>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{incidents.length}</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">ONLINE</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-2xl">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">High Risk Nodes</h4>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{incidents.filter(i => i.severity === 'CRITICAL').length}</span>
                <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">CRITICAL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Active Agent Feed */}
        <div className="w-64 space-y-3 pointer-events-auto hidden md:block">
          <div className="bg-slate-950/80 backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-2xl">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Live Swarm Feed</h4>
            <div className="space-y-3">
              {[
                { agent: 'Spider', action: 'Crawling Telegram nodes', time: '12s', color: 'blue' },
                { agent: 'Sentinel', action: 'Visual match on TikTok', time: '1m', color: 'amber' },
                { agent: 'Adjudicator', action: 'Classifying fair use', time: '2m', color: 'purple' },
              ].map((log, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-1 h-full bg-${log.color}-500/50 rounded-full`} />
                  <div>
                    <p className="text-[10px] text-white font-bold">{log.agent}</p>
                    <p className="text-[9px] text-slate-500">{log.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-6 w-full max-w-xl pointer-events-none">
        <button 
          onClick={handleManualScan}
          disabled={isScanning}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-5 px-12 rounded-3xl flex items-center gap-4 shadow-[0_0_50px_rgba(37,99,235,0.3)] pointer-events-auto transition-all active:scale-95 group border border-blue-400/30"
        >
          {isScanning ? <Loader className="w-6 h-6 animate-spin" /> : <Globe className="w-6 h-6 group-hover:rotate-12 transition-transform" />}
          <span className="text-sm tracking-[0.2em] uppercase">
            {isScanning ? 'Synchronizing Neural Link...' : 'Execute Global Swarm Scan'}
          </span>
        </button>
        
        <div className="bg-slate-950/60 backdrop-blur-md border border-white/5 px-6 py-2 rounded-full flex gap-6 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Broadcast Origin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Piracy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fair Use Node</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatMap;
