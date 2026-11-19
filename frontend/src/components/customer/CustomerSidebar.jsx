import {
  Bell, CarFront, ChevronLeft, ChevronRight, CircleHelp, Clock3, CreditCard,
  Heart, LayoutDashboard, LogOut, ShieldCheck, UserRound, X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const links = [
  { label: 'Dashboard', to: '/customer/dashboard', icon: LayoutDashboard },
  { label: 'Browse Vehicles', to: '/customer/vehicles', icon: CarFront },
  { label: 'My Bookings', to: '/customer/bookings', icon: Clock3 },
  { label: 'Active Rentals', to: '/customer/active-rentals', icon: CarFront },
  { label: 'Booking History', to: '/customer/booking-history', icon: Clock3 },
  { label: 'Wishlist', to: '/customer/wishlist', icon: Heart },
  { label: 'Payments', to: '/customer/payments', icon: CreditCard },
  { label: 'KYC Verification', to: '/customer/kyc', icon: ShieldCheck },
  { label: 'Notifications', to: '/customer/notifications', icon: Bell },
  { label: 'My Profile', to: '/customer/profile', icon: UserRound },
  { label: 'Support', to: '/customer/support', icon: CircleHelp },
];

export default function CustomerSidebar({ collapsed, drawerOpen, onClose, onToggleCollapse }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const leave = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <>
      {drawerOpen && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-xl transition-all duration-200 lg:translate-x-0 lg:shadow-none ${collapsed ? 'lg:w-[88px]' : 'lg:w-[260px]'} ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex h-12 items-center ${collapsed ? 'lg:justify-center' : 'justify-between'}`}>
          <NavLink to="/customer/dashboard" onClick={onClose} className="flex items-center gap-3 overflow-hidden">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#172033] text-white"><CarFront size={22} /></span>
            <span className={`whitespace-nowrap text-xl font-extrabold text-[#172033] ${collapsed ? 'lg:hidden' : ''}`}>Smart<span className="text-[#FF6B00]">Ride</span></span>
          </NavLink>
          <button onClick={onClose} aria-label="Close navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><X size={19} /></button>
        </div>
        <p className={`mb-3 mt-8 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400 ${collapsed ? 'lg:hidden' : ''}`}>Customer menu</p>
        <nav aria-label="Customer navigation" className="flex-1 space-y-1 overflow-y-auto">
          {links.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/customer/dashboard'} onClick={onClose} title={collapsed ? label : undefined}
              className={({ isActive }) => `group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${isActive ? 'bg-[#FF6B00] text-white shadow-sm' : 'text-slate-600 hover:bg-orange-50 hover:text-[#E85D00]'} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <Icon size={19} className="shrink-0" /><span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={leave} title={collapsed ? 'Log out' : undefined} className={`mt-4 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <LogOut size={19} /><span className={collapsed ? 'lg:hidden' : ''}>Log out</span>
        </button>
        <button onClick={onToggleCollapse} className="absolute -right-3 top-24 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm lg:flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>
    </>
  );
}
