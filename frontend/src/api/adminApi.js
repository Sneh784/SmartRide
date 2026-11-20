import axios from 'axios';

const configuredBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const apiRoot = configuredBase.replace(/\/v1\/?$/, '').replace(/\/$/, '');
const client = axios.create({ baseURL: `${apiRoot}/admin`, timeout: 20000, headers: { 'Content-Type': 'application/json' } });

client.interceptors.request.use((config) => {
  if (!config.url?.endsWith('/auth/login')) {
    const token = localStorage.getItem('smartRideToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminApi = {
  login: (payload) => client.post('/auth/login', payload),
  dashboard: (period = 'month') => client.get('/dashboard', { params: { period } }),
  users: (role, params = {}) => client.get(`/users/${role}`, { params }),
  setUserStatus: (role, id, payload) => client.patch(`/users/${role}/${id}/status`, payload),
  retryApprovalEmail: (role, id) => client.post(`/users/${role}/${id}/approval-email/retry`),
  vendorApplications: (params = {}) => client.get('/vendors', { params }),
  vendorApplication: (id) => client.get(`/vendors/${id}`),
  approveVendor: (id) => client.put(`/vendors/${id}/approve`),
  retryVendorApprovalEmail: (id) => client.put(`/vendors/${id}/approval-email/retry`),
  rejectVendor: (id, payload) => client.put(`/vendors/${id}/reject`, payload),
  suspendVendor: (id, payload = {}) => client.put(`/vendors/${id}/suspend`, payload),
  vendorDocument: (id) => client.get(`/vendors/documents/${id}`, { responseType: 'blob' }),
  vehicles: (params = {}) => client.get('/vehicles', { params }),
  setVehicleStatus: (id, payload) => client.patch(`/vehicles/${id}/status`, payload),
  bookings: (params = {}) => client.get('/bookings', { params }),
  payments: (params = {}) => client.get('/payments', { params }),
  kyc: (params = {}) => client.get('/kyc', { params }),
  setKycStatus: (id, payload) => client.patch(`/kyc/${id}/status`, payload),
  support: (params = {}) => client.get('/support', { params }),
  setSupportStatus: (id, payload) => client.patch(`/support/${id}/status`, payload),
  notifications: () => client.get('/notifications'),
  markNotificationRead: (id) => client.patch(`/notifications/${id}/read`),
  reports: (period) => client.get('/reports', { params: { period } }),
  profile: () => client.get('/settings/profile'),
  updateProfile: (payload) => client.put('/settings/profile', payload),
  settings: () => client.get('/settings'),
  saveSetting: (key, value) => client.put(`/settings/${key}`, { value }),
  changePassword: (payload) => client.put('/settings/password', payload),
};
