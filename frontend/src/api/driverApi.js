import axiosInstance from './axiosInstance';

export const driverApi = {
  list: (params = {}) => axiosInstance.get('/drivers', { params }),
  getById: (id) => axiosInstance.get(`/drivers/${id}`),
  assignments: () => axiosInstance.get('/drivers/assignments'),
};
