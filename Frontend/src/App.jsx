import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <div className="min-h-screen" style={{ background: '#f6f7fc' }}>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid rgba(148,163,184,0.25)',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              fontSize: '0.82rem',
              fontWeight: '600',
            },
            success: {
              iconTheme: { primary: '#0d9488', secondary: '#ffffff' },
              style: { borderLeft: '3px solid #0d9488' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
              style: { borderLeft: '3px solid #ef4444' },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
