import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import ThreatMap from './ThreatMap';
import { motion } from 'framer-motion';

const ThreatHunter = () => {
  return (
    <div className="h-[calc(100vh-160px)] -mt-4 -mx-4 relative overflow-hidden rounded-[2.5rem] border border-white/5 shadow-2xl bg-slate-950">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]" />
      </div>

      <div className="relative h-full w-full">
        <ThreatMap />
      </div>

      {/* Subtle overlay for tech look */}
      <div className="absolute inset-0 pointer-events-none border-[20px] border-slate-950/20 rounded-[2.5rem]" />
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none opacity-40" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none opacity-40" />
    </div>
  );
};

export default ThreatHunter;
