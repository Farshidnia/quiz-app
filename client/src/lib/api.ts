// client/src/lib/api.ts
import axios from 'axios';

const raw = import.meta.env.VITE_API_URL ?? '';
const BASE = raw && raw.endsWith('/') && raw.length > 1 ? raw.slice(0, -1) : raw;

const api = axios.create({
  baseURL: BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  // timeout: 10000, // اگر خواستی تایم‌اوت اضافه کن
});

export default api;
