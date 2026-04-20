import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { sentinelService, archivistService, enforcerService, brokerService } from '../services/api';
import toast from 'react-hot-toast';

const DashboardContext = createContext(null);

const MOCK_INCIDENTS = [
  { _id: 'm1', title: 'Champions League Final Live Stream', platform: 'YouTube', severity: 'CRITICAL', confidence_score: 98, coordinates: { lat: 51.5074, lng: -0.1278 }, status: 'detected', thumbnail_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=225&fit=crop' },
  { _id: 'm2', title: 'UFC 300 Main Event Restream', platform: 'TikTok', severity: 'CRITICAL', confidence_score: 94, coordinates: { lat: 34.0522, lng: -118.2437 }, status: 'reviewing', thumbnail_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=225&fit=crop' },
  { _id: 'm3', title: 'NBA Playoffs Highlights (Unlicensed)', platform: 'Twitter', severity: 'WARNING', confidence_score: 82, coordinates: { lat: 40.7128, lng: -74.0060 }, status: 'detected', thumbnail_url: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=400&h=225&fit=crop' },
  { _id: 'm4', title: 'Formula 1 Live Paddock View', platform: 'Telegram', severity: 'CRITICAL', confidence_score: 96, coordinates: { lat: 25.2048, lng: 55.2708 }, status: 'detected', thumbnail_url: 'https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?w=400&h=225&fit=crop' },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'threat', title: 'Critical Detection', message: 'Unauthorized restream of CL Final detected on YouTube.', severity: 'CRITICAL', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: 2, type: 'agent', title: 'Spider Crawl Success', message: 'The Spider successfully indexed 14 Telegram piracy nodes.', timestamp: new Date(Date.now() - 1000 * 60 * 12) },
  { id: 3, type: 'agent', title: 'Adjudicator Verdict', message: 'Detected TikTok clip classified as Fair Use (Reaction Video).', timestamp: new Date(Date.now() - 1000 * 60 * 25) },
  { id: 4, type: 'success', title: 'DMCA Sent', message: 'Takedown notice dispatched to Telegram Legal Dept.', timestamp: new Date(Date.now() - 1000 * 60 * 45) },
  { id: 5, type: 'agent', title: 'Broker Activation', message: 'Rev-Share contract deployed for viral NBA highlights clip.', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  { id: 6, type: 'threat', title: 'High Confidence Match', message: 'Sentinel matched pHash with 99.8% confidence on UFC 300 feed.', severity: 'CRITICAL', timestamp: new Date(Date.now() - 1000 * 60 * 120) },
];

export const DashboardProvider = ({ children }) => {
  const { lastEvent } = useSocket();
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);
  const [assets, setAssets] = useState([]);
  const [dmcas, setDmcas] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDetections: MOCK_INCIDENTS.length + 142,
    criticalThreats: MOCK_INCIDENTS.filter(i => i.severity === 'CRITICAL').length + 28,
    revenueProtected: 124500,
    assetsInVault: 12
  });

  const addNotification = (notif) => {
    const newNotif = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notif
    };
    setNotifications(prev => [newNotif, ...prev]);
    
    // Flash notification (Toast)
    if (notif.type === 'threat') {
      toast.error(notif.message, {
        duration: 5000,
        style: { border: '1px solid #ef4444', background: '#0f172a', color: '#fff' },
        icon: '🚨'
      });
    } else if (notif.type === 'agent') {
      toast.success(notif.message, {
        style: { border: '1px solid #3b82f6', background: '#0f172a', color: '#fff' },
        icon: '🤖'
      });
    } else {
      toast(notif.message, {
        style: { border: '1px solid #10b981', background: '#0f172a', color: '#fff' },
        icon: '✅'
      });
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incRes, assetRes, dmcaRes, brokerRes] = await Promise.all([
        sentinelService.getIncidents(),
        archivistService.getAll(),
        enforcerService.getAll(),
        brokerService.getAll()
      ]);

      const realIncidents = incRes.data || [];
      setIncidents([...realIncidents, ...MOCK_INCIDENTS]);
      setAssets(assetRes.data || []);
      setDmcas(dmcaRes.data || []);
      setContracts(brokerRes.data || []);

      setStats({
        totalDetections: (realIncidents.length || 0) + MOCK_INCIDENTS.length + 142,
        criticalThreats: [...realIncidents, ...MOCK_INCIDENTS].filter(i => i.severity === 'CRITICAL').length + 28,
        revenueProtected: (brokerRes.data || []).reduce((acc, curr) => acc + (curr.projected_revenue || 0), 0) + 124500,
        assetsInVault: (assetRes.data || []).length + 12
      });
    } catch (err) {
      console.warn('Backend offline, using mock mode.');
    } finally {
      setLoading(false);
    }
  };

  const notify = addNotification; // Alias for backward compatibility if needed

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (lastEvent) {
      if (lastEvent.type === 'incident_new') {
        setIncidents(prev => [lastEvent.payload, ...prev]);
        addNotification({
          type: lastEvent.payload.severity === 'CRITICAL' ? 'threat' : 'agent',
          title: 'New Incident Detected',
          message: `${lastEvent.payload.title} on ${lastEvent.payload.platform}`,
          severity: lastEvent.payload.severity
        });
      }
      if (lastEvent.type === 'asset_new') {
        setAssets(prev => [lastEvent.payload, ...prev]);
        addNotification({
          type: 'agent',
          title: 'Asset Vaulted',
          message: 'Digital fingerprint stored in FAISS vault.'
        });
      }
    }
  }, [lastEvent]);

  return (
    <DashboardContext.Provider value={{ 
      incidents, assets, dmcas, contracts, notifications, stats, loading, 
      refresh: fetchData, addNotification, notify
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
