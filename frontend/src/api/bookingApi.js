import axiosInstance from './axiosInstance';

export const bookingApi = {
  list: (params = {}) => axiosInstance.get('/bookings', { params }),
  getById: (id) => axiosInstance.get(`/bookings/${id}`),
  create: (payload) => axiosInstance.post('/bookings', payload),
  updateStatus: (id, status) => axiosInstance.patch(`/bookings/${id}/status`, { status }),
};
