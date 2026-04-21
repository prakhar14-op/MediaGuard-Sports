import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const swarmService = {
  run: (url) => api.post('/swarm/run', { official_video_url: url }),
};

export const archivistService = {
  ingest: (url) => api.post('/ingest', { url }),
  getAll: () => api.get('/ingest'),
  getById: (id) => api.get(`/ingest/${id}`),
};

export const spiderService = {
  hunt: (url) => api.post('/hunt', { url }),
  getStatus: (jobId) => api.get(`/hunt/${jobId}`),
};

export const sentinelService = {
  scan: (url) => api.post('/scan', { thumbnail_url: url }),
  scanBatch: () => api.post('/scan/batch'),
  getIncidents: (filters = {}) => api.get('/incidents', { params: filters }),
  getIncidentById: (id) => api.get(`/incidents/${id}`),
};

export const adjudicatorService = {
  adjudicate: (incidentId) => api.post('/adjudicate', { incident_id: incidentId }),
  adjudicateBatch: () => api.post('/adjudicate/batch'),
  getVerdict: (id) => api.get(`/adjudicate/${id}`),
};

export const enforcerService = {
  draft: (incidentId) => api.post('/enforce', { incident_id: incidentId }),
  draftBatch: () => api.post('/enforce/batch'),
  approve: (id) => api.patch(`/enforce/${id}/approve`),
  reject: (id) => api.patch(`/enforce/${id}/reject`),
  getAll: () => api.get('/enforce'),
};

export const brokerService = {
  mint: (incidentId) => api.post('/broker', { incident_id: incidentId }),
  mintBatch: () => api.post('/broker/batch'),
  activate: (id) => api.patch(`/broker/${id}/activate`),
  dispute: (id) => api.patch(`/broker/${id}/dispute`),
  getAll: () => api.get('/broker'),
};

export const systemService = {
  getHealth: () => api.get('/health'),
};

export default api;
