import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { useDashboard } from '../../context/DashboardContext';

// ─── Revenue/Confidence Trend (from real incidents) ──────────────────────────
const ConfidenceTrend = () => {
  const ref = useRef(null);
  const { incidents } = useDashboard();

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, 'dark');

    // Use last 10 incidents sorted by time for trend
    const sorted = [...incidents]
      .filter(i => i.confidence_score)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      .slice(-10);

    const labels = sorted.map((_, i) => `#${i + 1}`);
    const values = sorted.map(i => Math.round(i.confidence_score || 0));

    c.setOption({
      backgroundColor: 'transparent',
      grid: { top: 20, right: 12, bottom: 24, left: 34 },
      xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }, axisLabel: { color: '#475569', fontSize: 8 } },
      yAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } }, axisLabel: { color: '#475569', fontSize: 8 } },
      tooltip: { backgroundColor: '#1e293b', borderColor: 'transparent', textStyle: { color: '#e2e8f0', fontSize: 10 } },
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'circle', symbolSize: 5,
        lineStyle: { color: '#6366f1', width: 2.5 },
        itemStyle: { color: '#6366f1' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.25)' }, { offset: 1, color: 'rgba(99,102,241,0)' }] } },
      }],
    });

    const r = () => c.resize(); window.addEventListener('resize', r);
    return () => { c.dispose(); window.removeEventListener('resize', r); };
  }, [incidents]);

  return (
    <div style={{ background: '#0a0f1a', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', padding: '10px 10px 4px' }}>
      <p style={{ fontSize: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px', paddingLeft: 4 }}>Detection Confidence Trend</p>
      <div ref={ref} style={{ height: 130 }} />
    </div>
  );
};

// ─── Platform Distribution (from real incidents) ─────────────────────────────
const PlatformDonut = () => {
  const ref = useRef(null);
  const { incidents } = useDashboard();

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, 'dark');

    // Count incidents per platform
    const platformCounts = {};
    incidents.forEach(i => {
      const p = i.platform || 'Other';
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    });

    const COLORS = { YouTube: '#ef4444', TikTok: '#ff0050', 'Twitter/X': '#1da1f2', Telegram: '#2ca5e0', Reddit: '#ff4500', Instagram: '#e1306c', Dailymotion: '#0066DC', Facebook: '#1877f2', Other: '#6366f1' };
    const data = Object.entries(platformCounts).map(([name, value]) => ({
      value, name, itemStyle: { color: COLORS[name] || '#6366f1' },
    }));

    c.setOption({
      backgroundColor: 'transparent',
      tooltip: { backgroundColor: '#1e293b', borderColor: 'transparent', textStyle: { color: '#e2e8f0', fontSize: 10 } },
      series: [{ type: 'pie', radius: ['42%', '70%'], center: ['50%', '50%'], label: { color: '#94a3b8', fontSize: 8 }, data: data.length > 0 ? data : [{ value: 1, name: 'No data', itemStyle: { color: '#1e293b' } }] }],
    });

    const r = () => c.resize(); window.addEventListener('resize', r);
    return () => { c.dispose(); window.removeEventListener('resize', r); };
  }, [incidents]);

  return (
    <div style={{ background: '#0a0f1a', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', padding: '10px 10px 4px' }}>
      <p style={{ fontSize: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px', paddingLeft: 4 }}>Platform Distribution</p>
      <div ref={ref} style={{ height: 130 }} />
    </div>
  );
};

// ─── Severity Pie Chart (Critical / Warning / Fair Use) ──────────────────────
const SeverityPie = () => {
  const ref = useRef(null);
  const { incidents } = useDashboard();

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, 'dark');

    const critical = incidents.filter(i => i.severity === 'CRITICAL' || i.match_confirmed || (i.confidence_score || 0) >= 75).length;
    const warning = incidents.filter(i => (i.confidence_score || 0) >= 50 && (i.confidence_score || 0) < 75 && !i.match_confirmed).length;
    const fairUse = incidents.filter(i => i.classification === 'FAIR USE / FAN CONTENT').length;
    const clean = incidents.length - critical - warning - fairUse;

    c.setOption({
      backgroundColor: 'transparent',
      tooltip: { backgroundColor: '#1e293b', borderColor: 'transparent', textStyle: { color: '#e2e8f0', fontSize: 10 } },
      legend: { bottom: 0, textStyle: { color: '#64748b', fontSize: 8 }, itemWidth: 8, itemHeight: 8 },
      series: [{
        type: 'pie', radius: ['35%', '65%'], center: ['50%', '42%'],
        label: { show: false },
        data: [
          { value: critical, name: 'Critical', itemStyle: { color: '#ef4444' } },
          { value: warning, name: 'Warning', itemStyle: { color: '#f59e0b' } },
          { value: fairUse, name: 'Fair Use', itemStyle: { color: '#0d9488' } },
          { value: Math.max(0, clean), name: 'Clean', itemStyle: { color: '#1e293b' } },
        ].filter(d => d.value > 0),
      }],
    });

    const r = () => c.resize(); window.addEventListener('resize', r);
    return () => { c.dispose(); window.removeEventListener('resize', r); };
  }, [incidents]);

  return (
    <div style={{ background: '#0a0f1a', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', padding: '10px 10px 4px' }}>
      <p style={{ fontSize: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0', paddingLeft: 4 }}>Threat Classification</p>
      <div ref={ref} style={{ height: 130 }} />
    </div>
  );
};

const AnalyticsGrid = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
    <ConfidenceTrend />
    <PlatformDonut />
    <SeverityPie />
  </div>
);

export default AnalyticsGrid;
