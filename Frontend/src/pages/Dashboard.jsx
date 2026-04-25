import React from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { DashboardProvider } from '../context/DashboardContext';
import { SocketProvider } from '../context/SocketContext';

import Overview      from '../components/dashboard/Overview';
import AssetVault    from '../components/dashboard/AssetVault';
import ThreatHunter  from '../components/dashboard/ThreatHunter';
import IncidentTable from '../components/dashboard/IncidentTable';
import LegalPanel    from '../components/dashboard/LegalPanel';
import BrokerPanel   from '../components/dashboard/BrokerPanel';
import Notifications from '../components/dashboard/Notifications';

const TITLES = {
  overview:      'Command Overview',
  vault:         'Digital Asset Vault',
  hunter:        'Swarm Threat Hunter',
  incidents:     'Incident Response',
  enforcer:      'Legal Enforcement',
  broker:        'Monetization Broker',
  notifications: 'Intelligence Logs',
};

const DashboardContent = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const parts     = location.pathname.split('/');
  const activeTab = parts[parts.length - 1] || 'overview';
  const title     = TITLES[activeTab] || 'Command Center';

  return (
    <div className="flex min-h-screen" style={{ background: '#f6f7fc' }}>
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => navigate(`/dashboard/${tab}`)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />

        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <Routes>
                <Route path="overview"      element={<Overview />}      />
                <Route path="vault"         element={<AssetVault />}    />
                <Route path="hunter"        element={<ThreatHunter />}  />
                <Route path="incidents"     element={<IncidentTable />} />
                <Route path="enforcer"      element={<LegalPanel />}    />
                <Route path="broker"        element={<BrokerPanel />}   />
                <Route path="notifications" element={<Notifications />} />
                <Route path="/"             element={<Navigate to="overview" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
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
