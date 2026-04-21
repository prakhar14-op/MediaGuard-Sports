import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, AlertTriangle, CheckCircle, Database } from 'lucide-react';

const Security = () => {
  return (
    <div className="bg-[#020617] min-h-screen text-slate-300 pt-32 pb-20 px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20 text-center"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">SECURITY FIRST</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Your content is your most valuable asset. We use enterprise-grade security and decentralized verification to ensure it stays protected.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="bg-slate-900/40 border border-white/5 p-12 rounded-[3.5rem] flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20 mb-8">
              <Lock className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">Zero-Leak Fingerprinting</h3>
            <p className="text-slate-400 leading-relaxed">
              We never store your original video files on our servers. Instead, we generate one-way mathematical fingerprints (vectors) that are impossible to reverse-engineer, keeping your source data private.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-12 rounded-[3.5rem] flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20 mb-8">
              <Database className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">Polygon Ledger Integrity</h3>
            <p className="text-slate-400 leading-relaxed">
              Every detection, adjudication, and revenue contract is hashed and registered on the Polygon blockchain. This provides an immutable audit trail that can be used in international legal proceedings.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'DDoS Protection', desc: 'Global edge network filtering.', icon: Shield },
            { title: 'SOC2 Compliant', desc: 'Enterprise data handling standards.', icon: CheckCircle },
            { title: '24/7 Monitoring', desc: 'Autonomous uptime nodes.', icon: Eye }
          ].map((item, i) => (
            <div key={i} className="bg-slate-950/50 border border-white/5 p-6 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-xl">
                <item.icon className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{item.title}</h4>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Security;
