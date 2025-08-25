import axios from 'axios';

// In dev, Vite proxies /api and /chat to Flask (see vite.config.js)
// In prod, Flask serves the static React build on same origin
const api = axios.create({
  baseURL: '', // same-origin or Vite proxy
  timeout: 20000
});

export const getModel = () => api.get('/api/model').then(r => r.data);
export const getHRLast7 = () => api.get('/api/fit/hr/last7').then(r => r.data);
export const getHRIntraday = () => api.get('/api/fit/hr/intraday').then(r => r.data);
export const getStepsLast7 = () => api.get('/api/fit/steps/last7').then(r => r.data);
export const getCaloriesLast7 = () => api.get('/api/fit/calories/last7').then(r => r.data);
export const getSleepDebug = () => api.get('/api/debug/sleep').then(r => r.data);
export const postSync = () =>
  api.post('/api/fit/sync', {}, { timeout: 120000 }).then(r => r.data);
export const postChat = (message) =>
  api.post('/chat', { message }, { timeout: 60000 }).then(r => r.data);