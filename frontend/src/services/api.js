import axios from 'axios';

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// ─── Response interceptor: handle 401 only ───────────────────────────────────
// IMPORTANT: We only handle 401 here (session expiry / invalid token).
// We do NOT show toasts here — that's the calling component's job.
// Showing toasts in the interceptor causes double-toasting when the
// component's .catch() also shows an error.
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');

      // Use React Router navigation instead of window.location to avoid a
      // full page reload that loses React state. We dispatch a custom event
      // that AuthContext listens to and triggers navigate('/login').
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    return Promise.reject(error);
  }
);

export default api;