import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';
import { renderToStaticMarkup } from 'react-dom/server';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, ShieldAlert, Globe, Loader, Zap, MapPin } from 'lucide-react';

// ─── Marker icons ─────────────────────────────────────────────────────────────
const createIcon = (severity, isNew = false) => {
  const color =
    severity === 'CRITICAL' ? '#ef4444' :
    severity === 'WARNING'  ? '#f59e0b' :
    severity === 'spider'   ? '#6366f1' : '#10b981';

  const size   = isNew ? 20 : 14;
  const ring   = isNew ? 40 : 28;
  const pulse  = severity === 'CRITICAL' || isNew;

  const html = renderToStaticMarkup(
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: ring, height: ring }}>
      {pulse && (
        <div style={{
          position: 'absolute', width: ring, height: ring, borderRadius: '50%',
          backgroundColor: color, opacity: 0.15,
          animation: 'mapPing 1.4s ease-in-out infinite',
        }} />
      )}
      <div style={{
        position: 'relative', width: size, height: size, borderRadius: '50%',
        backgroundColor: color, border: '2.5px solid rgba(255,255,255,0.9)',
        boxShadow: `0 0 ${isNew ? 18 : 10}px ${color}90`,
        transition: 'all 0.3s',
      }} />
    </div>
  );

  return L.divIcon({
    html: `${html}<style>@keyframes mapPing{0%,100%{transform:scale(1);opacity:0.15}50%{transform:scale(2);opacity:0}}</style>`,
    className: '',
    iconSize:   [ring, ring],
    iconAnchor: [ring / 2, ring / 2],
  });
};

const officialIcon = () => {
  const html = renderToStaticMarkup(
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44 }}>
      <div style={{ position: 'absolute', width: 44, height: 44, borderRadius: '50%', backgroundColor: '#0d9488', opacity: 0.15, animation: 'mapPing 2s ease-in-out infinite' }} />
      <div style={{ position: 'relative', width: 18, height: 18, borderRadius: '50%', backgroundColor: '#0d9488', border: '3px solid rgba(255,255,255,0.95)', boxShadow: '0 0 20px #0d948890' }} />
    </div>
  );
  return L.divIcon({
    html: `${html}<style>@keyframes mapPing{0%,100%{transform:scale(1);opacity:0.15}50%{transform:scale(2.2);opacity:0}}</style>`,
    className: '',
    iconSize:   [44, 44],
    iconAnchor: [22, 22],
  });
};

// ─── Auto-fit bounds when markers change ─────────────────────────────────────
const AutoFit = ({ points }) => {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (points.length === 0) return;
    try {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 6, animate: true, duration: 1.2 });
        fitted.current = true;
      }
    } catch { /* ignore */ }
  }, [points.length]); // only re-fit when count changes

  return null;
};

// ─── Popup card ───────────────────────────────────────────────────────────────
const PopupCard = ({ title, platform, handle, confidence, severity, status, isSpider }) => (
  <div style={{
    background: '#0d1117', color: '#e2e8f0',
    borderRadius: 12, padding: 14, minWidth: 210,
    border: '1px solid rgba(255,255,255,0.08)',
    fontFamily: 'system-ui, sans-serif',
  }}>
    <p style={{
      fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em',
      color: isSpider ? '#6366f1' : severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
      marginBottom: 6, margin: '0 0 6px',
    }}>
      {isSpider ? '🕷️ Spider Node' : `${severity} Threat`}
    </p>
    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, lineHeight: 1.3, margin: '0 0 4px' }}>{title}</p>
    <p style={{ fontSize: 10, color: '#475569', margin: '0 0 10px' }}>
      {platform} · @{handle || 'unknown'}
    </p>
    {!isSpider && (
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
        background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8,
      }}>
        <div>
          <p style={{ fontSize: 8, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Confidence</p>
          <p style={{ fontSize: 14, fontWeight: 900, color: '#6366f1', margin: 0 }}>{confidence}%</p>
        </div>
        <div>
          <p style={{ fontSize: 8, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Status</p>
          <p style={{ fontSize: 14, fontWeight: 900, color: '#10b981', margin: 0 }}>{status}</p>
        </div>
      </div>
    )}
  </div>
);

// ─── HUD overlay card ─────────────────────────────────────────────────────────
const HUDCard = ({ children }) => (
  <div style={{
    background: 'rgba(10,12,18,0.90)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    padding: '12px 16px',
  }}>
    {children}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const ThreatMap = () => {
  const { incidents, swarmRunning, swarmPhase } = useDashboard();
  const { eventLog, isConnected } = useSocket();

  // Spider nodes arrive before incidents are created — track them separately
  const [spiderNodes,    setSpiderNodes]    = useState([]);
  const [officialSource, setOfficialSource] = useState(null);
  const [newPinId,       setNewPinId]       = useState(null); // flash animation for latest pin
  const [mapReady,       setMapReady]       = useState(false);
  const flashTimer = useRef(null);

  useEffect(() => { setMapReady(true); }, []);

  // Flash new pin for 3s
  const flashPin = useCallback((id) => {
    setNewPinId(id);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setNewPinId(null), 3000);
  }, []);

  // Listen to socket events for live map updates
  useEffect(() => {
    if (!eventLog.length) return;
    const latest = eventLog[0]; // eventLog is newest-first

    if (latest.type === 'spider:complete') {
      const { official_source, threat_nodes = [] } = latest.payload;
      if (official_source?.coordinates) setOfficialSource(official_source);
      setSpiderNodes(threat_nodes.filter(n => n.coordinates?.lat && n.coordinates?.lng));
    }

    if (latest.type === 'sentinel:threat_found') {
      // Once Sentinel confirms a node, flash it on the map
      flashPin(latest.payload.incidentId || latest.payload.title);
    }

    if (latest.type === 'swarm:phase' && latest.payload?.phase === 1) {
      // New swarm started — reset spider nodes
      setSpiderNodes([]);
      setOfficialSource(null);
    }
  }, [eventLog, flashPin]);

  // Merge: confirmed incidents take priority over spider nodes
  const confirmedIds = new Set(incidents.map(i => i.url).filter(Boolean));
  const pendingSpiderNodes = spiderNodes.filter(n => !confirmedIds.has(n.url));

  // All points for auto-fit
  const allPoints = [
    ...(officialSource?.coordinates ? [officialSource.coordinates] : []),
    ...incidents.filter(i => i.coordinates?.lat).map(i => i.coordinates),
    ...pendingSpiderNodes.filter(n => n.coordinates?.lat).map(n => n.coordinates),
  ];

  const critical = incidents.filter(i => i.severity === 'CRITICAL').length;
  const total    = incidents.length + pendingSpiderNodes.length;

  // Official source coords for connection lines
  const originCoords = officialSource?.coordinates
    ? [officialSource.coordinates.lat, officialSource.coordinates.lng]
    : [40.7128, -74.006]; // default NYC

  if (!mapReady) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117' }}>
      <Loader size={24} style={{ color: '#0d9488', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[20, 0]} zoom={2}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {allPoints.length > 1 && <AutoFit points={allPoints} />}

        {/* Official source marker */}
        {officialSource?.coordinates && (
          <Marker
            position={[officialSource.coordinates.lat, officialSource.coordinates.lng]}
            icon={officialIcon()}
          >
            <Popup>
              <PopupCard
                title={officialSource.title || 'Official Source'}
                platform="Official"
                handle="verified"
                confidence={100}
                severity="INFO"
                status="protected"
                isSpider={false}
              />
            </Popup>
          </Marker>
        )}

        {/* Confirmed incident markers */}
        {incidents
          .filter(i => i.coordinates?.lat && i.coordinates?.lng)
          .map(inc => (
            <React.Fragment key={inc._id}>
              <Polyline
                positions={[originCoords, [inc.coordinates.lat, inc.coordinates.lng]]}
                pathOptions={{
                  color: inc.severity === 'CRITICAL' ? '#ef4444' : '#6366f1',
                  weight: 1.2, dashArray: '5,8', opacity: 0.35,
                }}
              />
              <Circle
                center={[inc.coordinates.lat, inc.coordinates.lng]}
                radius={400000}
                pathOptions={{
                  color:       inc.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                  fillColor:   inc.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                  fillOpacity: 0.07, weight: 1, opacity: 0.4,
                }}
              />
              <Marker
                position={[inc.coordinates.lat, inc.coordinates.lng]}
                icon={createIcon(inc.severity, newPinId === inc._id)}
              >
                <Popup>
                  <PopupCard
                    title={inc.title}
                    platform={inc.platform}
                    handle={inc.account_handle}
                    confidence={inc.confidence_score}
                    severity={inc.severity}
                    status={inc.status}
                    isSpider={false}
                  />
                </Popup>
              </Marker>
            </React.Fragment>
          ))
        }

        {/* Spider nodes (pre-Sentinel — shown as purple pending pins) */}
        {pendingSpiderNodes.map((node, i) => (
          <React.Fragment key={`spider-${i}`}>
            <Polyline
              positions={[originCoords, [node.coordinates.lat, node.coordinates.lng]]}
              pathOptions={{ color: '#6366f1', weight: 1, dashArray: '3,10', opacity: 0.2 }}
            />
            <Marker
              position={[node.coordinates.lat, node.coordinates.lng]}
              icon={createIcon('spider', newPinId === node.url)}
            >
              <Popup>
                <PopupCard
                  title={node.title}
                  platform={node.platform || 'YouTube'}
                  handle={node.account_handle}
                  confidence={null}
                  severity="spider"
                  status="pending scan"
                  isSpider={true}
                />
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>

      {/* ── HUD: top-left stats ── */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <HUDCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
            }}>
              <Radar size={18} style={{ color: '#6366f1', animation: swarmRunning ? 'spin 2s linear infinite' : 'none' }} />
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#475569', margin: '0 0 2px' }}>
                Neural Sentinel
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{total}</span>
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                  background: isConnected ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  color: isConnected ? '#10b981' : '#ef4444',
                  border: `1px solid ${isConnected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </HUDCard>

        <HUDCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <ShieldAlert size={18} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#475569', margin: '0 0 2px' }}>
                Critical Nodes
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{critical}</span>
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                  background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}>CRITICAL</span>
              </div>
            </div>
          </div>
        </HUDCard>

        {/* Spider pending count — only show during swarm */}
        {pendingSpiderNodes.length > 0 && (
          <HUDCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
              }}>
                <MapPin size={18} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#475569', margin: '0 0 2px' }}>
                  Pending Scan
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{pendingSpiderNodes.length}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                    background: 'rgba(99,102,241,0.12)', color: '#6366f1',
                    border: '1px solid rgba(99,102,241,0.25)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}>SPIDER</span>
                </div>
              </div>
            </div>
          </HUDCard>
        )}
      </div>

      {/* ── HUD: top-right — active phase ── */}
      {swarmRunning && swarmPhase && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
          <HUDCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#0d9488',
                animation: 'pulse 1s ease-in-out infinite',
              }} />
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#475569', margin: '0 0 2px' }}>
                  Active Agent
                </p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0d9488', margin: 0 }}>
                  {swarmPhase.agent}
                </p>
                <p style={{ fontSize: 10, color: '#475569', margin: '2px 0 0', maxWidth: 160 }}>
                  {swarmPhase.message?.slice(0, 50)}{swarmPhase.message?.length > 50 ? '…' : ''}
                </p>
              </div>
            </div>
          </HUDCard>
        </div>
      )}

      {/* ── Bottom legend ── */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, display: 'flex', gap: 16, padding: '8px 18px', borderRadius: 999,
        background: 'rgba(10,12,18,0.85)', border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
      }}>
        {[
          { color: '#0d9488', label: 'Official Source' },
          { color: '#ef4444', label: 'Critical Piracy', pulse: true },
          { color: '#f59e0b', label: 'Warning'         },
          { color: '#6366f1', label: 'Spider Node'     },
        ].map(({ color, label, pulse }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: color,
              animation: pulse ? 'pulse 1.2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin    { from { transform: rotate(0deg)   } to { transform: rotate(360deg) } }
        @keyframes pulse   { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
      `}</style>
    </div>
  );
};

export default ThreatMap;
