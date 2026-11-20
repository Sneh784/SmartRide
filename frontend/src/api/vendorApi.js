import axiosInstance from './axiosInstance';

const configuredBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const apiRoot = configuredBase.replace(/\/v1\/?$/, '').replace(/\/$/, '');
const vendorClient = axiosInstance.create({ baseURL: `${apiRoot}/vendor` });

vendorClient.interceptors.request.use((config) => {
  const isPublicAuthRequest = /\/auth\/(register|login)\/?$/.test(config.url || '');
  if (isPublicAuthRequest) {
    delete config.headers.Authorization;
    return config;
  }
  const token = localStorage.getItem('smartRideToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const vendorApi = {
  register: (formData) => vendorClient.post('/auth/register', formData),
  login: (payload) => vendorClient.post('/auth/login', payload),
  applicationStatus: () => vendorClient.get('/application/status'),
  dashboard: () => vendorClient.get('/dashboard'),
  vehicles: (params = {}) => vendorClient.get('/vehicles', { params }),
  vehicle: (id) => vendorClient.get(`/vehicles/${id}`),
  createVehicle: (payload) => vendorClient.post('/vehicles', payload),
  updateVehicle: (id, payload) => vendorClient.put(`/vehicles/${id}`, payload),
  vehicleMedia: (id) => vendorClient.get(`/vehicles/${id}/media`),
  uploadVehicleMedia: (id, formData) => vendorClient.post(`/vehicles/${id}/media`, formData),
  vehicleMediaFile: (id, mediaId) => vendorClient.get(`/vehicles/${id}/media/${mediaId}`, { responseType: 'blob' }),
  deleteVehicle: (id) => vendorClient.delete(`/vehicles/${id}`),
  setVehicleAvailability: (id, availability) => vendorClient.put(`/vehicles/${id}/availability`, { availability }),
  bookings: (params = {}) => vendorClient.get('/bookings', { params }),
  acceptBooking: (id) => vendorClient.put(`/bookings/${id}/accept`),
  rejectBooking: (id, payload) => vendorClient.put(`/bookings/${id}/reject`, payload),
  payments: () => vendorClient.get('/payments'),
  notifications: () => vendorClient.get('/notifications'),
  markNotificationRead: (id) => vendorClient.put(`/notifications/${id}/read`),
  vendorDocument: (id) => vendorClient.get(`/documents/${id}`, { responseType: 'blob' }),
};
