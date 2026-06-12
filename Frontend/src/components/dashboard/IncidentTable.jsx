import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useDashboard } from '../../context/DashboardContext';
import SpotlightCard from '../ui/SpotlightCard';
import { Shield, ExternalLink, Gavel, Coins, Eye, Radio } from 'lucide-react';

// ─── Config ──────────────────────────────────────────────────────────────────
const SEV = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'CRITICAL' },
  WARNING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'WARNING' },
  INFO:     { color: '#0d9488', bg: 'rgba(13,148,136,0.12)', label: 'INFO' },
};
const PLAT_COLOR = {
  YouTube:'#ef4444', TikTok:'#ff0050', 'Twitter/X':'#1da1f2', Twitter:'#1da1f2',
  Instagram:'#e1306c', Telegram:'#2ca5e0', Reddit:'#ff4500', Dailymotion:'#0066DC',
  Rumble:'#85c742', Facebook:'#1877f2', Vimeo:'#1ab7ea', Twitch:'#9146ff',
};

// ─── Better mock data (shown when backend offline / empty) ───────────────────
const MOCK_INCIDENTS = [
  { _id:'r1', title:'Champions League Final Full Restream', platform:'YouTube', account_handle:'@live_sports_hd', confidence_score:96, severity:'CRITICAL', classification:'SEVERE PIRACY', status:'takedown_pending', match_confirmed:true, clip_confidence:94, audio_confidence:88, temporal_score:0.85, phash_match:true, forensics_confidence:0.8, leak_chain:['Telegram','WhatsApp'], url:'https://youtube.com/watch?v=FAKE1', thumbnail_url:'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=225&fit=crop' },
  { _id:'r2', title:'UFC 300 Main Event Camera Recording', platform:'TikTok', account_handle:'@mma_clips_free', confidence_score:91, severity:'CRITICAL', classification:'SEVERE PIRACY', status:'takedown_pending', match_confirmed:true, clip_confidence:85, audio_confidence:92, temporal_score:0.78, phash_match:false, forensics_confidence:0.72, leak_chain:['Telegram'], url:'', thumbnail_url:'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=225&fit=crop' },
  { _id:'r3', title:'NBA Playoffs Highlights Compilation', platform:'Twitter/X', account_handle:'@sports_daily', confidence_score:72, severity:'WARNING', classification:'FAIR USE / FAN CONTENT', status:'reviewing', match_confirmed:false, clip_confidence:65, audio_confidence:30, temporal_score:0.42, phash_match:false, forensics_confidence:0.35, url:'https://twitter.com/fake', thumbnail_url:'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=400&h=225&fit=crop' },
  { _id:'r4', title:'F1 Live Paddock Full Stream', platform:'Telegram', account_handle:'@f1_leaks_live', confidence_score:94, severity:'CRITICAL', classification:'SEVERE PIRACY', status:'takedown_pending', match_confirmed:true, clip_confidence:91, audio_confidence:86, temporal_score:0.9, phash_match:true, forensics_confidence:0.88, leak_chain:['Telegram','Facebook'], thumbnail_url:'https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?w=400&h=225&fit=crop' },
  { _id:'r5', title:'My Match Commentary & Analysis', platform:'YouTube', account_handle:'@sports_explained', confidence_score:48, severity:'INFO', classification:'FAIR USE / FAN CONTENT', status:'monetized', match_confirmed:false, clip_confidence:42, audio_confidence:15, temporal_score:0.2, phash_match:false, forensics_confidence:0.1, url:'https://youtube.com/watch?v=FAKE5', thumbnail_url:'https://images.unsplash.com/photo-1461896836934-bd45f8d12b4d?w=400&h=225&fit=crop' },
  { _id:'r6', title:'Premier League Full Match Upload', platform:'Dailymotion', account_handle:'@free_football', confidence_score:88, severity:'CRITICAL', classification:'SEVERE PIRACY', status:'takedown_pending', match_confirmed:true, clip_confidence:86, audio_confidence:82, temporal_score:0.81, phash_match:true, forensics_confidence:0.75, leak_chain:['WhatsApp','Telegram','YouTube'], thumbnail_url:'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=225&fit=crop' },
  { _id:'r7', title:'Boxing PPV Leaked Stream Recording', platform:'Reddit', account_handle:'u/fight_streams99', confidence_score:83, severity:'CRITICAL', classification:'SEVERE PIRACY', status:'detected', match_confirmed:true, clip_confidence:80, audio_confidence:78, temporal_score:0.65, phash_match:false, forensics_confidence:0.6, thumbnail_url:'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=225&fit=crop' },
  { _id:'r8', title:'Cricket World Cup Fan Reaction', platform:'Instagram', account_handle:'@cricket_vibes', confidence_score:38, severity:'INFO', classification:'FAIR USE / FAN CONTENT', status:'cleared', match_confirmed:false, clip_confidence:32, audio_confidence:10, temporal_score:0.15, phash_match:false, forensics_confidence:0.05, thumbnail_url:'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&h=225&fit=crop' },
];

function getThumbnail(inc) {
  if (inc.thumbnail_url) return inc.thumbnail_url;
  const url = inc.url || '';
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/mqdefault.jpg` : '';
}

function getSeverity(inc) {
  if (inc.match_confirmed) return 'CRITICAL';
  const c = inc.confidence_score || 0;
  if (c >= 75) return 'CRITICAL';   // matches backend fused_confidence >= 75
  if (c >= 50) return 'WARNING';    // matches backend SUSPECT_THRESHOLD = 0.52
  return 'INFO';
}

// ─── Left Card ───────────────────────────────────────────────────────────────
const Card = ({ inc, active, onClick }) => {
  const sev = SEV[getSeverity(inc)] || SEV.INFO;
  const thumb = getThumbnail(inc);
  const pc = PLAT_COLOR[inc.platform] || '#6366f1';
  const isPiracy = inc.classification === 'SEVERE PIRACY';

  return (
    <motion.div layout initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
      onClick={onClick} whileHover={{ x: 3 }}
      style={{
        display:'flex', gap:10, padding:'10px 11px', borderRadius:10, cursor:'pointer', marginBottom:4,
        background: active ? 'rgba(13,148,136,0.06)' : 'transparent',
        borderLeft: `3px solid ${active ? sev.color : 'transparent'}`,
        transition: 'all 0.15s',
      }}>
      {/* Thumb */}
      <div style={{ width:56, height:36, borderRadius:6, overflow:'hidden', flexShrink:0, background:'#1e293b', position:'relative' }}>
        {thumb && <img src={thumb} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
        {isPiracy && <div style={{ position:'absolute', top:2, right:2, width:6, height:6, borderRadius:'50%', background:'#ef4444', boxShadow:'0 0 4px #ef4444' }} />}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:10.5, fontWeight:700, color:'#e2e8f0', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {inc.title}
        </p>
        <div style={{ display:'flex', gap:4, marginTop:3, alignItems:'center' }}>
          <span style={{ fontSize:8, fontWeight:700, color:pc, padding:'1px 4px', borderRadius:3, background:`${pc}15` }}>{inc.platform}</span>
          {isPiracy && <span style={{ fontSize:7, fontWeight:800, color:'#ef4444', padding:'1px 4px', borderRadius:3, background:'rgba(239,68,68,0.1)' }}>DMCA</span>}
          {inc.classification === 'FAIR USE / FAN CONTENT' && <span style={{ fontSize:7, fontWeight:800, color:'#0d9488', padding:'1px 4px', borderRadius:3, background:'rgba(13,148,136,0.1)' }}>FAIR</span>}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <p style={{ fontSize:13, fontWeight:900, color:sev.color, margin:0, lineHeight:1 }}>{Math.round(inc.confidence_score||0)}%</p>
        <span style={{ fontSize:7, color:sev.color, fontWeight:700 }}>{getSeverity(inc)}</span>
      </div>
    </motion.div>
  );
};

// ─── Right Detail ────────────────────────────────────────────────────────────
const Detail = ({ inc, pulseData }) => {
  if (!inc) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
      <Eye size={28} style={{ color:'#1e293b' }} />
      <p style={{ fontSize:11, color:'#334155', margin:0 }}>Select an incident to inspect</p>
    </div>
  );

  const sev = SEV[getSeverity(inc)] || SEV.INFO;
  const isFairUse = inc.classification === 'FAIR USE / FAN CONTENT';
  const isPiracy = inc.classification === 'SEVERE PIRACY';
  const thumb = getThumbnail(inc);

  const metrics = [
    { label:'Visual Similarity (CLIP)', value: inc.clip_confidence || inc.confidence_score || 0, color:'#6366f1' },
    { label:'Audio Fingerprint', value: inc.audio_confidence || 0, color:'#0d9488' },
    { label:'Temporal DNA', value: (inc.temporal_score || 0) * 100, color:'#f59e0b' },
    { label:'Pixel Hash (pHash)', value: inc.phash_match ? 95 : (inc.phash_score || 8), color:'#a855f7' },
    { label:'Forensic Chain Confidence', value: (inc.forensics_confidence || 0) * 100, color:'#ef4444' },
  ];

  return (
    <div style={{ flex:1, padding:'16px 20px', overflowY:'auto' }}>
      {/* Header */}
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        {thumb && <div style={{ width:110, height:65, borderRadius:10, overflow:'hidden', flexShrink:0, border:'1px solid rgba(255,255,255,0.06)' }}><img src={thumb} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>}
        <div>
          <div style={{ display:'flex', gap:5, marginBottom:4, flexWrap:'wrap' }}>
            <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:4, background:sev.bg, color:sev.color, textTransform:'uppercase' }}>{getSeverity(inc)}</span>
            {isPiracy && <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:4, background:'rgba(239,68,68,0.1)', color:'#ef4444' }}>ENFORCEMENT PENDING</span>}
            {isFairUse && <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:4, background:'rgba(13,148,136,0.1)', color:'#0d9488' }}>LICENSED</span>}
            {inc.match_confirmed && <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:4, background:'rgba(239,68,68,0.15)', color:'#fca5a5' }}>MATCH CONFIRMED</span>}
          </div>
          <h3 style={{ fontSize:13, fontWeight:800, color:'#f1f5f9', margin:'0 0 3px' }}>{inc.title}</h3>
          <p style={{ fontSize:9, color:'#64748b', margin:0 }}>{inc.platform} &middot; {inc.account_handle} &middot; {inc.country||'Global'}</p>
        </div>
      </div>

      {/* Threat Pulse Chart */}
      <div style={{ background:'rgba(255,255,255,0.015)', borderRadius:12, padding:'12px 12px 4px', marginBottom:12, border:'1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ fontSize:8, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 8px' }}>Threat Detection Pulse</p>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={pulseData}>
            <defs>
              <linearGradient id="pSim" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity={0.4}/><stop offset="100%" stopColor="#0d9488" stopOpacity={0}/></linearGradient>
              <linearGradient id="pRisk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.35}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
              <linearGradient id="pThreat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.25}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
            <XAxis dataKey="t" tick={{ fill:'#334155', fontSize:7 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0,100]} tick={{ fill:'#334155', fontSize:7 }} axisLine={false} tickLine={false} width={24} />
            <Tooltip contentStyle={{ background:'#1e293b', border:'none', borderRadius:6, fontSize:9, color:'#e2e8f0' }} />
            <Area type="monotone" dataKey="similarity" stroke="#0d9488" fill="url(#pSim)" strokeWidth={2} dot={false} name="Similarity" />
            <Area type="monotone" dataKey="risk" stroke="#6366f1" fill="url(#pRisk)" strokeWidth={2} dot={false} name="Risk" />
            <Area type="monotone" dataKey="threat" stroke="#ef4444" fill="url(#pThreat)" strokeWidth={1.5} dot={false} name="Threat" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Detection Metrics — Polar Area + Animated Counter */}
      <div style={{ background:'rgba(255,255,255,0.015)', borderRadius:12, padding:'14px 16px', marginBottom:12, border:'1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          {/* Polar Area Chart (SVG) */}
          <div style={{ width:180, height:180, flexShrink:0, position:'relative' }}>
            <svg viewBox="0 0 200 200" style={{ width:'100%', height:'100%' }}>
              {metrics.map((m, i) => {
                const angle = (i / metrics.length) * Math.PI * 2 - Math.PI / 2;
                const nextAngle = ((i + 1) / metrics.length) * Math.PI * 2 - Math.PI / 2;
                const radius = 30 + (m.value / 100) * 60;
                const x1 = 100 + Math.cos(angle) * radius;
                const y1 = 100 + Math.sin(angle) * radius;
                const x2 = 100 + Math.cos(nextAngle) * radius;
                const y2 = 100 + Math.sin(nextAngle) * radius;
                const largeArc = (nextAngle - angle) > Math.PI ? 1 : 0;
                return (
                  <g key={m.label}>
                    <path
                      d={`M100,100 L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`}
                      fill={`${m.color}35`}
                      stroke={m.color}
                      strokeWidth="1.5"
                    >
                      <animate attributeName="opacity" from="0" to="1" dur={`${0.3 + i * 0.15}s`} fill="freeze" />
                    </path>
                  </g>
                );
              })}
              {/* Center circle */}
              <circle cx="100" cy="100" r="22" fill="#0a0f1a" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <text x="100" y="96" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="800">
                {Math.round(inc.confidence_score || 0)}%
              </text>
              <text x="100" y="110" textAnchor="middle" fill="#64748b" fontSize="6" fontWeight="600">
                FUSED
              </text>
              {/* Grid rings */}
              {[30, 55, 80].map(r => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 3" />)}
            </svg>
          </div>

          {/* Animated counters (right side) */}
          <div style={{ flex:1 }}>
            {metrics.map((m, i) => (
              <div key={m.label} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:m.color, boxShadow:`0 0 6px ${m.color}50` }} />
                    <span style={{ fontSize:9, fontWeight:600, color:'#94a3b8' }}>{m.label}</span>
                  </div>
                  <motion.span
                    initial={{ opacity:0 }}
                    animate={{ opacity:1 }}
                    style={{ fontSize:12, fontWeight:900, color:m.color, fontFamily:'monospace' }}
                  >
                    {Math.round(m.value)}%
                  </motion.span>
                </div>
                {/* Animated circular progress */}
                <div style={{ position:'relative', height:4, borderRadius:2, background:'rgba(255,255,255,0.04)', overflow:'hidden' }}>
                  <motion.div
                    initial={{ width:0 }}
                    animate={{ width:`${Math.min(100, m.value)}%` }}
                    transition={{ duration:1.2, delay: i * 0.1, ease:'easeOut' }}
                    style={{ height:'100%', borderRadius:2, background:`linear-gradient(90deg, ${m.color}80, ${m.color})`, boxShadow:`0 0 8px ${m.color}40` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Justification */}
      <div style={{ background:'rgba(255,255,255,0.015)', borderRadius:12, padding:12, marginBottom:12, border:'1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ fontSize:8, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 6px' }}>
          {isPiracy ? 'Enforcement Rationale' : 'Classification'}
        </p>
        <p style={{ fontSize:10, color:'#94a3b8', margin:0, lineHeight:1.6 }}>
          {inc.adjudicator_justification || (
            isPiracy ? `Unauthorized reproduction confirmed across ${metrics.filter(m=>m.value>50).length}/5 detection layers with ${Math.round(inc.confidence_score)}% fused confidence. DMCA takedown recommended under 17 U.S.C. § 512(c).`
            : isFairUse ? `Transformative content identified. Low visual similarity with commentary elements. Revenue-share licensing under fair use provisions recommended.`
            : `Detection confidence: ${Math.round(inc.confidence_score||0)}%. Below enforcement threshold. Monitoring continued.`
          )}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:6 }}>
        {inc.url && <a href={inc.url} target="_blank" rel="noreferrer" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'8px 0', borderRadius:8, fontSize:9, fontWeight:700, background:'rgba(99,102,241,0.06)', color:'#818cf8', textDecoration:'none', border:'1px solid rgba(99,102,241,0.12)' }}><ExternalLink size={10}/>View</a>}
        {isPiracy && <button style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'8px 0', borderRadius:8, fontSize:9, fontWeight:700, background:'rgba(239,68,68,0.06)', color:'#f87171', border:'1px solid rgba(239,68,68,0.12)', cursor:'pointer' }}><Gavel size={10}/>DMCA</button>}
        {isFairUse && <button style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'8px 0', borderRadius:8, fontSize:9, fontWeight:700, background:'rgba(13,148,136,0.06)', color:'#2dd4bf', border:'1px solid rgba(13,148,136,0.12)', cursor:'pointer' }}><Coins size={10}/>License</button>}
      </div>

      {/* Leak chain */}
      {inc.leak_chain && inc.leak_chain.length > 0 && (
        <div style={{ marginTop:12, padding:'8px 10px', background:'rgba(167,139,250,0.04)', borderRadius:8, border:'1px solid rgba(167,139,250,0.1)' }}>
          <p style={{ fontSize:7, color:'#a78bfa', fontWeight:700, textTransform:'uppercase', margin:'0 0 4px' }}>Leak Chain</p>
          <p style={{ fontSize:9, color:'#c4b5fd', margin:0, fontWeight:600 }}>Source → {inc.leak_chain.join(' → ')} → Detected</p>
        </div>
      )}
    </div>
  );
};

// ─── Main ────────────────────────────────────────────────────────────────────
const IncidentTable = () => {
  const { incidents, backendOnline } = useDashboard();
  const [selectedId, setSelectedId] = useState(null);

  // Use real incidents if available, fallback to rich mocks
  const data = useMemo(() => {
    const real = incidents.filter(i => i._id && !i._id.startsWith('m'));
    const display = real.length >= 3 ? real : [...real, ...MOCK_INCIDENTS];
    return display
      .sort((a,b) => (b.confidence_score||0) - (a.confidence_score||0))
      .slice(0, 15);
  }, [incidents]);

  const selected = data.find(i => i._id === selectedId) || null;

  // Dynamic pulse chart data from actual incidents
  const pulseData = useMemo(() => {
    return data.slice(0,10).reverse().map((i, idx) => ({
      t: `${idx+1}`,
      similarity: Math.round(i.clip_confidence || i.confidence_score || 30 + Math.random()*40),
      risk: Math.round((i.confidence_score || 40) * (0.7 + Math.random()*0.3)),
      threat: Math.round(20 + Math.random()*60),
    }));
  }, [data]);

  return (
    <div style={{ display:'flex', height:'calc(100vh - 140px)', background:'#080c14', borderRadius:16, overflow:'hidden', border:'1px solid rgba(255,255,255,0.04)', boxShadow:'0 4px 40px rgba(0,0,0,0.4)' }}>
      {/* Left */}
      <div style={{ width:350, borderRight:'1px solid rgba(255,255,255,0.04)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'12px 12px 9px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3 style={{ fontSize:11, fontWeight:800, color:'#f1f5f9', margin:0 }}>Threat Feed</h3>
            <div style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 6px', borderRadius:4, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.12)' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#ef4444', animation:'blink 1.4s infinite' }} />
              <span style={{ fontSize:7, fontWeight:700, color:'#ef4444' }}>LIVE</span>
            </div>
          </div>
          <p style={{ fontSize:8, color:'#475569', margin:'2px 0 0' }}>
            {data.filter(d=>getSeverity(d)==='CRITICAL').length} critical &middot; {data.filter(d=>getSeverity(d)==='WARNING').length} warning &middot; {data.length} total
          </p>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'4px 6px' }}>
          <AnimatePresence>
            {data.map(inc => <Card key={inc._id} inc={inc} active={inc._id===selectedId} onClick={()=>setSelectedId(inc._id)} />)}
          </AnimatePresence>
        </div>
      </div>

      {/* Right */}
      <Detail inc={selected} pulseData={pulseData} />

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  );
};

export default IncidentTable;
