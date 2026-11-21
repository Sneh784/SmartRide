import { Activity, ArrowRight, CalendarClock, CarFront, Check, Clock3, IndianRupee, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { driverApi } from '../api/driverApi';
import DriverTripCard from '../components/DriverTripCard';
import { apiError, money } from '../services/driverFormatters';

export default function DriverDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    driverApi.dashboard()
      .then(({ data }) => {
        if (active) setDashboard(data);
      })
      .catch((requestError) => {
        if (active) setError(apiError(requestError, 'Could not load your driver dashboard.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadVersion]);

  const refresh = () => {
    setError('');
    setLoading(true);
    setReloadVersion((value) => value + 1);
  };

  const updateTrip = async (trip, status) => {
    setSavingId(trip.assignment_id);
    setError('');
    setMessage('');
    try {
      await driverApi.updateTripStatus(trip.assignment_id, status);
      setMessage(status === 'ACCEPTED' ? 'Trip accepted.'
        : status === 'DECLINED' ? 'Trip declined. The Fleet Manager has been notified.'
          : status === 'COMPLETED' ? 'Trip completed and added to earnings history.'
            : 'Trip started and your availability is now offline.');
      refresh();
    } catch (requestError) {
      setError(apiError(requestError, 'Could not update this trip.'));
    } finally {
      setSavingId(null);
    }
  };

  const stats = [
    ['Trip offers', dashboard?.pendingTrips || 0, CalendarClock, '/driver/assigned-bookings'],
    ['Upcoming', dashboard?.upcomingTrips || 0, Clock3, '/driver/assigned-bookings'],
    ['In progress', dashboard?.activeTrips || 0, CarFront, '/driver/active-trips'],
    ['Completed', dashboard?.completedTrips || 0, Check, '/driver/trip-history'],
  ];
  const trips = Array.isArray(dashboard?.trips) ? dashboard.trips : [];
  const priorityTrips = trips.filter((trip) => ['PENDING', 'IN_PROGRESS', 'ACCEPTED'].includes(String(trip.trip_status || '').toUpperCase())).slice(0, 3);

  return (
    <>
      <section className="overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_85%_20%,rgba(255,107,0,.32),transparent_35%),linear-gradient(120deg,#101a2b,#1b314c)] p-6 text-white shadow-xl sm:p-9">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-200">Driver workspace</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Welcome, {dashboard?.driverName || 'Driver'}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Review trip offers, contact customers, navigate to each stop, and track your completed trips and estimated earnings.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-400/20 text-orange-200"><IndianRupee size={22} /></span>
            <div><p className="text-xs text-slate-300">Completed trip earnings</p><p className="text-2xl font-black">{loading || error ? '—' : money(dashboard?.earnings)}</p></div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/driver/availability" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#172033] hover:bg-orange-50"><Activity size={17} />Manage availability</Link>
          <Link to="/driver/profile" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"><UserRound size={17} />View profile</Link>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Trip summary">
        {stats.map(([label, count, Icon, to]) => <Link key={label} to={to} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#B54700]"><Icon size={19} /></span>
          <p className="mt-3 text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-black text-slate-900">{loading || error ? '—' : count}</p>
        </Link>)}
      </section>

      {error && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={refresh} className="font-bold underline">Retry</button></div>}
      {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}

      <section className="mt-7">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><h2 className="text-xl font-extrabold text-slate-900">Your next actions</h2><p className="mt-1 text-sm text-slate-500">Contact details are shown only for trips assigned to your account.</p></div>
          <button onClick={refresh} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Refresh</button>
        </div>
        {loading ? <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
          : error ? null
          : priorityTrips.length ? <div className="space-y-4">{priorityTrips.map((trip) => <DriverTripCard key={trip.assignment_id} trip={trip} saving={savingId === trip.assignment_id} onStatusChange={updateTrip} />)}</div>
            : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-bold text-slate-900">No upcoming actions</p>
              <p className="mt-1 text-sm text-slate-500">New confirmed bookings assigned by your Fleet Manager will appear here.</p>
            </div>}
        <Link to="/driver/assigned-bookings" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#B54700] hover:underline">View assigned bookings <ArrowRight size={16} /></Link>
      </section>
    </>
  );
}
