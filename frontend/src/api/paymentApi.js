import axiosInstance from './axiosInstance';

export const paymentApi = {
  createOrder: (payload) => axiosInstance.post('/payments/create-order', payload),
  verify: (payload) => axiosInstance.post('/payments/verify', payload),
  history: () => axiosInstance.get('/payments'),
};
