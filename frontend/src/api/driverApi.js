import axiosInstance from './axiosInstance';

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
  list: (params = {}) => axiosInstance.get('/drivers', { params }),
  getById: (id) => axiosInstance.get(`/drivers/${id}`),
  assignments: () => axiosInstance.get('/drivers/assignments'),
};
