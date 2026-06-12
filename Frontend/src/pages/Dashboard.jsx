import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import LiveStreamAlerts from '../components/ui/LiveStreamAlert';
import { DashboardProvider, useDashboard } from '../context/DashboardContext';
import { SocketProvider, useSocket } from '../context/SocketContext';
import { streamService } from '../services/api';

import Overview      from '../components/dashboard/Overview';
import AssetVault    from '../components/dashboard/AssetVault';
import ThreatHunter  from '../components/dashboard/ThreatHunter';
import IncidentTable from '../components/dashboard/IncidentTable';
import LegalPanel    from '../components/dashboard/LegalPanel';
import BrokerPanel   from '../components/dashboard/BrokerPanel';
import EnforcementHub from '../components/dashboard/EnforcementHub';
import PiracyIntel   from '../components/dashboard/PiracyIntel';
import Notifications from '../components/dashboard/Notifications';
import Analytics     from '../components/dashboard/Analytics';

const TITLES = {
  overview:      'Command Overview',
  vault:         'Digital Asset Vault',
  hunter:        'Swarm Threat Hunter',
  incidents:     'Incident Response',
  intel:         'Piracy Intelligence',
  enforce:       'Enforcement & Monetization',
  notifications: 'Intelligence Logs',
  analytics:     'Intelligence Analytics',
};

const DashboardContent = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const parts     = location.pathname.split('/');
  const activeTab = parts[parts.length - 1] || 'overview';
  const title     = TITLES[activeTab] || 'Command Center';

  // Live stream detection alerts — floating notifications
  const { liveStreams, liveMonitorActive, setLiveMonitorActive } = useDashboard();
  const { eventLog } = useSocket();
  const [streamAlerts, setStreamAlerts] = useState([]);
  const [liveScreenDismissed, setLiveScreenDismissed] = useState(false);

  // Listen for stream:detection and watchdog:alert events → create alert cards
  React.useEffect(() => {
    if (!eventLog.length) return;
    const latest = eventLog[0]; // most recent
    if (!latest) return;

    if (latest.type === 'stream:detection') {
      const p = latest.payload;
      const detections = p?.detections || [];
      for (const d of detections) {
        // Show ALL segment results as notifications (hackathon visibility)
        const isMatch = d.match_confirmed || d.confidence_score >= 60;
        setStreamAlerts(prev => [{
          id:         `stream_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
          title:      isMatch
            ? `🚨 PIRACY DETECTED — Segment #${d.segment_index || 0}`
            : `📡 Scanning Segment #${d.segment_index || 0} — ${d.confidence_score?.toFixed(1)}%`,
          platform:   'Live Stream',
          account:    p.stream_id?.slice(0, 8) || 'monitor',
          confidence: d.confidence_score || 0,
          severity:   d.match_confirmed ? 'CRITICAL' : d.confidence_score >= 50 ? 'WARNING' : 'INFO',
          url:        '',
          thumbnail:  '',
          segment:    d.segment_index,
          timestamp:  Date.now(),
          forensics_chain: d.forensics_chain || [],
          leak_risk:  d.forensics_leak_risk || '',
        }, ...prev].slice(0, 8));
      }
    }

    if (latest.type === 'watchdog:alert') {
      const p = latest.payload;
      const alerts = p?.alerts || [];
      for (const a of alerts.slice(0, 3)) {
        setStreamAlerts(prev => [{
          id:         `wd_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
          title:      a.title || `Piracy detected: ${p.asset_title}`,
          platform:   a.platform || 'Multi-platform',
          account:    a.account_handle || 'unknown',
          confidence: a.confidence || 0,
          severity:   a.severity || 'WARNING',
          url:        a.url || '',
          thumbnail:  '',
          segment:    0,
          timestamp:  Date.now(),
        }, ...prev].slice(0, 8));
      }
    }

    if (latest.type === 'sentinel:threat_found') {
      const p = latest.payload;
      if (p?.match_confirmed && p?.confidence_score >= 75) {
        setStreamAlerts(prev => [{
          id:         `swarm_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
          title:      p.title || 'Piracy Detected',
          platform:   p.platform || 'Unknown',
          account:    p.account_handle || 'unknown',
          confidence: p.confidence_score || 0,
          severity:   p.severity || 'CRITICAL',
          url:        p.url || '',
          thumbnail:  p.thumbnail_url || '',
          segment:    0,
          timestamp:  Date.now(),
        }, ...prev].slice(0, 8));
      }
    }
  }, [eventLog]);

  const dismissAlert = useCallback((id) => {
    setStreamAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: '#f6f7fc' }}>
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => navigate(`/dashboard/${tab}`)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />

        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <Routes>
                <Route path="overview"      element={<Overview />}      />
                <Route path="vault"         element={<AssetVault />}    />
                <Route path="hunter"        element={<ThreatHunter />}  />
                <Route path="incidents"     element={<IncidentTable />} />
                <Route path="intel"         element={<PiracyIntel />}  />
                <Route path="enforce"       element={<EnforcementHub />} />
                <Route path="enforcer"      element={<EnforcementHub />} />
                <Route path="broker"        element={<EnforcementHub />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="analytics"     element={<Analytics />}     />
                <Route path="/"             element={<Navigate to="overview" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Live stream overlay — click to dismiss */}
      <AnimatePresence>
        {liveMonitorActive && !liveScreenDismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setLiveScreenDismissed(true);
              setLiveMonitorActive(false);
              streamService.getActive().then(res => {
                const streams = res?.data?.streams || [];
                streams.forEach(s => streamService.stop(s.stream_id).catch(() => {}));
              }).catch(() => {});
              setStreamAlerts([]);
            }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9990,
              background: 'radial-gradient(ellipse at center, rgba(13,148,136,0.1) 0%, rgba(2,6,23,0.97) 60%)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 16,
              overflow: 'hidden',
            }}
          >
            {/* Ripple rings expanding from center */}
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{
                position: 'absolute',
                width: 80, height: 80,
                borderRadius: '50%',
                border: '1px solid rgba(13,148,136,0.4)',
                animation: `rippleExpand 4s ease-out infinite ${i * 0.6}s`,
                opacity: 0,
                zIndex: 0,
              }} />
            ))}
            {/* Outer slow rotating ring */}
            <div style={{
              position: 'absolute',
              width: 300, height: 300,
              borderRadius: '50%',
              border: '1px solid rgba(99,102,241,0.15)',
              animation: 'rotateSlow 20s linear infinite',
              zIndex: 0,
            }}>
              <div style={{ position: 'absolute', top: -3, left: '50%', width: 6, height: 6, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />
            </div>
            {/* Content — above ripples, with light backdrop for dark text */}
            <div style={{
              position: 'relative', zIndex: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              background: 'rgba(255,255,255,0.92)',
              borderRadius: 24, padding: '36px 48px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}>
              {/* Inner pulsing core */}
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 30px rgba(239,68,68,0.6), 0 0 60px rgba(239,68,68,0.3)',
                }}
              />
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ color: '#0f172a', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}
              >
                Live Stream Monitoring Active
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.6 }}
                style={{ color: '#334155', fontSize: 13 }}
              >
                Click anywhere to stop monitoring
              </motion.p>
            </div>
            <style>{`
              @keyframes rippleExpand {
                0% { transform: scale(1); opacity: 0.6; }
                100% { transform: scale(12); opacity: 0; }
              }
              @keyframes rotateSlow {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating live stream / watchdog alert notifications — PORTAL to body for z-index independence */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <LiveStreamAlerts alerts={streamAlerts} onDismiss={dismissAlert} />,
        document.body
      )}
    </div>
  );
};

const Dashboard = () => (
  <SocketProvider>
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  </SocketProvider>
);

export default Dashboard;
