import { Bell, Menu, Search, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { customerApi } from '../../api/customerApi';

const titles = {
  dashboard: 'Dashboard', vehicles: 'Browse Vehicles', bookings: 'My Bookings',
  'active-rentals': 'Active Rentals', 'booking-history': 'Booking History',
  payments: 'Payments', kyc: 'KYC Verification',profile: 'My Profile',
};

export default function CustomerHeader({ onOpenDrawer }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const section = location.pathname.split('/').filter(Boolean).at(-1) || 'dashboard';
  const title = titles[section] || 'Customer Portal';
  const name = user?.name || 'Customer';
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    customerApi.notifications().then(({ data }) => setUnread(data.filter((item) => !(item.read ?? item.is_read)).length)).catch(() => setUnread(0));
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onOpenDrawer} aria-label="Open customer menu" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={21} /></button>
          <div className="min-w-0"><p className="truncate text-lg font-bold text-[#172033] sm:text-xl">{title}</p><p className="hidden text-xs text-slate-500 sm:block">SmartRide customer portal</p></div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link to="/customer/vehicles" aria-label="Search vehicles" className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-[#E85D00]"><Search size={19} /></Link>
          <Link to="/customer/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-[#E85D00]"><Bell size={19} />{unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6B00] px-1 text-[9px] font-bold text-white">{unread}</span>}</Link>
          <div className="relative ml-1">
            <button onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-[#C64D00]">{initials || <UserRound size={17} />}</span>
              <span className="hidden max-w-36 truncate text-sm font-semibold text-slate-700 md:block">{name}</span>
            </button>
            {menuOpen && <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              <Link onClick={() => setMenuOpen(false)} to="/customer/profile" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">My Profile</Link>
              <Link onClick={() => setMenuOpen(false)} to="/customer/bookings" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">My Bookings</Link>
              <button onClick={() => { logout(); navigate('/', { replace: true }); }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Log out</button>
            </div>}
          </div>
        </div>
      </div>
    </header>
  );
}
