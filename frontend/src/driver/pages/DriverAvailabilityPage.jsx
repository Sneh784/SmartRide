import { Activity, CheckCircle2, CircleOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { driverApi } from '../api/driverApi';
import { apiError, dateTime } from '../services/driverFormatters';

export default function DriverAvailabilityPage() {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    driverApi.availability()
      .then(({ data }) => {
        if (active) setAvailability(data);
      })
      .catch((requestError) => {
        if (active) setError(apiError(requestError, 'Could not load availability.'));
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

  const updateAvailability = async () => {
    const next = !availability?.available;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data } = await driverApi.updateAvailability(next);
      setAvailability(data);
      setMessage(next ? 'You are now available for Fleet Manager dispatch.' : 'You are now offline and will not receive new trip assignments.');
    } catch (requestError) {
      setError(apiError(requestError, 'Could not update your availability.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900">Availability</h1><p className="mt-1 text-sm text-slate-500">Control whether Fleet Managers can assign new trips to you.</p></div>
        <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className={`p-6 text-white sm:p-9 ${availability?.available ? 'bg-[linear-gradient(120deg,#075a42,#11845e)]' : 'bg-[linear-gradient(120deg,#334155,#475569)]'}`}>
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">{availability?.available ? <CheckCircle2 size={26} /> : <CircleOff size={26} />}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">Current status</p>
                <h2 className="mt-2 text-3xl font-black">{loading ? 'Loading…' : error && !availability ? 'Status unavailable' : availability?.available ? 'Available' : 'Offline'}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">{error && !availability ? 'Refresh to load your current dispatch availability.' : availability?.available ? 'Fleet Managers with authorized access can dispatch eligible confirmed bookings to you.' : 'You will not appear as an available driver for new trip dispatches.'}</p>
              </div>
            </div>
            <button onClick={updateAvailability} disabled={loading || saving || !availability || availability?.trip_in_progress} className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Updating…' : availability?.available ? 'Go offline' : 'Go available'}
            </button>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
          <article className="rounded-2xl border border-slate-200 p-4">
            <Activity className="text-[#B54700]" size={20} />
            <h3 className="mt-3 font-bold text-slate-900">Active trip protection</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{availability?.trip_in_progress ? 'Availability is locked offline while you have a trip in progress.' : 'Starting a trip automatically puts your account offline until you switch it back on.'}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 p-4">
            <CheckCircle2 className="text-emerald-600" size={20} />
            <h3 className="mt-3 font-bold text-slate-900">Last updated</h3>
            <p className="mt-1 text-sm text-slate-500">{dateTime(availability?.updated_at)}</p>
          </article>
        </div>
      </section>
    </>
  );
}
