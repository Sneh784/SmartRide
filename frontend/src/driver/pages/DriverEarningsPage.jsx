import { CircleDollarSign, Clock3, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { driverApi } from '../api/driverApi';
import DriverTripCard from '../components/DriverTripCard';
import { apiError, dateTime, money } from '../services/driverFormatters';

export default function DriverEarningsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    driverApi.earnings()
      .then(({ data: result }) => {
        if (active) setData(result);
      })
      .catch((requestError) => {
        if (active) setError(apiError(requestError, 'Could not load earnings.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadVersion]);

  const monthlyTotals = useMemo(() => {
    const totals = new Map();
    (data?.items || []).forEach((trip) => {
      const completedAt = trip.completed_at ? new Date(trip.completed_at) : null;
      if (!completedAt || Number.isNaN(completedAt.getTime())) return;
      const key = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(completedAt);
      totals.set(key, (totals.get(key) || 0) + Number(trip.estimated_earnings || 0));
    });
    return [...totals.entries()].slice(0, 6).reverse();
  }, [data]);

  const maxMonthly = Math.max(...monthlyTotals.map(([, amount]) => amount), 1);
  const reload = () => {
    setError('');
    setLoading(true);
    setReloadVersion((value) => value + 1);
  };

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-black text-slate-900">Earnings</h1><p className="mt-1 text-sm text-slate-500">Estimated earnings from completed driver trips. This is not a payroll or payout record.</p></div>
        <button onClick={reload} disabled={loading} className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl bg-[#172033] p-6 text-white shadow-sm">
          <CircleDollarSign className="text-orange-300" size={24} />
          <p className="mt-4 text-sm text-slate-300">Completed trip earnings estimate</p>
          <p className="mt-1 text-3xl font-black">{loading || error || !data ? '—' : money(data.total)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Clock3 className="text-[#B54700]" size={24} />
          <p className="mt-4 text-sm text-slate-500">Completed trips</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{loading || error || !data ? '—' : Number(data.completedTrips) || 0}</p>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Monthly estimate trend</h2>
        {loading ? <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" />
          : error ? null
          : monthlyTotals.length ? <div className="mt-5 flex h-48 items-end gap-3 overflow-x-auto border-b border-slate-100 pb-2">
            {monthlyTotals.map(([month, amount]) => <div key={month} className="flex h-full min-w-16 flex-1 flex-col items-center justify-end">
              <span className="text-xs font-semibold text-slate-600">{money(amount)}</span>
              <div className="mt-1 w-full rounded-t bg-[#FF6B00]" style={{ height: `${Math.max(5, amount / maxMonthly * 75)}%` }} />
              <span className="mt-2 text-xs text-slate-500">{month}</span>
            </div>)}
          </div> : <p className="mt-4 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Completed trip estimates will appear here.</p>}
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold text-slate-900">Completed trips</h2><Link to="/driver/trip-history" className="text-sm font-bold text-[#B54700] hover:underline">Full trip history</Link></div>
        {loading ? <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
          : error ? null
          : data?.items?.length ? <div className="space-y-4">{data.items.map((trip) => <div key={trip.assignment_id}>
            <p className="mb-2 text-xs font-semibold text-slate-500">Completed {dateTime(trip.completed_at)}</p>
            <DriverTripCard trip={trip} showActions={false} />
          </div>)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No completed trips to calculate yet.</p>}
      </section>
    </>
  );
}
