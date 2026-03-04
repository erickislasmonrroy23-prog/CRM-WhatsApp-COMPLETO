// frontend/src/services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Interceptor: agregar JWT a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: manejar errores globalmente
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- AUTH ----
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');
export const registerUser = (data) => api.post('/auth/register', data);
export const getUsers = () => api.get('/auth/users');

// ---- DASHBOARD ----
export const getDashboardStats = () => api.get('/dashboard/stats');

// ---- WHATSAPP ----
export const getSessions = () => api.get('/whatsapp/sessions');
export const createSession = (nombre) => api.post('/whatsapp/sessions', { nombre });
export const getQR = (sessionId) => api.get(`/whatsapp/sessions/${sessionId}/qr`);
export const deleteSession = (sessionId) => api.delete(`/whatsapp/sessions/${sessionId}`);
export const reconnectSession = (sessionId) => api.post(`/whatsapp/sessions/${sessionId}/reconnect`);

// ---- CONTACTS ----
export const getContacts = (params) => api.get('/contacts', { params });
export const getContact = (id) => api.get(`/contacts/${id}`);
export const createContact = (data) => api.post('/contacts', data);
export const updateContact = (id, data) => api.put(`/contacts/${id}`, data);
export const deleteContact = (id) => api.delete(`/contacts/${id}`);
export const importPreview = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/contacts/import/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const importContacts = (file, columnas) => {
  const fd = new FormData();
  fd.append('file', file);
  if (columnas) fd.append('columnas', JSON.stringify(columnas));
  return api.post('/contacts/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const exportContactsCSV = () =>
  api.get('/contacts/export/csv', { responseType: 'blob' });

// ---- CAMPAIGNS ----
export const getCampaigns = () => api.get('/campaigns');
export const getCampaign = (id) => api.get(`/campaigns/${id}`);
export const createCampaign = (formData) =>
  api.post('/campaigns', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const sendCampaign = (id) => api.post(`/campaigns/${id}/send`);
export const cancelCampaign = (id) => api.post(`/campaigns/${id}/cancel`);
export const deleteCampaign = (id) => api.delete(`/campaigns/${id}`);

// ---- AUTOMATIONS ----
export const getAutomations = () => api.get('/automations');
export const createAutomation = (data) => api.post('/automations', data);
export const toggleAutomation = (id) => api.put(`/automations/${id}/toggle`);
export const deleteAutomation = (id) => api.delete(`/automations/${id}`);

// ---- DOCUMENTS ----
export const uploadDocument = (file) => {
  const fd = new FormData();
  fd.append('documento', file);
  return api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const getCursos = () => api.get('/documents/cursos');
export const deleteCurso = (id) => api.delete(`/documents/cursos/${id}`);

export default api;
