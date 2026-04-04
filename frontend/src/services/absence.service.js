import api from './api';

export const absenceService = {
  // ── Student & staff: list requests (backend scopes by role automatically) ──
  // Students get only their own; health_officer/admin get all.
  // Pass params like { status, page, limit, startDate, endDate } to filter.
  getAll: (params) => api.get('/absences', { params }),

  // ── Get single request ─────────────────────────────────────────────────────
  getById: (id) => api.get(`/absences/${id}`),

  // ── Create new request (multipart — includes optional file) ───────────────
  create: (formData) => api.post('/absences', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // ── Update draft (multipart — file optional) ──────────────────────────────
  update: (id, formData) => api.put(`/absences/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // ── Delete request ────────────────────────────────────────────────────────
  delete: (id) => api.delete(`/absences/${id}`),

  // ── Health officer: approve / reject / mark under_review ─────────────────
  review: (id, data) => api.patch(`/absences/${id}/review`, data),

  // ── Professor: acknowledge a notice for a specific course ─────────────────
  acknowledge: (data) => api.post('/absences/acknowledge', data),

  // ── Search with text query ────────────────────────────────────────────────
  search: (params) => api.get('/absences/search', { params }),

  // ── Dashboard stats ───────────────────────────────────────────────────────
  getDashboard: () => api.get('/dashboard'),

  // ── Admin: download data backup ───────────────────────────────────────────
  downloadBackup: () => api.get('/backup/download', { responseType: 'blob' }),

  // ── Public: verify a QR code (no auth required) ───────────────────────────
  verifyQR: (requestId, code) => api.get(`/qr/verify/${requestId}`, { params: { code } }),

  // ── View medical document (staff only) ───────────────────────────────────
  // Returns a URL for the file — used by ReviewQueue to open the document
  getDocumentUrl: (requestId) => {
    const token = localStorage.getItem('token');
    return `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/absences/${requestId}/document?token=${token}`;
  }
};