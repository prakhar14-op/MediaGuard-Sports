import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, LayoutDashboard, Database, Search,
  ShieldAlert, Gavel, Coins, Bell, Settings,
  HelpCircle, Zap, ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { useSocket } from '../../context/SocketContext';

const G = {
  teal:    '#0d9488',
  tealBg:  'rgba(13,148,136,0.08)',
  tealBdr: 'rgba(13,148,136,0.2)',
  bg:      '#ffffff',
  border:  'rgba(148,163,184,0.15)',
  text:    '#0f172a',
  sub:     '#64748b',
  muted:   '#94a3b8',
  hover:   '#f1f5f9',
};

const navItems = [
  { id: 'overview',      label: 'Overview',      icon: LayoutDashboard, color: '#0d9488', path: '/dashboard/overview'      },
  { id: 'vault',         label: 'Asset Vault',   icon: Database,        color: '#6366f1', path: '/dashboard/vault'         },
  { id: 'hunter',        label: 'Threat Hunter', icon: Search,          color: '#f59e0b', path: '/dashboard/hunter'        },
  { id: 'incidents',     label: 'Incidents',     icon: ShieldAlert,     color: '#f97316', path: '/dashboard/incidents'     },
  { id: 'enforcer',      label: 'Enforcement',   icon: Gavel,           color: '#ef4444', path: '/dashboard/enforcer'      },
  { id: 'broker',        label: 'Monetization',  icon: Coins,           color: '#0d9488', path: '/dashboard/broker'        },
  { id: 'notifications', label: 'Swarm Logs',    icon: Bell,     color: '#a855f7', path: '/dashboard/notifications' },
  { id: 'analytics',    label: 'Analytics',     icon: BarChart3,color: '#f59e0b', path: '/dashboard/analytics'    },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { swarmRunning, swarmPhase, backendOnline } = useDashboard();
  const { isConnected } = useSocket();

  const W = collapsed ? 68 : 256;

  return (
    <motion.aside
      animate={{ width: W }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        position: 'sticky', top: 0, flexShrink: 0, overflow: 'hidden',
        background: G.bg, borderRight: `1px solid ${G.border}`,
        zIndex: 30,
      }}
    >
      {/* ── Logo + collapse toggle ── */}
      <div style={{
        padding: collapsed ? '16px 0' : '16px 16px',
        borderBottom: `1px solid ${G.border}`,
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: 64,
      }}>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="logo-full"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: G.tealBg, border: `1px solid ${G.tealBdr}`,
                }}>
                  <Shield size={17} style={{ color: G.teal }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 800, color: G.text, margin: 0, lineHeight: 1 }}>MediaGuard</p>
                  <p style={{ fontSize: '0.6rem', color: G.sub, margin: '2px 0 0' }}>AI Control Center</p>
                </div>
              </NavLink>
            </motion.div>
          )}
          {collapsed && (
            <motion.div key="logo-icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <NavLink to="/" style={{ textDecoration: 'none' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: G.tealBg, border: `1px solid ${G.tealBdr}`,
                }}>
                  <Shield size={17} style={{ color: G.teal }} />
                </div>
              </NavLink>
            </motion.div>
          )}
        </AnimatePresence>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              width: 28, height: 28, borderRadius: 8, border: `1px solid ${G.border}`,
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: G.muted,
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = G.hover; e.currentTarget.style.color = G.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = G.muted; }}
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* ── Expand button when collapsed ── */}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <button
            onClick={() => setCollapsed(false)}
            style={{
              width: 28, height: 28, borderRadius: 8, border: `1px solid ${G.border}`,
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: G.muted,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = G.hover; e.currentTarget.style.color = G.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = G.muted; }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Nav items ── */}
      <nav style={{ flex: 1, padding: collapsed ? '8px 8px' : '10px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {!collapsed && (
          <p style={{
            fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.18em', color: G.muted, padding: '0 8px', marginBottom: 6,
          }}>
            Swarm Command
          </p>
        )}

        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            title={collapsed ? item.label : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 10,
              padding: collapsed ? '10px 0' : '9px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 10, marginBottom: 2,
              textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600,
              transition: 'all 0.15s',
              background: isActive ? `${item.color}12` : 'transparent',
              border: isActive ? `1px solid ${item.color}28` : '1px solid transparent',
              color: isActive ? item.color : G.sub,
              position: 'relative',
            })}
          >
            {({ isActive }) => (
              <>
                {/* Active left bar */}
                {isActive && !collapsed && (
                  <div style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: 3, borderRadius: 99, background: item.color,
                    boxShadow: `0 0 8px ${item.color}`,
                  }} />
                )}
                <item.icon
                  size={17}
                  style={{ color: isActive ? item.color : G.muted, flexShrink: 0 }}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !collapsed && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: item.color, boxShadow: `0 0 6px ${item.color}`,
                    flexShrink: 0,
                  }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Status footer ── */}
      <div style={{ padding: collapsed ? '10px 8px' : '10px 10px', borderTop: `1px solid ${G.border}` }}>
        {/* Status dot (collapsed) or full card (expanded) */}
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div
              title={backendOnline ? 'System Online' : 'Backend Offline'}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: backendOnline ? G.teal : '#ef4444',
                boxShadow: backendOnline ? `0 0 6px ${G.teal}` : '0 0 6px #ef4444',
                animation: swarmRunning ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
            />
            {[
              { icon: Settings,   label: 'Settings' },
              { icon: HelpCircle, label: 'Support'  },
            ].map(({ icon: Icon, label }) => (
              <button key={label} title={label} style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: G.muted,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = G.hover; e.currentTarget.style.color = G.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = G.muted; }}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        ) : (
          <>
            <div style={{
              borderRadius: 12, padding: '11px 13px', marginBottom: 6,
              background: '#f8fafc', border: `1px solid ${G.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: swarmRunning ? G.teal : backendOnline ? G.teal : '#ef4444',
                  animation: swarmRunning ? 'pulse 1s ease-in-out infinite' : 'none',
                }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: G.text }}>
                  {swarmRunning ? `${swarmPhase?.agent || 'Swarm'} Active` : backendOnline ? 'System Online' : 'Backend Offline'}
                </span>
              </div>
              {[
                { label: 'ML Nodes',  ok: backendOnline },
                { label: 'Socket.io', ok: isConnected   },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: G.muted }}>{label}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: ok ? G.teal : '#ef4444' }}>{ok ? 'Online' : 'Offline'}</span>
                </div>
              ))}
              <div style={{ height: 3, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginTop: 5 }}>
                <div style={{
                  height: '100%', borderRadius: 99, transition: 'width 0.5s',
                  width: backendOnline ? '92%' : '0%',
                  background: `linear-gradient(to right, ${G.teal}, #2dd4bf)`,
                }} />
              </div>
            </div>
            {[
              { icon: Settings,   label: 'Settings' },
              { icon: HelpCircle, label: 'Support'  },
            ].map(({ icon: Icon, label }) => (
              <button key={label} style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent',
                fontSize: '0.78rem', color: G.sub, cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = G.hover; e.currentTarget.style.color = G.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = G.sub; }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </motion.aside>
  );
};

export default Sidebar;
