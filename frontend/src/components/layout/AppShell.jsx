import Footer from './Footer';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  if (pathname === '/customer' || pathname.startsWith('/customer/') || pathname === '/admin' || pathname.startsWith('/admin/')) return children;
  const hideFooter = ['/login', '/register', '/vendor/login', '/vendor/register', '/admin/login'].includes(pathname);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <main>{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}
