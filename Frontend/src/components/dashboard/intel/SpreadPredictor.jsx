import React from 'react';
import { motion } from 'framer-motion';
import SpotlightCard from '../../ui/SpotlightCard';

const PREDICTIONS = [
  { channel:'@sports_leaks', platform:'Telegram', members:45000, leaks:14, risk:'critical', spread:180000, platforms:['TikTok','Discord','Reddit'] },
  { channel:'@live_streams_hd', platform:'Telegram', members:28000, leaks:9, risk:'high', spread:95000, platforms:['Reddit','YouTube','Facebook'] },
  { channel:'Sports Pirates', platform:'Discord', members:12000, leaks:6, risk:'medium', spread:42000, platforms:['TikTok','Facebook'] },
  { channel:'r/sportsstreams', platform:'Reddit', members:340000, leaks:22, risk:'critical', spread:520000, platforms:['YouTube','Twitch','Telegram'] },
];

const RISK_COLOR = { critical:'#ef4444', high:'#f59e0b', medium:'#6366f1', low:'#0d9488' };

const SpreadPredictor = () => (
  <div>
    <p style={{ fontSize:8, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', margin:'0 0 10px' }}>
      Epidemic Spread Model — Piracy Propagation Prediction
    </p>
    {PREDICTIONS.map((p, i) => {
      const rc = RISK_COLOR[p.risk];
      return (
        <motion.div key={p.channel} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08 }}>
          <SpotlightCard spotlightColor={`${rc}15`} style={{ background:'rgba(255,255,255,0.015)', padding:'11px 13px', marginBottom:7, border:'1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#e2e8f0' }}>{p.channel}</span>
                  <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, background:`${rc}12`, color:rc, fontWeight:800, textTransform:'uppercase' }}>{p.risk}</span>
                </div>
                <p style={{ fontSize:8, color:'#475569', margin:'0 0 5px' }}>
                  {p.platform} · {(p.members/1000).toFixed(0)}K members · {p.leaks} leaks historically
                </p>
                <div style={{ display:'flex', gap:3 }}>
                  {p.platforms.map(pl => (
                    <span key={pl} style={{ fontSize:7, padding:'1px 5px', borderRadius:3, background:'rgba(99,102,241,0.06)', color:'#818cf8', fontWeight:600 }}>{pl}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign:'right', paddingLeft:12 }}>
                <p style={{ fontSize:18, fontWeight:900, color:rc, margin:0, lineHeight:1 }}>{(p.spread/1000).toFixed(0)}K</p>
                <p style={{ fontSize:7, color:'#64748b', margin:'2px 0 0' }}>predicted reach</p>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>
      );
    })}
  </div>
);

export default SpreadPredictor;
