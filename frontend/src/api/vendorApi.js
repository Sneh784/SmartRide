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
  register: (formData) => vendorClient.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  login: (payload) => vendorClient.post('/auth/login', payload),
  applicationStatus: () => vendorClient.get('/application/status'),
  dashboard: () => vendorClient.get('/dashboard'),
  notifications: () => vendorClient.get('/notifications'),
  markNotificationRead: (id) => vendorClient.put(`/notifications/${id}/read`),
};
