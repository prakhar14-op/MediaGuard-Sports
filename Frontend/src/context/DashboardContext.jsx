import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { sentinelService, archivistService, enforcerService, brokerService } from '../services/api';
import toast from 'react-hot-toast';

const DashboardContext = createContext(null);

// ─── Seed mock data (shown when backend is offline) ───────────────────────────
const MOCK_INCIDENTS = [
  { _id: 'm1', title: 'Champions League Final Live Stream', platform: 'YouTube',   severity: 'CRITICAL', confidence_score: 98, coordinates: { lat: 51.5074,  lng: -0.1278  }, status: 'detected',  thumbnail_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=225&fit=crop' },
  { _id: 'm2', title: 'UFC 300 Main Event Restream',        platform: 'TikTok',    severity: 'CRITICAL', confidence_score: 94, coordinates: { lat: 34.0522,  lng: -118.2437 }, status: 'reviewing', thumbnail_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=225&fit=crop' },
  { _id: 'm3', title: 'NBA Playoffs Highlights (Unlicensed)',platform: 'Twitter',   severity: 'WARNING',  confidence_score: 82, coordinates: { lat: 40.7128,  lng: -74.0060  }, status: 'detected',  thumbnail_url: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=400&h=225&fit=crop' },
  { _id: 'm4', title: 'Formula 1 Live Paddock View',        platform: 'Telegram',  severity: 'CRITICAL', confidence_score: 96, coordinates: { lat: 25.2048,  lng: 55.2708   }, status: 'detected',  thumbnail_url: 'https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?w=400&h=225&fit=crop' },
];

export const DashboardProvider = ({ children }) => {
  const { lastEvent, joinRoom, joinIngest } = useSocket();

  const [incidents,      setIncidents]      = useState(MOCK_INCIDENTS);
  const [assets,         setAssets]         = useState([]);
  const [dmcas,          setDmcas]          = useState([]);
  const [contracts,      setContracts]      = useState([]);
  const [notifications,  setNotifications]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [backendOnline,  setBackendOnline]  = useState(false);

  // Active swarm job tracking
  const [activeJobId,    setActiveJobId]    = useState(null);
  const [swarmPhase,     setSwarmPhase]     = useState(null);   // { phase, agent, message }
  const [swarmRunning,   setSwarmRunning]   = useState(false);
  const [swarmComplete,  setSwarmComplete]  = useState(null);   // final summary

  const [stats, setStats] = useState({
    totalDetections:  MOCK_INCIDENTS.length,
    criticalThreats:  MOCK_INCIDENTS.filter(i => i.severity === 'CRITICAL').length,
    revenueProtected: 0,
    assetsInVault:    0,
  });

  // ─── Toast helpers ──────────────────────────────────────────────────────────
  const addNotification = useCallback((notif) => {
    const entry = { id: Date.now(), timestamp: new Date(), read: false, ...notif };
    setNotifications(prev => [entry, ...prev].slice(0, 100));

    if (notif.type === 'threat') {
      toast.error(notif.message, { duration: 5000, icon: '🚨',
        style: { border: '1px solid #ef4444', background: '#0f172a', color: '#fff' } });
    } else if (notif.type === 'agent') {
      toast.success(notif.message, { icon: '🤖',
        style: { border: '1px solid #3b82f6', background: '#0f172a', color: '#fff' } });
    } else if (notif.type === 'success') {
      toast.success(notif.message, { icon: '✅',
        style: { border: '1px solid #10b981', background: '#0f172a', color: '#fff' } });
    } else {
      toast(notif.message, { style: { border: '1px solid #6366f1', background: '#0f172a', color: '#fff' } });
    }
  }, []);

  // ─── Fetch all data from backend ────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [incRes, assetRes, dmcaRes, brokerRes] = await Promise.all([
        sentinelService.getIncidents(),
        archivistService.getAll(),
        enforcerService.getAll(),
        brokerService.getAll(),
      ]);

      const realIncidents = incRes?.data?.data  || [];
      const realAssets    = assetRes?.data?.data || [];
      const realDmcas     = dmcaRes?.data?.data  || [];
      const realContracts = brokerRes?.data?.data || [];

      // Only show real data when backend is online; keep mocks as fallback
      setIncidents(realIncidents.length > 0 ? realIncidents : MOCK_INCIDENTS);
      setAssets(realAssets);
      setDmcas(realDmcas);
      setContracts(realContracts);
      setBackendOnline(true);

      const allInc = realIncidents.length > 0 ? realIncidents : MOCK_INCIDENTS;
      setStats({
        totalDetections:  allInc.length,
        criticalThreats:  allInc.filter(i => i.severity === 'CRITICAL').length,
        revenueProtected: realContracts.reduce((s, c) => s + (c.estimated_monthly_revenue || 0), 0),
        assetsInVault:    realAssets.length,
      });
    } catch {
      setBackendOnline(false);
      // Keep mock data as-is
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Socket event handler ───────────────────────────────────────────────────
  useEffect(() => {
    if (!lastEvent) return;
    const { type, payload } = lastEvent;

    switch (type) {

      // ── Swarm phase transitions ──────────────────────────────────────────
      case 'swarm:phase':
        setSwarmPhase({ phase: payload.phase, agent: payload.agent, message: payload.message });
        setSwarmRunning(true);
        addNotification({ type: 'agent', title: `Phase ${payload.phase}: ${payload.agent}`, message: payload.message });
        break;

      case 'swarm:complete':
        setSwarmRunning(false);
        setSwarmPhase(null);
        setSwarmComplete(payload);
        addNotification({
          type: 'success',
          title: 'Swarm Complete',
          message: `${payload.total_suspects || 0} suspects · ${payload.dmca_drafted || 0} DMCA drafted · ${payload.contracts_minted || 0} contracts minted`,
        });
        // Delay refresh slightly so all DB writes finish before we pull fresh data
        setTimeout(() => fetchData(), 1500);
        break;

      case 'swarm:error':
        setSwarmRunning(false);
        setSwarmPhase(null);
        addNotification({ type: 'threat', title: 'Swarm Error', message: payload.message });
        break;

      // ── Spider ───────────────────────────────────────────────────────────
      case 'spider:complete':
        addNotification({ type: 'agent', title: 'Spider Complete', message: `Found ${payload.total || 0} suspects across the web.` });
        break;

      // ── Sentinel ─────────────────────────────────────────────────────────
      case 'sentinel:threat_found': {
        const sev = payload.severity;
        const newInc = {
          _id:              payload.incidentId,
          title:            payload.title,
          platform:         payload.platform,
          account_handle:   payload.account_handle,
          confidence_score: payload.confidence_score,
          severity:         sev,
          status:           'detected',
          coordinates:      payload.coordinates,
          match_confirmed:  payload.match_confirmed,
        };
        setIncidents(prev => {
          if (prev.find(i => i._id === newInc._id)) return prev;
          return [newInc, ...prev];
        });
        if (sev === 'CRITICAL') {
          addNotification({ type: 'threat', title: 'Critical Threat Detected', message: `${payload.title} on ${payload.platform} — ${payload.confidence_score}% confidence` });
        }
        break;
      }

      case 'sentinel:batch_complete':
        addNotification({ type: 'agent', title: 'Sentinel Scan Complete', message: `${payload.total || 0} incidents found. ${payload.piracy_count || 0} piracy, ${payload.fair_use_count || 0} fair use.` });
        break;

      // ── Adjudicator ──────────────────────────────────────────────────────
      case 'adjudicator:thinking':
        // Update the specific incident to show it's being analysed
        setIncidents(prev => prev.map(inc =>
          inc._id === payload.incident_id
            ? { ...inc, status: 'reviewing' }
            : inc
        ));
        break;

      case 'adjudicator:batch_started':
        addNotification({ type: 'agent', title: 'Adjudicator Started', message: `Analysing ${payload.total || 0} suspects (${payload.skipped || 0} below threshold).` });
        break;

      case 'adjudicator:verdict':
        setIncidents(prev => prev.map(inc =>
          inc._id === payload.incident_id
            ? {
                ...inc,
                classification:            payload.verdict?.classification,
                adjudicator_justification: payload.verdict?.justification,
                status: payload.verdict?.routing === 'Enforcer' ? 'takedown_pending' : 'reviewing',
              }
            : inc
        ));
        addNotification({ type: 'agent', title: 'Adjudicator Verdict', message: `${payload.verdict?.classification} → routed to ${payload.next_agent}` });
        break;

      case 'adjudicator:batch_complete':
        addNotification({ type: 'agent', title: 'Adjudication Complete', message: `${payload.enforcer_count || 0} DMCA, ${payload.broker_count || 0} contracts queued.` });
        break;

      // ── Enforcer ─────────────────────────────────────────────────────────
      case 'enforcer:drafting':
        addNotification({ type: 'agent', title: 'Enforcer Drafting', message: payload.message || 'Drafting DMCA notice...' });
        break;

      case 'enforcer:notice_ready': {
        const newDmca = {
          _id:            payload.dmca_id,
          incident_id:    payload.incident_id,
          status:         'drafted',
          tier:           payload.tier,
          offence_number: payload.offence_number,
          legal_contact:  payload.legal_contact,
          notice_text:    payload.notice_preview,   // truncated preview until fetchData runs
          platform:       payload.platform,
          target_account: payload.target_account,
        };
        setDmcas(prev => {
          if (prev.find(d => d._id === newDmca._id)) return prev;
          return [newDmca, ...prev];
        });
        // Also update the incident status in state
        setIncidents(prev => prev.map(inc =>
          inc._id === payload.incident_id ? { ...inc, status: 'takedown_pending' } : inc
        ));
        addNotification({ type: 'agent', title: 'DMCA Notice Drafted', message: `Tier: ${payload.tier} — awaiting your approval.` });
        break;
      }

      case 'enforcer:dmca_sent':
        setDmcas(prev => prev.map(d => d._id === payload.dmca_id ? { ...d, status: 'sent' } : d));
        addNotification({ type: 'success', title: 'DMCA Sent', message: `Notice dispatched to ${payload.platform} legal team.` });
        break;

      // ── Broker ───────────────────────────────────────────────────────────
      case 'broker:minting':
        addNotification({ type: 'agent', title: 'Broker Minting', message: payload.message || 'Calculating rev-share...' });
        break;

      case 'broker:contract_ready': {
        const newContract = {
          _id:                      payload.contract_id,
          incident_id:              payload.incident_id,
          tier:                     payload.tier,
          copyright_holder_share:   payload.copyright_holder_share,
          creator_share:            payload.creator_share,
          tx_hash:                  payload.tx_hash,
          estimated_monthly_revenue: payload.estimated_monthly_revenue || 0,
          status:                   'minted',
        };
        setContracts(prev => {
          if (prev.find(c => c._id === newContract._id)) return prev;
          return [newContract, ...prev];
        });
        // Update incident status in state
        setIncidents(prev => prev.map(inc =>
          inc._id === payload.incident_id ? { ...inc, status: 'monetized' } : inc
        ));
        addNotification({ type: 'success', title: 'Contract Minted', message: `${payload.tier} tier rev-share contract ready for activation.` });
        break;
      }

      case 'broker:contract_activated':
        setContracts(prev => prev.map(c => c._id === payload.contract_id ? { ...c, status: 'active' } : c));
        addNotification({ type: 'success', title: 'Contract Activated', message: `Rev-share contract is now live on Polygon.` });
        break;

      // ── Ingest ───────────────────────────────────────────────────────────
      case 'ingest:complete':
        addNotification({ type: 'success', title: 'Asset Vaulted', message: `"${payload.title}" — ${payload.frame_count} frames stored in FAISS vault.` });
        fetchData();
        break;

      case 'ingest:error':
        addNotification({ type: 'threat', title: 'Ingest Failed', message: payload.message });
        break;

      default:
        break;
    }
  }, [lastEvent, addNotification, fetchData]);

  return (
    <DashboardContext.Provider value={{
      // data
      incidents, assets, dmcas, contracts, notifications, stats, loading, backendOnline,
      // swarm state
      activeJobId, setActiveJobId, swarmPhase, swarmRunning, swarmComplete, setSwarmComplete,
      // actions
      refresh: fetchData, addNotification, notify: addNotification,
      // socket helpers
      joinRoom, joinIngest,
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
