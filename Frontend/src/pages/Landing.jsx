import React from 'react';
import { 
  Radar, 
  Database, 
  Search, 
  Brain, 
  Gavel, 
  Coins, 
  ArrowRight, 
  Shield, 
  Zap,
  Globe,
  Lock,
  Cpu,
  CheckCircle,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, NavLink } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();
  const onLaunch = () => navigate('/dashboard/overview');

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { name: 'Technology', id: 'technology' },
    { name: 'Agent Swarm', id: 'agents' },
    { name: 'Security', id: 'security' },
    { name: 'Pricing', id: 'pricing' },
  ];

  const agentDetails = [
    { name: 'The Archivist', role: 'Vault Manager', desc: 'Fingerprinting via CLIP & FAISS.', icon: Database, color: 'blue' },
    { name: 'The Spider', role: 'OSINT Crawler', desc: 'Navigates CDN & TikTok nodes.', icon: Search, color: 'indigo' },
    { name: 'The Sentinel', role: 'Detection Node', desc: 'Real-time pHash similarity checks.', icon: Globe, color: 'amber' },
    { name: 'The Adjudicator', role: 'Legal Analyst', desc: 'Gemini-powered context reasoning.', icon: Shield, color: 'purple' },
    { name: 'The Enforcer', role: 'Executioner', desc: 'Automated DMCA metadata generation.', icon: Gavel, color: 'red' },
    { name: 'The Broker', role: 'Optimizer', desc: 'Rev-Share smart contract deployment.', icon: Coins, color: 'emerald' },
  ];

  const plans = [
    { name: 'Starter Swarm', price: '2,499', features: ['1 Agent (Sentinel)', '1,000 Assets', 'Standard DMCA'], color: 'blue' },
    { name: 'Pro Swarm', price: '9,999', features: ['Full 6-Agent Swarm', 'Unlimited Assets', 'Blockchain Registry', 'Monetization Broker'], color: 'blue', popular: true },
    { name: 'Elite Global', price: 'Custom', features: ['Dedicated Nodes', 'White-label Command', 'Global Legal Hub'], color: 'emerald' },
  ];

  return (
    <div className="bg-[#020617] text-slate-300 font-sans min-h-screen overflow-x-hidden selection:bg-blue-500/30 scroll-smooth">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header/Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:border-blue-500/40 transition-colors">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xl font-bold text-white tracking-tighter uppercase">MediaGuard<span className="text-blue-500">Sports</span></span>
          </button>
          
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map(item => (
              <button 
                key={item.id} 
                onClick={() => scrollToSection(item.id)}
                className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
              >
                {item.name}
              </button>
            ))}
          </nav>

          <button
            onClick={onLaunch}
            className="group relative px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 flex items-center gap-2 overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.2)]"
          >
            <span className="relative z-10 flex items-center gap-2">Launch Command Center <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-48 pb-32 px-8 max-w-7xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">Next-Gen IP Protection</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight leading-[0.9] mb-8">
            AUTONOMOUS <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">THREAT INTELLIGENCE</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed tracking-wide font-medium">
            A 6-agent AI swarm that detects, adjudicates, and monetizes pirated sports content at scale.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onLaunch} className="px-8 py-4 bg-white text-slate-950 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-xl">
              Launch Swarm
            </button>
            <button onClick={() => scrollToSection('technology')} className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-all">
              Learn Technology
            </button>
          </div>
        </motion.div>
      </section>

      {/* Technology Section */}
      <section id="technology" className="py-32 px-8 max-w-7xl mx-auto relative z-10 border-t border-white/5">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter">Technology Stack</h2>
          <div className="w-20 h-1 bg-blue-500 mx-auto rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-slate-900/40 border border-white/5 p-10 rounded-[3rem] space-y-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <Brain className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-3xl font-bold text-white uppercase tracking-tight">Neural Fingerprinting</h3>
            <p className="text-slate-400 leading-relaxed font-medium">Using CLIP embeddings to extract semantic identity from video frames, enabling detection even through filters, crops, or speed shifts.</p>
          </div>
          <div className="bg-slate-900/40 border border-white/5 p-10 rounded-[3rem] space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Database className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-bold text-white uppercase tracking-tight">FAISS Vector Vault</h3>
            <p className="text-slate-400 leading-relaxed font-medium">Ultra-fast similarity search across billions of indexed assets using Facebook's high-performance vector search library.</p>
          </div>
        </div>
      </section>

      {/* Agent Swarm Section */}
      <section id="agents" className="py-32 px-8 max-w-7xl mx-auto relative z-10 border-t border-white/5">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter">Autonomous Swarm</h2>
          <p className="text-slate-400 font-medium">Six specialized agents working in perfect coordination.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agentDetails.map((agent, i) => (
            <motion.div 
              key={agent.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] group hover:border-white/10 transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl bg-${agent.color}-500/10 border border-${agent.color}-500/20 flex items-center justify-center mb-6`}>
                <agent.icon className={`w-6 h-6 text-${agent.color}-400`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-tight">{agent.name}</h3>
              <p className={`text-[10px] font-black text-${agent.color}-400 uppercase tracking-widest mb-3`}>{agent.role}</p>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">{agent.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-32 px-8 max-w-7xl mx-auto relative z-10 border-t border-white/5">
        <div className="bg-gradient-to-br from-slate-900/40 to-blue-900/10 border border-white/5 rounded-[4rem] p-12 md:p-20 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 uppercase tracking-tighter">Enterprise Security</h2>
            <div className="space-y-6">
              {[
                { title: 'Zero-Leak Policy', desc: 'Original files never leave your infrastructure.', icon: Shield },
                { title: 'Polygon Ledger', desc: 'Immutable audit trails for every enforcement.', icon: Database },
                { title: 'SOC2 Standards', desc: 'Bank-grade data encryption and handling.', icon: CheckCircle },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 p-2 bg-blue-500/10 rounded-lg">
                    <item.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase text-sm tracking-tight">{item.title}</h4>
                    <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full md:w-96 aspect-square bg-slate-950 border border-white/5 rounded-[3rem] flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
            <Shield className="w-32 h-32 text-blue-500/20 group-hover:scale-110 transition-transform duration-500" />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-8 max-w-7xl mx-auto relative z-10 border-t border-white/5">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter">Swarm Deployment Plans</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div key={plan.name} className={`bg-slate-900/40 border ${plan.popular ? 'border-blue-500/40 shadow-2xl shadow-blue-500/10' : 'border-white/5'} p-10 rounded-[3rem] flex flex-col relative overflow-hidden`}>
              {plan.popular && <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-black uppercase px-6 py-2 rounded-bl-3xl">Most Deployed</div>}
              <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">{plan.name}</h3>
              <div className="mb-8">
                <span className="text-4xl font-black text-white">{plan.price === 'Custom' ? '' : '$'}{plan.price}</span>
                {plan.price !== 'Custom' && <span className="text-xs text-slate-500 font-bold uppercase ml-2">/ month</span>}
              </div>
              <div className="space-y-4 mb-10 flex-1">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-400">{f}</span>
                  </div>
                ))}
              </div>
              <button className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                Initialize Swarm
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-20 px-8 border-t border-white/5 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Shield className="w-6 h-6 text-blue-500" />
          <span className="text-xl font-bold text-white tracking-tighter uppercase">MediaGuard<span className="text-blue-500">Sports</span></span>
        </div>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">© 2026 Autonomous Intelligence Network. Global IP Protection Protocol.</p>
      </footer>
    </div>
  );
};

export default Landing;
