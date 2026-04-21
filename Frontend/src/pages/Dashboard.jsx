import React from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { DashboardProvider, useDashboard } from '../context/DashboardContext';
import { SocketProvider } from '../context/SocketContext';
import { AnimatePresence, motion } from 'framer-motion';

// Tab Components
import Overview from '../components/dashboard/Overview';
import AssetVault from '../components/dashboard/AssetVault';
import ThreatHunter from '../components/dashboard/ThreatHunter';
import IncidentTable from '../components/dashboard/IncidentTable';
import LegalPanel from '../components/dashboard/LegalPanel';
import BrokerPanel from '../components/dashboard/BrokerPanel';
import Notifications from '../components/dashboard/Notifications';

const DashboardContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const pathParts = location.pathname.split('/');
  const activeTab = pathParts[pathParts.length - 1] || 'overview';

  const setActiveTab = (tab) => {
    navigate(`/dashboard/${tab}`);
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Command Overview';
      case 'vault': return 'Digital Asset Vault';
      case 'hunter': return 'Swarm Threat Hunter';
      case 'incidents': return 'Incident Response';
      case 'enforcer': return 'Legal Enforcement';
      case 'broker': return 'Monetization Broker';
      case 'notifications': return 'Intelligence Logs';
      default: return 'Command Center';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={getTitle()} />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Routes>
                <Route path="overview" element={<Overview />} />
                <Route path="vault" element={<AssetVault />} />
                <Route path="hunter" element={<ThreatHunter />} />
                <Route path="incidents" element={<IncidentTable />} />
                <Route path="enforcer" element={<LegalPanel />} />
                <Route path="broker" element={<BrokerPanel />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="/" element={<Navigate to="overview" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <SocketProvider>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </SocketProvider>
  );
};

export default Dashboard;
