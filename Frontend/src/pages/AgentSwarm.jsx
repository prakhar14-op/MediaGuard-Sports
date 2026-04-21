import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Search, Gavel, Coins, Database, Globe } from 'lucide-react';

const agents = [
  { 
    name: 'The Archivist', 
    role: 'Vault Manager', 
    desc: 'The brain of the operation. Uses CLIP to generate semantic fingerprints of official broadcasts and stores them in the FAISS vector vault.',
    icon: Database,
    color: 'blue'
  },
  { 
    name: 'The Spider', 
    role: 'OSINT Crawler', 
    desc: 'Autonomous crawler that navigates complex streaming sites, Telegram channels, and TikTok feeds without needing to download massive files.',
    icon: Search,
    color: 'indigo'
  },
  { 
    name: 'The Sentinel', 
    role: 'Detection Node', 
    desc: 'Performs real-time visual similarity checks and pHash comparisons against the vault to identify potential piracy with 99.9% accuracy.',
    icon: Globe,
    color: 'amber'
  },
  { 
    name: 'The Adjudicator', 
    role: 'Legal Analyst', 
    desc: 'Powered by Gemini 2.0. Analyzes the context of detected clips to determine if they are piracy or fair-use fan engagement.',
    icon: Shield,
    color: 'purple'
  },
  { 
    name: 'The Enforcer', 
    role: 'Executioner', 
    desc: 'Collects OSINT metadata and generates platform-specific DMCA notices. Humans only click "Execute" to dispatch the takedown.',
    icon: Gavel,
    color: 'red'
  },
  { 
    name: 'The Broker', 
    role: 'Revenue Optimizer', 
    desc: 'Converts fair-use engagement into revenue. Deploys smart contracts for revenue sharing on fan-created viral content.',
    icon: Coins,
    color: 'emerald'
  }
];

const AgentSwarm = () => {
  return (
    <div className="bg-[#020617] min-h-screen text-slate-300 pt-32 pb-20 px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20 text-center"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">AGENT SWARM</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Six specialized AI agents working in perfect harmony to detect, adjudicate, and monetize content across the global digital landscape.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {agents.map((agent, i) => (
            <motion.div 
              key={agent.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] group hover:border-white/10 hover:bg-slate-900/60 transition-all relative overflow-hidden"
            >
              <div className={`absolute -right-8 -top-8 w-32 h-32 bg-${agent.color}-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              <div className={`w-14 h-14 rounded-2xl bg-${agent.color}-500/10 border border-${agent.color}-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <agent.icon className={`w-7 h-7 text-${agent.color}-400`} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{agent.name}</h3>
              <p className={`text-xs font-bold text-${agent.color}-400 uppercase tracking-widest mb-4`}>{agent.role}</p>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">{agent.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentSwarm;
