import axiosInstance from './axiosInstance';

export const customerApi = {
  dashboard: () => axiosInstance.get('/customer/dashboard'),
  bookings: () => axiosInstance.get('/customer/bookings'),
  activeRentals: () => axiosInstance.get('/customer/active-rentals'),
  bookingHistory: () => axiosInstance.get('/customer/booking-history'),
  profile: () => axiosInstance.get('/customer/profile'),
  updateProfile: (payload) => axiosInstance.put('/customer/profile', payload),
  payments: () => axiosInstance.get('/customer/payments'),
  vehicles: () => axiosInstance.get('/customer/vehicles'),
  vehicle: (id) => axiosInstance.get(`/customer/vehicles/${id}`),
  wishlist: () => axiosInstance.get('/customer/wishlist'),
  addWishlist: (vehicleId) => axiosInstance.post(`/customer/wishlist/${vehicleId}`),
  removeWishlist: (vehicleId) => axiosInstance.delete(`/customer/wishlist/${vehicleId}`),
  kyc: () => axiosInstance.get('/customer/kyc'),
  submitKyc: (formData) => axiosInstance.post('/customer/kyc', formData),
  reviewBooking: (bookingId, payload) => axiosInstance.post(`/customer/bookings/${bookingId}/review`, payload),
  notifications: () => axiosInstance.get('/customer/notifications'),
  markNotificationRead: (id) => axiosInstance.post(`/customer/notifications/${id}/read`),
  supportTickets: () => axiosInstance.get('/customer/support'),
  createSupportTicket: (payload) => axiosInstance.post('/customer/support', payload),
};
