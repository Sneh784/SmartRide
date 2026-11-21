import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireFleetManager() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/fleet-manager/login" replace state={{ from: location }} />;
  if (user?.role !== 'FLEET_MANAGER') return <Navigate to="/" replace />;
  return <Outlet />;
}
