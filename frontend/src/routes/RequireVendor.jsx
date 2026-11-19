import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireVendor() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/vendor/login" replace state={{ from: location }} />;
  if (user?.role !== 'VENDOR') return <Navigate to="/" replace />;
  return <Outlet />;
}
