import React from 'react';
import { motion } from 'framer-motion';
import SpotlightCard from '../../ui/SpotlightCard';

const INSIDERS = [
  { broadcaster:'Broadcaster A (ESPN)', watermark:'WM-A7X2', leaked:false, region:'North America', feeds:3 },
  { broadcaster:'Broadcaster B (Sky Sports)', watermark:'WM-B4K9', leaked:true, source:'@sports_leaks', region:'Europe', feeds:2 },
  { broadcaster:'Broadcaster C (Star Sports)', watermark:'WM-C1M5', leaked:false, region:'Asia Pacific', feeds:4 },
  { broadcaster:'Broadcaster D (beIN)', watermark:'WM-D8R3', leaked:true, source:'@live_streams_hd', region:'Middle East', feeds:1 },
  { broadcaster:'Broadcaster E (DAZN)', watermark:'WM-E2P7', leaked:true, source:'r/sportsstreams', region:'Global', feeds:5 },
];

const InsiderTracker = () => (
  <div>
    <p style={{ fontSize:8, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 10px' }}>
      Invisible Watermark Tracking — Insider Leak Detection
    </p>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
      {INSIDERS.map((b, i) => (
        <motion.div key={i} initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay:i*0.06 }}>
          <SpotlightCard spotlightColor={b.leaked ? 'rgba(239,68,68,0.12)' : 'rgba(13,148,136,0.1)'} style={{ padding:'12px 14px', background:'rgba(255,255,255,0.015)', border:'1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
              <div>
                <p style={{ fontSize:10, fontWeight:700, color:'#e2e8f0', margin:'0 0 2px' }}>{b.broadcaster}</p>
                <p style={{ fontSize:8, color:'#475569', margin:0 }}>{b.region} · {b.feeds} feed(s)</p>
              </div>
              <span style={{
                fontSize:7, fontWeight:800, padding:'2px 6px', borderRadius:4, height:'fit-content',
                background: b.leaked ? 'rgba(239,68,68,0.08)' : 'rgba(13,148,136,0.08)',
                color: b.leaked ? '#ef4444' : '#0d9488', textTransform:'uppercase',
              }}>
                {b.leaked ? 'COMPROMISED' : 'SECURE'}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <code style={{ fontSize:9, color:'#a78bfa', background:'rgba(167,139,250,0.06)', padding:'2px 6px', borderRadius:4 }}>{b.watermark}</code>
              {b.leaked && b.source && <span style={{ fontSize:8, color:'#ef4444' }}>→ {b.source}</span>}
            </div>
          </SpotlightCard>
        </motion.div>
      ))}
    </div>
  </div>
);

export default InsiderTracker;
