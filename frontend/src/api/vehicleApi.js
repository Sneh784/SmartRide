import axiosInstance from './axiosInstance';

export const vehicleApi = {
  list: (params = {}) => axiosInstance.get('/vehicles', { params }),
  getById: (id) => axiosInstance.get(`/vehicles/${id}`),
  create: (payload) => axiosInstance.post('/vehicles', payload),
  update: (id, payload) => axiosInstance.put(`/vehicles/${id}`, payload),
  remove: (id) => axiosInstance.delete(`/vehicles/${id}`),
};
