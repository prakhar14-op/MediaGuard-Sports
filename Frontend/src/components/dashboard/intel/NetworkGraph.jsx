import React from 'react';
import { motion } from 'framer-motion';

const NODES = [
  { id:'src', label:'Official Source', x:50, y:6, color:'#0d9488', size:30, type:'source' },
  { id:'tg1', label:'@sports_leaks', x:25, y:24, color:'#2ca5e0', size:22, type:'telegram', members:'45K', leaks:14 },
  { id:'tg2', label:'@live_hd', x:72, y:22, color:'#2ca5e0', size:20, type:'telegram', members:'28K', leaks:9 },
  { id:'dc1', label:'Pirates Hub', x:12, y:46, color:'#5865f2', size:17, type:'discord', members:'12K' },
  { id:'dc2', label:'Free Streams', x:42, y:44, color:'#5865f2', size:15, type:'discord', members:'8K' },
  { id:'rd1', label:'r/streams', x:78, y:48, color:'#ff4500', size:18, type:'reddit', members:'340K' },
  { id:'tt1', label:'@clips_hq', x:18, y:68, color:'#ff0050', size:15, type:'tiktok', members:'180K' },
  { id:'tt2', label:'@reels_sp', x:55, y:70, color:'#ff0050', size:14, type:'tiktok', members:'95K' },
  { id:'yt1', label:'@restream', x:88, y:65, color:'#ef4444', size:17, type:'youtube', members:'52K' },
  { id:'fb1', label:'Sports Free', x:35, y:88, color:'#1877f2', size:13, type:'facebook', members:'67K' },
];

const EDGES = [
  { from:'src', to:'tg1', leak:true }, { from:'src', to:'tg2', leak:true },
  { from:'tg1', to:'dc1' }, { from:'tg1', to:'dc2' }, { from:'tg1', to:'tt1' },
  { from:'tg2', to:'rd1' }, { from:'tg2', to:'yt1' },
  { from:'dc1', to:'tt1' }, { from:'dc2', to:'tt2' },
  { from:'rd1', to:'yt1' }, { from:'tt1', to:'fb1' }, { from:'tt2', to:'fb1' },
];

const NetworkGraph = ({ selected, onSelect }) => (
  <div style={{ position:'relative', width:'100%', height:'100%', minHeight:340 }}>
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      <defs>
        <pattern id="ngrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="0.5" fill="rgba(255,255,255,0.03)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ngrid)" />
      {EDGES.map((e, i) => {
        const f = NODES.find(n => n.id === e.from);
        const t = NODES.find(n => n.id === e.to);
        return f && t && (
          <line key={i} x1={`${f.x}%`} y1={`${f.y}%`} x2={`${t.x}%`} y2={`${t.y}%`}
            stroke={e.leak ? 'rgba(239,68,68,0.35)' : 'rgba(148,163,184,0.1)'}
            strokeWidth={e.leak ? 1.5 : 0.7} strokeDasharray={e.leak ? '5 3' : 'none'} />
        );
      })}
    </svg>
    {NODES.map(node => (
      <motion.div key={node.id}
        initial={{ scale:0 }} animate={{ scale:1 }}
        transition={{ delay: Math.random()*0.4, type:'spring', damping:18 }}
        onClick={() => onSelect(node)}
        style={{
          position:'absolute', left:`${node.x}%`, top:`${node.y}%`,
          transform:'translate(-50%,-50%)', cursor:'pointer', zIndex:2,
        }}>
        <div style={{
          width:node.size+8, height:node.size+8, borderRadius:'50%',
          border:`2px solid ${node.color}`, background:`${node.color}08`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: selected?.id===node.id ? `0 0 18px ${node.color}50` : `0 0 6px ${node.color}15`,
          transition:'box-shadow 0.2s',
        }}>
          <div style={{ width:node.size*0.4, height:node.size*0.4, borderRadius:'50%', background:node.color, boxShadow:`0 0 4px ${node.color}` }} />
        </div>
        <p style={{ position:'absolute', top:'105%', left:'50%', transform:'translateX(-50%)', fontSize:7, color:'#64748b', fontWeight:600, whiteSpace:'nowrap', margin:0 }}>
          {node.label}
        </p>
        {node.type==='source' && <div style={{ position:'absolute', top:-3, right:-3, width:7, height:7, borderRadius:'50%', background:'#ef4444', boxShadow:'0 0 6px #ef4444', animation:'blink 1.5s infinite' }} />}
      </motion.div>
    ))}
    <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
  </div>
);

export { NODES };
export default NetworkGraph;
