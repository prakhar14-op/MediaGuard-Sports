import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { useDashboard } from '../../context/DashboardContext';

const PropagationSankey = ({ style = {} }) => {
  const ref = useRef(null);
  const { incidents } = useDashboard();

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, 'dark');

    // Build flow data from actual incidents — count per platform
    const platformCounts = {};
    incidents.forEach(i => {
      const p = i.platform || 'Other';
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    });

    // Build nodes from detected platforms
    const platforms = Object.keys(platformCounts);
    const nodes = [
      { name: 'Official Source', itemStyle: { color: '#0d9488' } },
      ...platforms.map(p => ({ name: p, itemStyle: { color: getPlatColor(p) } })),
    ];

    // If we have leak chain data, use that for flow
    // Otherwise create proportional flows from source to each platform
    const links = platforms.map(p => ({
      source: 'Official Source',
      target: p,
      value: platformCounts[p] || 1,
    }));

    // Add cross-platform flows based on common piracy patterns
    if (platformCounts['Telegram'] && platformCounts['YouTube']) {
      links.push({ source: 'Telegram', target: 'YouTube', value: Math.min(platformCounts['Telegram'], platformCounts['YouTube']) });
    }
    if (platformCounts['Telegram'] && platformCounts['TikTok']) {
      links.push({ source: 'Telegram', target: 'TikTok', value: Math.min(platformCounts['Telegram'] || 0, platformCounts['TikTok'] || 0) || 1 });
    }
    if (platformCounts['Reddit'] && platformCounts['YouTube']) {
      links.push({ source: 'Reddit', target: 'YouTube', value: Math.min(platformCounts['Reddit'] || 0, platformCounts['YouTube'] || 0) || 1 });
    }

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.06)', textStyle: { color: '#e2e8f0', fontSize: 10 } },
      series: [{
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'left',
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 },
        itemStyle: { borderWidth: 0 },
        label: { color: '#94a3b8', fontSize: 9, fontWeight: 600 },
        data: nodes.length > 1 ? nodes : [{ name: 'No Data', itemStyle: { color: '#1e293b' } }],
        links: links.length > 0 ? links : [],
      }],
    });

    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => { chart.dispose(); window.removeEventListener('resize', resize); };
  }, [incidents]);

  return <div ref={ref} style={{ width: '100%', height: 280, ...style }} />;
};

function getPlatColor(p) {
  const colors = { YouTube: '#ef4444', TikTok: '#ff0050', 'Twitter/X': '#1da1f2', Telegram: '#2ca5e0', Reddit: '#ff4500', Instagram: '#e1306c', Dailymotion: '#0066DC', Facebook: '#1877f2', Rumble: '#85c742', Vimeo: '#1ab7ea', Twitch: '#9146ff' };
  return colors[p] || '#6366f1';
}

export default PropagationSankey;
