import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Swarm orchestrator ───────────────────────────────────────────────────────
export const swarmService = {
  run: (url) => api.post('/swarm/run', { official_video_url: url }),
};

// ─── Archivist ────────────────────────────────────────────────────────────────
export const archivistService = {
  ingest:    (url, title = '') => api.post('/ingest', { official_video_url: url, video_title: title }),
  getAll:    ()    => api.get('/ingest'),
  getById:   (id)  => api.get(`/ingest/${id}`),
  delete:    (id)  => api.delete(`/ingest/${id}`),
};

// ─── Spider ───────────────────────────────────────────────────────────────────
export const spiderService = {
  hunt:      (url)    => api.post('/hunt', { official_video_url: url }),
  getStatus: (jobId)  => api.get(`/hunt/${jobId}`),
};

// ─── Sentinel ─────────────────────────────────────────────────────────────────
export const sentinelService = {
  scan:           (url)         => api.post('/scan', { thumbnail_url: url }),
  getIncidents:   (filters = {}) => api.get('/incidents', { params: filters }),
  getIncidentById:(id)           => api.get(`/incidents/${id}`),
};

// ─── Adjudicator ──────────────────────────────────────────────────────────────
export const adjudicatorService = {
  // payload must include: incident_id, sentinel_report, platform, account_handle, video_title
  adjudicate: (payload) => api.post('/adjudicate', payload),
  getVerdict: (id)      => api.get(`/adjudicate/${id}`),
};

// ─── Enforcer ─────────────────────────────────────────────────────────────────
export const enforcerService = {
  enforce: (payload) => api.post('/enforce', payload),
  approve: (id)      => api.patch(`/enforce/${id}/approve`),
  reject:  (id)      => api.patch(`/enforce/${id}/reject`),
  getAll:  ()        => api.get('/enforce'),
  getById: (id)      => api.get(`/enforce/${id}`),
};

// ─── Broker ───────────────────────────────────────────────────────────────────
export const brokerService = {
  broker:   (payload) => api.post('/broker', payload),
  activate: (id)      => api.patch(`/broker/${id}/activate`),
  dispute:  (id)      => api.patch(`/broker/${id}/dispute`),
  getAll:   ()        => api.get('/broker'),
  getById:  (id)      => api.get(`/broker/${id}`),
};

// ─── System ───────────────────────────────────────────────────────────────────
export const systemService = {
  getHealth: () => api.get('/health'),
};

export default api;
