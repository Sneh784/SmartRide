import Footer from './Footer';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  if (pathname === '/customer' || pathname.startsWith('/customer/') || pathname === '/admin' || pathname.startsWith('/admin/')
    || pathname === '/vendor' || pathname.startsWith('/vendor/dashboard') || pathname.startsWith('/vendor/vehicles')
    || pathname.startsWith('/vendor/vehicle-approval') || pathname.startsWith('/vendor/bookings')
    || pathname.startsWith('/vendor/active-rentals') || pathname.startsWith('/vendor/booking-history')
    || pathname.startsWith('/vendor/earnings') || pathname.startsWith('/vendor/payments')
    || pathname.startsWith('/vendor/payout-history') || pathname.startsWith('/vendor/reviews')
    || pathname.startsWith('/vendor/documents') || pathname.startsWith('/vendor/notifications')
    || pathname.startsWith('/vendor/profile') || pathname.startsWith('/vendor/settings')
    || pathname.startsWith('/vendor/support')) return children;
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
