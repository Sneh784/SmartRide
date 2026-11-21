import axios from 'axios';

const configuredBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const apiRoot = configuredBase.replace(/\/v1\/?$/, '').replace(/\/$/, '');
const client = axios.create({ baseURL: `${apiRoot}/fleet-manager`, timeout: 20000 });

client.interceptors.request.use((config) => {
  const isLogin = config.url === '/auth/login';
  if (!isLogin) {
    const token = localStorage.getItem('smartRideToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fleetManagerApi = {
  login: (payload) => client.post('/auth/login', payload),
  me: () => client.get('/auth/me'),
  dashboard: () => client.get('/dashboard/summary'),
  vehicles: (params = {}) => client.get('/vehicles', { params }),
  availability: (params = {}) => client.get('/vehicles/availability', { params }),
  setOperationalStatus: (id, status) => client.put(`/vehicles/${id}/operational-status`, { status }),
  drivers: (params = {}) => client.get('/drivers', { params }),
  driverAssignments: (id) => client.get(`/drivers/${id}/assignments`),
  assignments: (params = {}) => client.get('/assignments', { params }),
  createAssignment: (payload) => client.post('/assignments', payload),
  dispatchBookings: () => client.get('/trip-dispatch'),
  assignTrip: (payload) => client.post('/trip-dispatch', payload),
  updateAssignmentStatus: (id, status) => client.put(`/assignments/${id}/status`, { status }),
  cancelAssignment: (id) => client.put(`/assignments/${id}/cancel`),
  activeRentals: () => client.get('/active-rentals'),
  rental: (id) => client.get(`/rentals/${id}`),
  reportRentalIssue: (id, payload) => client.post(`/rentals/${id}/issues`, payload),
  maintenance: (params = {}) => client.get('/maintenance', { params }),
  createMaintenance: (payload) => client.post('/maintenance', payload),
  updateMaintenanceStatus: (id, payload) => client.put(`/maintenance/${id}/status`, payload),
  maintenanceRequests: (params = {}) => client.get('/maintenance/requests', { params }),
  createMaintenanceRequest: (payload) => client.post('/maintenance/requests', payload),
  updateMaintenanceRequest: (id, payload) => client.put(`/maintenance/requests/${id}/status`, payload),
  utilization: (params = {}) => client.get('/utilization', { params }),
  report: (type, params = {}) => client.get(`/reports/${type}`, { params }),
  notifications: () => client.get('/notifications'),
  markNotificationRead: (id) => client.put(`/notifications/${id}/read`),
  markAllNotificationsRead: () => client.put('/notifications/read-all'),
  profile: () => client.get('/profile'),
  updateProfile: (payload) => client.put('/profile', payload),
  preferences: () => client.get('/settings'),
  updatePreferences: (payload) => client.put('/settings', payload),
  changePassword: (payload) => client.put('/settings/password', payload),
};
