// client/src/lib/api.ts
import axios from 'axios';

// Support both VITE_API_BASE_URL and VITE_API_URL (legacy)
// If none set, requests will be relative to the current origin (''), which works when the API is served from the same host.
const raw = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '';
const BASE = raw && raw.endsWith('/') && raw.length > 1 ? raw.slice(0, -1) : raw;

const api = axios.create({
  baseURL: BASE || '', // '' means relative requests like /api/...
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // set a sensible timeout so frontend doesn't hang forever
});

export default api;
