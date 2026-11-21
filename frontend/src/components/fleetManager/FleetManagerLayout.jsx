import { useEffect, useState } from 'react';
import {
  Activity, Bell, CalendarDays, CarFront, ChartNoAxesCombined, ChevronLeft,
  ChevronRight, ClipboardList, LayoutDashboard, LogOut, Menu, Settings,
  UserRound, Users, Wrench, X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { fleetManagerApi } from '../../api/fleetManagerApi';
import { useAuth } from '../../context/AuthContext';

const groups = [
  ['Overview', [['Dashboard', '/fleet-manager/dashboard', LayoutDashboard]]],
  ['Fleet operations', [
    ['Vehicle management', '/fleet-manager/vehicles', CarFront],
    ['Vehicle assignments', '/fleet-manager/vehicle-assignments', ClipboardList],
    ['Trip dispatch', '/fleet-manager/trip-dispatch', ClipboardList],
    ['Driver management', '/fleet-manager/drivers', Users],
    ['Vehicle availability', '/fleet-manager/availability', Activity],
    ['Active rentals', '/fleet-manager/active-rentals', CalendarDays],
  ]],
  ['Maintenance', [
    ['Maintenance schedule', '/fleet-manager/maintenance/schedule', Wrench],
    ['Maintenance requests', '/fleet-manager/maintenance/requests', ClipboardList],
    ['Maintenance history', '/fleet-manager/maintenance/history', CalendarDays],
  ]],
  ['Performance', [
    ['Vehicle utilization', '/fleet-manager/utilization', Activity],
    ['Operational reports', '/fleet-manager/reports', ChartNoAxesCombined],
    ['Performance analytics', '/fleet-manager/analytics', ChartNoAxesCombined],
  ]],
  ['Account', [
    ['Notifications', '/fleet-manager/notifications', Bell],
    ['My profile', '/fleet-manager/profile', UserRound],
    ['Settings', '/fleet-manager/settings', Settings],
  ]],
];

const titles = groups.flatMap(([, items]) => items).reduce((result, [label, path]) => {
  result[path] = label;
  return result;
}, {});

function Sidebar({ collapsed, drawerOpen, onClose, onToggleCollapse }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const signOut = () => {
    Object.keys(sessionStorage).filter((key) => key.startsWith('fleet-manager:'))
      .forEach((key) => sessionStorage.removeItem(key));
    logout();
    navigate('/fleet-manager/login', { replace: true });
  };
  return <>
    {drawerOpen && <button aria-label="Close fleet navigation" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white px-3 py-5 shadow-xl transition-all duration-200 lg:translate-x-0 lg:shadow-none ${collapsed ? 'lg:w-[88px]' : 'lg:w-[260px]'} ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'w-[260px]' : 'w-[260px]'}`}>
      <div className={`flex h-12 items-center ${collapsed ? 'lg:justify-center' : 'justify-between'}`}>
        <Link to="/fleet-manager/dashboard" onClick={onClose} className="flex items-center gap-3 overflow-hidden" aria-label="SmartRide Fleet Manager">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#172033] text-white"><CarFront size={22} /></span>
          <span className={`whitespace-nowrap text-xl font-extrabold text-[#172033] ${collapsed ? 'lg:hidden' : ''}`}>Smart<span className="text-[#FF6B00]">Ride</span></span>
        </Link>
        <button onClick={onClose} aria-label="Close fleet navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><X size={19} /></button>
      </div>
      <nav aria-label="Fleet Manager navigation" className="mt-6 flex-1 space-y-5 overflow-y-auto pb-2">
        {groups.map(([group, items]) => <section key={group}>
          <p className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-slate-400 ${collapsed ? 'lg:hidden' : ''}`}>{group}</p>
          <div className="space-y-1">
            {items.map(([label, to, Icon]) => <NavLink key={to} to={to} end={to === '/fleet-manager/dashboard'}
              onClick={onClose} title={collapsed ? label : undefined}
              className={({ isActive }) => `flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${isActive ? 'bg-[#FF6B00] text-white shadow-sm' : 'text-slate-600 hover:bg-orange-50 hover:text-[#E85D00]'} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
              <Icon size={18} className="shrink-0" /><span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </NavLink>)}
          </div>
        </section>)}
      </nav>
      <button onClick={signOut} title={collapsed ? 'Log out' : undefined}
        className={`mt-3 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
        <LogOut size={18} /><span className={collapsed ? 'lg:hidden' : ''}>Log out</span>
      </button>
      <button onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-24 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-[#FF6B00] lg:flex">
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  </>;
}

function Header({ onOpenDrawer }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const title = titles[location.pathname] || 'Fleet Manager';
  useEffect(() => {
    let active = true;
    fleetManagerApi.notifications().then(({ data }) => {
      if (active) setUnread(Number(data.unread) || 0);
    }).catch(() => {
      if (active) setUnread(0);
    });
    return () => { active = false; };
  }, [location.pathname]);
  const initials = (user?.name || 'Fleet Manager').trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]).join('').toUpperCase();
  return <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
    <div className="flex min-w-0 items-center gap-3">
      <button onClick={onOpenDrawer} aria-label="Open fleet navigation" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-orange-50 lg:hidden"><Menu size={19} /></button>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold text-slate-900">{title}</p>
        <p className="hidden text-xs text-slate-500 sm:block">Fleet Manager / {title}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <Link to="/fleet-manager/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-orange-50 hover:text-[#D95400]">
        <Bell size={19} />{unread > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
      </Link>
      <Link to="/fleet-manager/profile" className="flex items-center gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-[#B54700]">{initials}</span>
        <span className="hidden max-w-40 truncate text-sm font-semibold text-slate-800 sm:block">{user?.name || 'Fleet Manager'}</span>
      </Link>
    </div>
  </header>;
}

export default function FleetManagerLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return <div className="min-h-screen bg-[#F5F7FA] text-[#172033]">
    <Sidebar collapsed={collapsed} drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
      onToggleCollapse={() => setCollapsed((value) => !value)} />
    <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[260px]'}`}>
      <Header onOpenDrawer={() => setDrawerOpen(true)} />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main>
    </div>
  </div>;
}
