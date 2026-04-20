import React from 'react';
import {
  Shield, Bell, Search, Globe, Database, Folder, ShieldAlert,
  ArchiveX, Activity, AlertTriangle, CheckCircle, Fingerprint, Loader
} from 'lucide-react';

function Dashboard({ onBack }) {
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-300 font-sans overflow-hidden selection:bg-blue-500/30">
      {/* Top Header */}
      <header className="flex flex-row items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950 shrink-0 relative z-10 shadow-sm shadow-black/20">
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={onBack}>
          <div className="p-1.5 bg-blue-500/10 rounded-lg">
            <Shield className="w-6 h-6 text-blue-500 border border-blue-500/20 rounded-md" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">MediaGuard Sports</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          <span className="text-xs font-semibold text-emerald-500 tracking-wider uppercase">SYSTEM ONLINE: Global Node Monitoring Active</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search media hashes..." 
              className="bg-slate-900 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-64"
            />
          </div>
          <button className="relative text-slate-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-slate-950 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 p-[2px] cursor-pointer hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-slate-800 border border-slate-950 overflow-hidden">
              <img src="https://i.pravatar.cc/100?img=33" alt="User Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Below Header */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-1 shrink-0 overflow-y-auto">
          <div className="mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-3">Section 1 (Core)</span>
          </div>
          <nav className="flex flex-col gap-1 mb-6">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-blue-900/30 text-blue-400 rounded-md font-medium text-sm border border-blue-500/20 shadow-sm transition-colors">
              <Globe className="w-4 h-4 shrink-0" />
              Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-900 hover:text-white rounded-md font-medium text-sm transition-colors">
              <Database className="w-4 h-4 shrink-0 text-slate-400" />
              Live Radar
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-900 hover:text-white rounded-md font-medium text-sm transition-colors">
              <Folder className="w-4 h-4 shrink-0 text-slate-400" />
              Asset Vault
            </a>
          </nav>

          <div className="mb-2 mt-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-3">Section 2 (Enforcement)</span>
          </div>
          <nav className="flex flex-col gap-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-900 hover:text-white rounded-md font-medium text-sm transition-colors">
              <ShieldAlert className="w-4 h-4 shrink-0 text-slate-400" />
              IP Violations
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-900 hover:text-white rounded-md font-medium text-sm transition-colors relative group">
              <ArchiveX className="w-4 h-4 shrink-0 text-slate-400" />
              Takedown Requests
              <span className="absolute right-3 bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 border border-red-500/30 rounded font-bold group-hover:bg-red-500/30 transition-colors">12</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-900 hover:text-white rounded-md font-medium text-sm transition-colors">
              <Activity className="w-4 h-4 shrink-0 text-slate-400" />
              Analytics
            </a>
          </nav>
        </aside>

        {/* Center Content */}
        <main className="flex-1 flex flex-col p-6 gap-6 bg-slate-950 min-w-0 h-full overflow-hidden">
          
          {/* Global Propagation Map — 60% height */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg shadow-black/20 h-[60%] shrink-0">
            <div className="flex items-center gap-3 mb-3 px-1 shrink-0">
              <h2 className="text-lg font-bold text-white tracking-wide">Real-Time Media Propagation</h2>
              <span className="bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded shadow-[0_0_8px_rgba(59,130,246,0.3)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                Live
              </span>
            </div>
            
            <div className="relative w-full flex-1 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden"
                 style={{ backgroundImage: 'radial-gradient(rgb(30, 41, 59) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
              
              {/* ===== WORLD MAP SVG (Background z-0) ===== */}
              <svg
                className="absolute inset-0 w-full h-full z-0 pointer-events-none"
                viewBox="0 0 1000 500"
                preserveAspectRatio="xMidYMid slice"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g className="fill-slate-700" opacity="0.25">
                  {/* North America */}
                  <path d="M150,90 L170,80 L195,75 L220,80 L240,95 L250,110 L260,100 L275,105 L280,120 L270,135 L260,150 L250,165 L235,175 L220,185 L210,200 L200,210 L195,225 L185,230 L175,225 L165,215 L155,205 L140,195 L130,180 L120,165 L115,150 L110,135 L115,120 L125,105 L140,95 Z"/>
                  <path d="M195,225 L210,235 L225,240 L240,250 L250,260 L245,270 L235,275 L220,270 L205,260 L195,250 L190,240 Z"/>
                  {/* South America */}
                  <path d="M240,280 L255,275 L270,280 L280,295 L285,310 L290,330 L285,350 L280,370 L270,385 L260,395 L250,405 L240,410 L235,400 L230,385 L228,365 L225,345 L222,325 L225,305 L230,290 Z"/>
                  {/* Europe */}
                  <path d="M430,85 L445,80 L460,75 L475,80 L490,85 L500,95 L505,110 L510,125 L505,135 L495,140 L485,145 L475,150 L460,155 L450,150 L440,140 L435,125 L430,110 L425,100 Z"/>
                  <path d="M460,155 L470,160 L480,165 L490,160 L500,155 L510,150 L515,140 L520,145 L525,155 L520,165 L510,170 L500,175 L490,170 L480,175 L470,170 Z"/>
                  {/* Africa */}
                  <path d="M450,190 L465,185 L480,190 L495,200 L510,215 L520,235 L525,255 L530,275 L525,295 L520,315 L510,335 L500,350 L490,360 L480,365 L470,360 L460,350 L452,335 L448,315 L445,295 L442,275 L440,255 L438,235 L440,215 L445,200 Z"/>
                  {/* Asia */}
                  <path d="M530,70 L560,60 L590,55 L620,50 L650,55 L680,60 L710,65 L740,75 L760,85 L770,100 L775,115 L780,130 L775,145 L765,155 L750,160 L735,165 L720,170 L700,175 L680,180 L660,185 L640,180 L620,175 L600,170 L580,160 L565,150 L550,135 L540,120 L535,105 L530,90 Z"/>
                  <path d="M600,170 L615,180 L630,190 L645,195 L660,200 L670,210 L675,225 L670,235 L660,240 L645,235 L630,225 L615,215 L605,200 L600,185 Z"/>
                  {/* India/SE Asia */}
                  <path d="M620,175 L635,185 L645,200 L650,215 L648,230 L640,245 L630,255 L620,260 L610,255 L605,240 L608,225 L612,210 L615,195 Z"/>
                  {/* Indonesia/Oceania */}
                  <path d="M700,250 L715,245 L730,248 L740,255 L735,265 L720,268 L708,262 Z"/>
                  <path d="M750,255 L765,250 L775,258 L770,268 L758,265 Z"/>
                  <path d="M690,275 L705,272 L715,278 L710,288 L698,285 Z"/>
                  {/* Australia */}
                  <path d="M740,310 L760,300 L780,295 L800,300 L815,310 L825,325 L830,340 L825,355 L815,365 L800,370 L785,368 L770,360 L758,350 L750,340 L745,325 Z"/>
                  {/* Japan / Islands */}
                  <path d="M790,100 L798,95 L805,100 L810,115 L808,130 L800,140 L792,135 L788,120 L786,110 Z"/>
                  {/* Greenland */}
                  <path d="M310,40 L330,35 L350,38 L365,45 L370,58 L365,70 L350,75 L335,72 L320,65 L310,55 Z"/>
                  {/* UK/Ireland */}
                  <path d="M415,95 L422,90 L428,95 L430,105 L425,112 L418,110 L414,102 Z"/>
                </g>
              </svg>

              {/* ===== CONNECTION LINES SVG (Foreground z-10) ===== */}
              <svg
                className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                viewBox="0 0 1000 500"
                preserveAspectRatio="xMidYMid slice"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>

                {/* Central EU-West hub: roughly (470, 130) */}
                {/* Blue curved lines to 4 safe nodes */}
                <path d="M470,130 Q380,60 200,150" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.7" filter="url(#glowBlue)">
                  <animate attributeName="stroke-dashoffset" from="0" to="-60" dur="3s" repeatCount="indefinite"/>
                </path>
                <path d="M470,130 Q550,60 760,110" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.7" filter="url(#glowBlue)" strokeDasharray="6,8">
                  <animate attributeName="stroke-dashoffset" from="0" to="-60" dur="4s" repeatCount="indefinite"/>
                </path>
                <path d="M470,130 Q500,220 630,230" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.7" filter="url(#glowBlue)" strokeDasharray="6,8">
                  <animate attributeName="stroke-dashoffset" from="0" to="-60" dur="3.5s" repeatCount="indefinite"/>
                </path>
                <path d="M470,130 Q440,220 470,310" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.7" filter="url(#glowBlue)" strokeDasharray="6,8">
                  <animate attributeName="stroke-dashoffset" from="0" to="-60" dur="5s" repeatCount="indefinite"/>
                </path>

                {/* Red dashed line to unauthorized node at ~(780,310) */}
                <path d="M470,130 Q650,180 780,310" stroke="#ef4444" strokeWidth="2" fill="none" opacity="0.8" strokeDasharray="5,5" filter="url(#glowRed)">
                  <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="2s" repeatCount="indefinite"/>
                </path>

                {/* Safe node dots (blue) */}
                <circle cx="200" cy="150" r="5" fill="#3b82f6" opacity="0.9"/>
                <circle cx="200" cy="150" r="8" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.5">
                  <animate attributeName="r" from="5" to="14" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/>
                </circle>

                <circle cx="760" cy="110" r="5" fill="#3b82f6" opacity="0.9"/>
                <circle cx="630" cy="230" r="4" fill="#3b82f6" opacity="0.9"/>
                <circle cx="470" cy="310" r="4" fill="#3b82f6" opacity="0.9"/>

                {/* Central hub node (EU-West) */}
                <circle cx="470" cy="130" r="7" fill="#3b82f6"/>
                <circle cx="470" cy="130" r="12" fill="none" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" from="7" to="20" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.7" to="0" dur="1.5s" repeatCount="indefinite"/>
                </circle>

                {/* Unauthorized node (red, pulsing) */}
                <circle cx="780" cy="310" r="6" fill="#ef4444"/>
                <circle cx="780" cy="310" r="10" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.7">
                  <animate attributeName="r" from="6" to="18" dur="1.2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.8" to="0" dur="1.2s" repeatCount="indefinite"/>
                </circle>
              </svg>

              {/* ===== FLOATING UI BADGES (z-20) ===== */}
              {/* Official Broadcast Badge — near EU-West hub */}
              <div className="absolute top-[18%] left-[38%] bg-slate-900/90 backdrop-blur-sm border border-blue-500/30 shadow-lg shadow-blue-500/10 rounded-md px-3 py-2 flex items-center gap-2 z-20">
                <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200 whitespace-nowrap">Official Broadcast: Region EU-West</span>
              </div>

              {/* Anomaly Detected Badge — near unauthorized node */}
              <div className="absolute top-[68%] left-[62%] bg-slate-900/95 backdrop-blur-sm border border-red-500/50 shadow-lg shadow-red-500/20 rounded-md px-3 py-2 flex items-center gap-2 z-20">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-100 tracking-wide whitespace-nowrap">Anomaly Detected: Unauthorized Stream (Domain XYZ)</span>
              </div>
            </div>
          </div>

          {/* Live Incident Feed — 40% height */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[40%] shrink-0 overflow-hidden shadow-lg shadow-black/20">
            <div className="p-4 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-200 tracking-wide">Live Incident Feed</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="font-medium p-3 pl-5 border-b border-slate-800 w-24">Severity</th>
                    <th className="font-medium p-3 border-b border-slate-800">Incident Details</th>
                    <th className="font-medium p-3 border-b border-slate-800 w-40">Status</th>
                    <th className="font-medium p-3 pr-5 border-b border-slate-800 text-right w-28">Confidence</th>
                  </tr>
                </thead>
                <tbody className="text-sm bg-slate-900/50">
                  
                  {/* Row 1: Critical */}
                  <tr className="hover:bg-slate-800/50 transition-colors border-l-[3px] border-l-red-500">
                    <td className="p-3 pl-5 align-middle">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-900/30 text-red-400 text-xs font-bold border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        CRITICAL
                      </span>
                    </td>
                    <td className="p-3 align-middle">
                      <div className="font-medium text-slate-200">High-Value Asset Misappropriation</div>
                      <div className="text-slate-400 text-xs mt-0.5">Target: 'Finals Highlight Clip' | Signature Mismatch</div>
                    </td>
                    <td className="p-3 align-middle">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Takedown Pending
                      </span>
                    </td>
                    <td className="p-3 pr-5 align-middle text-right">
                      <div className="font-mono font-bold text-slate-300">99.8%</div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div className="bg-red-500 h-full w-[99.8%] rounded-full"></div>
                      </div>
                    </td>
                  </tr>

                  {/* Row 2: Warning */}
                  <tr className="hover:bg-slate-800/50 transition-colors border-l-[3px] border-l-yellow-500">
                    <td className="p-3 pl-5 align-middle">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-900/30 text-yellow-500 text-xs font-bold border border-yellow-500/20">
                        <Activity className="w-3 h-3" />
                        WARNING
                      </span>
                    </td>
                    <td className="p-3 align-middle">
                      <div className="font-medium text-slate-200">Social Media Scraping Detected</div>
                      <div className="text-slate-400 text-xs mt-0.5">Source: Twitter/X Bot Network</div>
                    </td>
                    <td className="p-3 align-middle">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
                        <Loader className="w-3 h-3 animate-spin" />
                        Investigating
                      </span>
                    </td>
                    <td className="p-3 pr-5 align-middle text-right">
                      <div className="font-mono font-bold text-slate-300">87.4%</div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div className="bg-yellow-500 h-full w-[87.4%] rounded-full"></div>
                      </div>
                    </td>
                  </tr>

                  {/* Row 3: Info */}
                  <tr className="hover:bg-slate-800/50 transition-colors border-l-[3px] border-l-blue-500">
                    <td className="p-3 pl-5 align-middle">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-xs font-bold border border-blue-500/20">
                        <Shield className="w-3 h-3" />
                        INFO
                      </span>
                    </td>
                    <td className="p-3 align-middle">
                      <div className="font-medium text-slate-200">Partner Sync Successful</div>
                      <div className="text-slate-400 text-xs mt-0.5">Integration: ESPN Global API</div>
                    </td>
                    <td className="p-3 align-middle">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    </td>
                    <td className="p-3 pr-5 align-middle text-right">
                      <div className="font-mono font-bold text-slate-300">92.0%</div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div className="bg-blue-500 h-full w-[92%] rounded-full"></div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Right Sidebar (Widgets) */}
        <aside className="w-80 bg-slate-950 border-l border-slate-800 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
          
          {/* Widget 1: Proactive Watermarking */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-200 tracking-wider">Proactive Watermarking</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md text-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 shadow-inner">
                  <Fingerprint className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Processing</div>
                  <div className="text-slate-200 font-medium truncate w-40 text-[13px]" title="Match_Day_Vlog_04.mp4">Match_Day_Vlog_04.mp4</div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium">Authentication Engine</span>
                  <span className="text-blue-400 font-mono font-bold">75%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-full">
                  <div className="h-full bg-blue-500 w-[75%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 text-xs font-medium">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  Content Fingerprinted
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  Invisible Watermark Injected
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <Loader className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                  <span className="text-blue-400">Hash Registered to Ledger...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 2: 24H Global Scrape Stats */}
          <div className="flex flex-col gap-3">
             <h3 className="text-sm font-bold text-slate-200 tracking-wider">24H Global Scrape Stats</h3>
             <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors rounded-lg p-3.5 shadow-sm">
                  <div className="text-xs text-slate-400 font-medium mb-1 line-clamp-1">Assets Tracked</div>
                  <div className="text-xl font-bold font-mono text-blue-400 tracking-tight">1.4M</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors rounded-lg p-3.5 shadow-sm">
                  <div className="text-xs text-slate-400 font-medium mb-1 line-clamp-1">Violations Found</div>
                  <div className="text-xl font-bold font-mono text-red-500 tracking-tight">342</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors rounded-lg p-3.5 shadow-sm">
                  <div className="text-xs text-slate-400 font-medium mb-1 line-clamp-1">DMCA Issued</div>
                  <div className="text-xl font-bold font-mono text-orange-400 tracking-tight">310</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors rounded-lg p-3.5 shadow-sm">
                  <div className="text-xs text-slate-400 font-medium mb-1 line-clamp-1">Success Rate</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 tracking-tight">92%</div>
                </div>
             </div>
          </div>

          {/* Widget 3: Platform Distribution */}
          <div className="flex flex-col gap-3 mt-2">
            <h3 className="text-sm font-bold text-slate-200 tracking-wider">Platform Distribution</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
              
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300">Telegram</span>
                  <span className="text-red-400 font-mono">45%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full w-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[45%] rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300">Unregistered Domains</span>
                  <span className="text-orange-400 font-mono">35%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full w-full overflow-hidden">
                  <div className="h-full bg-orange-400 w-[35%] rounded-full shadow-[0_0_8px_rgba(251,146,60,0.5)]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300">Reddit</span>
                  <span className="text-yellow-500 font-mono">20%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full w-full overflow-hidden">
                  <div className="h-full bg-yellow-500 w-[20%] rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                </div>
              </div>

            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}

export default Dashboard;
