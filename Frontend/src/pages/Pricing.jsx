import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Shield, Globe, Cpu, ArrowRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const plans = [
  {
    name: 'Starter Swarm',
    price: '2,499',
    desc: 'Perfect for niche sports leagues and independent promoters.',
    features: ['1 Autonomous Agent (Sentinel)', '1,000 Assets Tracked', 'Standard DMCA Notices', 'Email Support'],
    color: 'blue'
  },
  {
    name: 'Pro Swarm',
    price: '9,999',
    desc: 'The complete IP protection suite for national leagues.',
    features: ['Full 6-Agent Swarm', 'Unlimited Assets', 'Blockchain Registry', 'Monetization Broker', 'Priority AI Processing'],
    color: 'blue',
    popular: true
  },
  {
    name: 'Elite / Global',
    price: 'Custom',
    desc: 'Bespoke infrastructure for the world\'s largest sports media groups.',
    features: ['Dedicated Neural Nodes', 'White-label Command Center', 'Global Legal Support', '24/7 Crisis Response'],
    color: 'emerald'
  }
];

const Pricing = () => {
  return (
    <div className="bg-[#020617] min-h-screen text-slate-300 pt-32 pb-20 px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20 text-center"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">TRANSPARENT PRICING</h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Choose the swarm density that fits your league's needs. Scale protection as your global fan base grows.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div 
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`bg-slate-900/40 border ${plan.popular ? 'border-blue-500/40 shadow-[0_0_40px_rgba(59,130,246,0.15)]' : 'border-white/5'} p-10 rounded-[3rem] relative flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                  Most Deployed
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{plan.desc}</p>
              </div>

              <div className="mb-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{plan.price === 'Custom' ? '' : '$'}{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">/ Month</span>}
                </div>
              </div>

              <div className="space-y-4 mb-12 flex-1">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="p-1 bg-emerald-500/10 rounded-full">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              <button className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${plan.popular ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}>
                Deploy Swarm
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
