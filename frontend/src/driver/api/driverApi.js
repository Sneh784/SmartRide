import axiosInstance from '../../api/axiosInstance';

const configuredBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const apiRoot = configuredBase.replace(/\/v1\/?$/, '').replace(/\/$/, '');
const driverClient = axiosInstance.create({ baseURL: `${apiRoot}/driver` });

driverClient.interceptors.request.use((config) => {
  if (/\/auth\/register\/?$/.test(config.url || '')) {
    delete config.headers.Authorization;
    return config;
  }

  const token = localStorage.getItem('smartRideToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const driverApi = {
  apply: (formData) => driverClient.post('/auth/register', formData),
  dashboard: () => driverClient.get('/dashboard'),
  trips: (params = {}) => driverClient.get('/trips', { params }),
  trip: (id) => driverClient.get(`/trips/${id}`),
  updateTripStatus: (id, status) => driverClient.put(`/trips/${id}/status`, { status }),
  profile: () => driverClient.get('/profile'),
  updateProfile: (payload) => driverClient.put('/profile', payload),
  availability: () => driverClient.get('/availability'),
  updateAvailability: (available) => driverClient.put('/availability', { available }),
  earnings: () => driverClient.get('/earnings'),
  documents: () => driverClient.get('/documents'),
  uploadDocument: (documentType, file) => {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', file);
    return driverClient.post('/documents', formData);
  },
  applicationDocument: (type) => driverClient.get(`/documents/application/${type}`, { responseType: 'blob' }),
  additionalDocument: (id) => driverClient.get(`/documents/additional/${id}`, { responseType: 'blob' }),
  deleteDocument: (id) => driverClient.delete(`/documents/additional/${id}`),
  notifications: () => driverClient.get('/notifications'),
  markNotificationRead: (id) => driverClient.put(`/notifications/${id}/read`),
  markAllNotificationsRead: () => driverClient.put('/notifications/read-all'),
};
