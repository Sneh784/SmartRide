
import { useEffect, useState } from 'react';
import {
  Bell,
  CarFront,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
  X,
} from 'lucide-react';

import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { vendorApi } from '../../api/vendorApi';
import { useAuth } from '../../context/AuthContext';

// Sidebar Navigation - No Headings
const navigation = [
  ['Dashboard', '/vendor/dashboard', LayoutDashboard],
  ['My Vehicles', '/vendor/vehicles', CarFront],
  // ['Add New Vehicle', '/vendor/vehicles/add', CarFront],
  ['Booking Requests', '/vendor/bookings/requests', Clock3],
  ['Confirmed Bookings', '/vendor/bookings/confirmed', Clock3],
  ['Active Rentals', '/vendor/active-rentals', CarFront],
  ['Booking History', '/vendor/booking-history', Clock3],
  ['Earnings', '/vendor/earnings', CreditCard],
  // ['Payments', '/vendor/payments', CreditCard],
  // ['Payout History', '/vendor/payout-history', CreditCard],
  ['Documents & KYC', '/vendor/documents', FileCheck2],
  ['My Profile', '/vendor/profile', UserRound],
  ['Settings', '/vendor/settings', Settings],
  ['Help & Support', '/vendor/support', CircleHelp],
];

// ==============================
// Vendor Sidebar
// ==============================

function VendorSidebar({
  collapsed,
  drawerOpen,
  onClose,
  onToggleCollapse,
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('vendor:'))
      .forEach((key) => sessionStorage.removeItem(key));

    logout();

    navigate('/vendor/login', { replace: true });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {drawerOpen && (
        <button
          aria-label="Close vendor navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          border-r border-slate-200
          bg-white px-4 py-5
          shadow-xl transition-all duration-200
          lg:translate-x-0 lg:shadow-none

          ${collapsed ? 'lg:w-[88px]' : 'lg:w-[260px]'}

          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ width: collapsed ? undefined : undefined }}
      >
        {/* Logo */}
        <div
          className={`flex h-12 items-center ${
            collapsed ? 'lg:justify-center' : 'justify-between'
          }`}
        >
          <Link
            to="/vendor/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 overflow-hidden"
            aria-label="SmartRide vendor dashboard"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#172033] text-white">
              <CarFront size={22} />
            </span>

            <span
              className={`whitespace-nowrap text-xl font-extrabold text-[#172033] ${
                collapsed ? 'lg:hidden' : ''
              }`}
            >
              Smart<span className="text-[#FF6B00]">Ride</span>
            </span>
          </Link>

          {/* Mobile Close */}
          <button
            onClick={onClose}
            aria-label="Close vendor navigation"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation Links - No Headings */}
        <nav
          aria-label="Vendor navigation"
          className="mt-7 flex-1 space-y-1 overflow-y-auto pb-2"
        >
          {navigation.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={
                to === '/vendor/dashboard' ||
                to === '/vendor/vehicles' ||
                to === '/vendor/booking-history'
              }
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `
                flex min-h-11 items-center gap-3
                rounded-xl px-3
                text-sm font-semibold
                transition-all duration-200

                ${
                  isActive
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-orange-50 hover:text-[#E85D00]'
                }

                ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                `
              }
            >
              <Icon size={19} className="shrink-0" />

              <span className={collapsed ? 'lg:hidden' : ''}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={signOut}
          title={collapsed ? 'Log out' : undefined}
          className={`
            mt-3 flex min-h-11 items-center gap-3
            rounded-xl px-3
            text-sm font-semibold
            text-slate-600
            hover:bg-red-50 hover:text-red-600
            transition-colors

            ${collapsed ? 'lg:justify-center lg:px-0' : ''}
          `}
        >
          <LogOut size={19} />

          <span className={collapsed ? 'lg:hidden' : ''}>
            Log Out
          </span>
        </button>

        {/* Collapse / Expand */}
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="
            absolute -right-3 top-24 hidden
            h-7 w-7 items-center justify-center
            rounded-full border border-slate-200
            bg-white text-slate-500 shadow-sm
            hover:bg-orange-50 hover:text-[#FF6B00]
            lg:flex
          "
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>
      </aside>
    </>
  );
}

// ==============================
// Vendor Header
// ==============================

function VendorHeader({ onOpenDrawer }) {
  const { user } = useAuth();
  const location = useLocation();

  const [businessName, setBusinessName] = useState('');
  const [unread, setUnread] = useState(0);

  const title =
    navigation.find(([, to]) => to === location.pathname)?.[0] ||
    'Vendor Workspace';

  useEffect(() => {
    let active = true;

    Promise.all([
      vendorApi.applicationStatus(),
      vendorApi.notifications(),
    ])
      .then(([application, notificationResponse]) => {
        if (!active) return;

        setBusinessName(application.data.businessName || '');

        setUnread(
          Number(notificationResponse.data.unread) || 0
        );
      })
      .catch(() => {
        if (active) {
          setUnread(0);
        }
      });

    return () => {
      active = false;
    };
  }, [location.pathname]);

  const initials = (user?.name || 'V')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <header
      className="
        sticky top-0 z-30
        flex min-h-[72px]
        items-center justify-between gap-3
        border-b border-slate-200
        bg-white/95 px-4 backdrop-blur
        sm:px-6 lg:px-8
      "
    >
      {/* Left Section */}
      <div className="flex min-w-0 items-center gap-3">

        {/* Mobile Menu */}
        <button
          onClick={onOpenDrawer}
          aria-label="Open vendor navigation"
          className="
            rounded-lg border border-slate-200
            p-2 text-slate-600
            hover:bg-orange-50 lg:hidden
          "
        >
          <Menu size={19} />
        </button>

        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-slate-900">
            {title}
          </p>

          <p className="hidden text-xs text-slate-500 sm:block">
            Vendor Portal / {title}
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">

        {/* Notifications */}
        <Link
          to="/vendor/notifications"
          aria-label={`Notifications${
            unread ? `, ${unread} unread` : ''
          }`}
          className="
            relative rounded-xl
            border border-slate-200
            p-2.5 text-slate-600
            hover:bg-orange-50 hover:text-[#D95400]
          "
        >
          <Bell size={19} />

          {unread > 0 && (
            <span
              className="
                absolute -right-1 -top-1
                flex min-h-5 min-w-5
                items-center justify-center
                rounded-full bg-red-600
                px-1 text-[10px]
                font-bold text-white
              "
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>

        {/* Vendor Information */}
        <div className="hidden text-right sm:block">
          <p className="max-w-40 truncate text-sm font-semibold text-slate-800">
            {user?.name || 'Vendor'}
          </p>

          <p className="max-w-40 truncate text-xs text-slate-500">
            {businessName || user?.email}
          </p>
        </div>

        {/* Profile Avatar */}
        <span
          className="
            flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-full bg-orange-100
            text-sm font-bold text-[#B54700]
          "
        >
          {initials}
        </span>
      </div>
    </header>
  );
}

// ==============================
// Main Vendor Layout
// ==============================

export default function VendorLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033]">

      {/* Sidebar */}
      <VendorSidebar
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onToggleCollapse={() =>
          setCollapsed((value) => !value)
        }
      />

      {/* Main Content */}
      <div
        className={`
          min-h-screen transition-[margin] duration-200
          ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[260px]'}
        `}
      >
        {/* Header */}
        <VendorHeader
          onOpenDrawer={() => setDrawerOpen(true)}
        />

        {/* Page Content */}
        <main
          className="
            mx-auto max-w-[1500px]
            px-4 py-6
            sm:px-6 lg:px-8 lg:py-8
          "
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
