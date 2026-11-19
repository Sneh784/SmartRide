import { useEffect, useState } from 'react';
import { Bell, CarFront, CircleAlert, LoaderCircle, LogOut, ReceiptText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { vendorApi } from '../api/vendorApi';
import { useAuth } from '../context/AuthContext';

const cards = [
  ['Total vehicles', 'total_vehicles', CarFront],
  ['Approved vehicles', 'approved_vehicles', CarFront],
  ['Pending vehicle approvals', 'pending_vehicles', CircleAlert],
  ['Total bookings', 'total_bookings', ReceiptText],
];

export default function VendorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const [dashboardResponse, notificationResponse] = await Promise.all([
        vendorApi.dashboard(),
        vendorApi.notifications(),
      ]);
      setDashboard(dashboardResponse.data);
      setNotifications(notificationResponse.data.items || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Could not load vendor dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([vendorApi.dashboard(), vendorApi.notifications()])
      .then(([dashboardResponse, notificationResponse]) => {
        if (!active) return;
        setDashboard(dashboardResponse.data);
        setNotifications(notificationResponse.data.items || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.detail || 'Could not load vendor dashboard data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const markRead = async (id) => {
    try {
      await vendorApi.markNotificationRead(id);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Could not update notification.');
    }
  };

  const signOut = () => {
    logout();
    navigate('/vendor/login', { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#D95400]">Vendor workspace</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Welcome, {user?.name || 'Vendor'}</h1>
          <p className="mt-2 text-slate-600">Manage approved listings and review your SmartRide updates.</p>
        </div>
        <button onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut size={17} /> Log out</button>
      </header>

      {error && <div role="alert" className="mt-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={load} className="font-bold underline">Retry</button></div>}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-slate-500"><LoaderCircle className="animate-spin" size={20} />Loading your dashboard…</div>
      ) : dashboard && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, key, Icon]) => (
            <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#D95400]"><Icon size={20} /></span>
              <p className="mt-4 text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-black text-slate-900">{dashboard[key] ?? 0}</p>
            </article>
          ))}
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex items-center gap-2"><Bell size={19} className="text-[#D95400]" /><h2 className="text-lg font-bold text-slate-900">Notifications</h2></div>
        {notifications.length ? (
          <div className="mt-4 divide-y divide-slate-100">
            {notifications.map((item) => (
              <article key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div><h3 className="font-semibold text-slate-900">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p></div>
                {!item.is_read && <button onClick={() => markRead(item.id)} className="text-sm font-semibold text-[#D95400] hover:underline">Mark as read</button>}
              </article>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-slate-500">No notifications yet.</p>}
      </section>

      <section className="mt-6 rounded-2xl border border-orange-100 bg-orange-50 p-5 text-sm leading-6 text-orange-900">
        Vehicle listings must be reviewed and approved separately before they become visible to customers.
      </section>
    </div>
  );
}
