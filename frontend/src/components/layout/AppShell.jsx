import Footer from './Footer';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const driverWorkspacePaths = [
    '/driver/dashboard', '/driver/assigned-bookings', '/driver/active-trips',
    '/driver/trip-history', '/driver/earnings', '/driver/availability', '/driver/documents',
    '/driver/notifications', '/driver/profile',
  ];
  const isDriverWorkspace = pathname === '/driver-dashboard'
    || driverWorkspacePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (pathname === '/customer' || pathname.startsWith('/customer/') || pathname === '/admin' || pathname.startsWith('/admin/')
    || pathname === '/vendor' || pathname.startsWith('/vendor/dashboard') || pathname.startsWith('/vendor/vehicles')
    || pathname === '/fleet-manager' || pathname.startsWith('/fleet-manager/')
    || pathname === '/driver' || isDriverWorkspace
    || pathname.startsWith('/vendor/vehicle-approval') || pathname.startsWith('/vendor/bookings')
    || pathname.startsWith('/vendor/active-rentals') || pathname.startsWith('/vendor/booking-history')
    || pathname.startsWith('/vendor/earnings') || pathname.startsWith('/vendor/payments')
    || pathname.startsWith('/vendor/payout-history') || pathname.startsWith('/vendor/reviews')
    || pathname.startsWith('/vendor/documents') || pathname.startsWith('/vendor/notifications')
    || pathname.startsWith('/vendor/profile') || pathname.startsWith('/vendor/settings')
    || pathname.startsWith('/vendor/support')) return children;
  const hideFooter = [
    '/login',
    '/register',
    '/vendor/login',
    '/vendor/register',
    '/driver/login',
    '/admin/login',
    '/fleet-manager/login',
    '/driver/register',
  ].includes(pathname);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <main>{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}
