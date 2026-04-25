import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SWARM_EVENTS = [
  'swarm:phase', 'swarm:complete', 'swarm:error',
  'spider:complete',
  'sentinel:batch_started', 'sentinel:threat_found', 'sentinel:batch_complete', 'sentinel:scan_result',
  'adjudicator:thinking', 'adjudicator:verdict', 'adjudicator:batch_started', 'adjudicator:batch_complete',
  'enforcer:drafting', 'enforcer:notice_ready', 'enforcer:batch_complete', 'enforcer:dmca_sent',
  'broker:minting', 'broker:contract_ready', 'broker:contract_activated', 'broker:batch_complete',
  'ingest:progress', 'ingest:complete', 'ingest:error',
  'hunt:started', 'hunt:complete', 'hunt:error',
];

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent,   setLastEvent]   = useState(null);
  const [eventLog,    setEventLog]    = useState([]);
  // Keep socket in a ref so joinRoom/joinIngest always have the latest instance
  const socketRef = useRef(null);
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const sock = io(SOCKET_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay:    1000,
      timeout:              10000,
      transports:           ['websocket', 'polling'],
    });

    socketRef.current = sock;

    sock.on('connect',    () => { setIsConnected(true);  setSocketReady(true); });
    sock.on('disconnect', () => { setIsConnected(false); });
    sock.on('reconnect',  () => { setIsConnected(true);  });

    SWARM_EVENTS.forEach((event) => {
      sock.on(event, (data) => {
        const entry = { type: event, payload: data, ts: Date.now() };
        setLastEvent(entry);
        setEventLog((prev) => [entry, ...prev].slice(0, 300));
      });
    });

    return () => {
      sock.close();
      socketRef.current = null;
    };
  }, []);

  // Use ref so these callbacks never go stale
  const joinRoom = useCallback((jobId) => {
    const sock = socketRef.current;
    if (sock?.connected) {
      sock.emit('join:hunt', jobId);
      console.log(`[Socket] Joined hunt:${jobId}`);
    } else {
      // Queue the join for when socket connects
      const onConnect = () => {
        sock?.emit('join:hunt', jobId);
        console.log(`[Socket] Deferred join hunt:${jobId}`);
        sock?.off('connect', onConnect);
      };
      sock?.on('connect', onConnect);
    }
  }, []);

  const joinIngest = useCallback((jobId) => {
    const sock = socketRef.current;
    if (sock?.connected) {
      sock.emit('join:ingest', jobId);
      console.log(`[Socket] Joined ingest:${jobId}`);
    } else {
      const onConnect = () => {
        sock?.emit('join:ingest', jobId);
        sock?.off('connect', onConnect);
      };
      sock?.on('connect', onConnect);
    }
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      lastEvent,
      eventLog,
      joinRoom,
      joinIngest,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
