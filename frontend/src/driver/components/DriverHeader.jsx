import { Bell, Menu, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { driverApi } from '../api/driverApi';
import { apiError } from '../services/driverFormatters';

const titles = {
  dashboard: 'Dashboard',
  'assigned-bookings': 'Assigned bookings',
  'active-trips': 'Active trips',
  'trip-history': 'Trip history',
  earnings: 'Earnings',
  availability: 'Availability',
  documents: 'Documents',
  notifications: 'Notifications',
  profile: 'Profile',
};

export default function DriverHeader({ onOpenDrawer }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [notificationError, setNotificationError] = useState('');
  const section = location.pathname.split('/').filter(Boolean).at(-1) || 'dashboard';
  const title = titles[section] || 'Driver workspace';
  const name = user?.name || 'Driver';
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    let active = true;
    driverApi.notifications()
      .then(({ data }) => {
        if (active) {
          setUnread(Number(data?.unread) || 0);
          setNotificationError('');
        }
      })
      .catch((error) => {
        if (active) setNotificationError(apiError(error, 'Could not load notification count.'));
      });
    return () => { active = false; };
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onOpenDrawer} aria-label="Open driver menu" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={21} /></button>
          <div className="min-w-0"><p className="truncate text-lg font-bold text-[#172033] sm:text-xl">{title}</p><p className="hidden text-xs text-slate-500 sm:block">SmartRide driver portal</p></div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link to="/driver/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} title={notificationError || undefined} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-[#E85D00]">
            <Bell size={19} />
            {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6B00] px-1 text-[9px] font-bold text-white">{unread}</span>}
            {notificationError && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />}
          </Link>
          <div className="flex items-center gap-2 rounded-xl p-1.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-[#C64D00]">{initials || <UserRound size={17} />}</span>
            <span className="hidden max-w-36 truncate text-sm font-semibold text-slate-700 md:block">{name}</span>
          </div>
          <button onClick={() => { logout(); navigate('/driver/login', { replace: true }); }} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Log out</button>
        </div>
      </div>
      {notificationError && <p role="status" className="border-t border-amber-100 bg-amber-50 px-4 py-1 text-xs text-amber-800 sm:px-6 lg:px-8">Notification badge: {notificationError}</p>}
    </header>
  );
}
