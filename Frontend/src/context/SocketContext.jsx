import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// All events the backend emits — we subscribe to every one
const SWARM_EVENTS = [
  'swarm:phase',
  'swarm:complete',
  'swarm:error',
  'spider:complete',
  'sentinel:batch_started',
  'sentinel:threat_found',
  'sentinel:batch_complete',
  'sentinel:scan_result',
  'adjudicator:thinking',
  'adjudicator:verdict',
  'adjudicator:batch_started',
  'adjudicator:batch_complete',
  'enforcer:drafting',
  'enforcer:notice_ready',
  'enforcer:batch_complete',
  'enforcer:dmca_sent',
  'broker:minting',
  'broker:contract_ready',
  'broker:contract_activated',
  'broker:batch_complete',
  'ingest:progress',
  'ingest:complete',
  'ingest:error',
  'hunt:started',
  'hunt:complete',
  'hunt:error',
];

export const SocketProvider = ({ children }) => {
  const [socket, setSocket]       = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [eventLog, setEventLog]   = useState([]); // full ordered log for Notifications

  useEffect(() => {
    const sock = io('http://localhost:8000', {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    sock.on('connect',    () => { setIsConnected(true);  });
    sock.on('disconnect', () => { setIsConnected(false); });

    // Subscribe to every swarm event and normalise into { type, payload, ts }
    SWARM_EVENTS.forEach((event) => {
      sock.on(event, (data) => {
        const entry = { type: event, payload: data, ts: Date.now() };
        setLastEvent(entry);
        setEventLog((prev) => [entry, ...prev].slice(0, 200)); // keep last 200
      });
    });

    setSocket(sock);
    return () => sock.close();
  }, []);

  const joinRoom = useCallback((jobId) => {
    if (socket) socket.emit('join:hunt', jobId);
  }, [socket]);

  const joinIngest = useCallback((jobId) => {
    if (socket) socket.emit('join:ingest', jobId);
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, lastEvent, eventLog, joinRoom, joinIngest }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
