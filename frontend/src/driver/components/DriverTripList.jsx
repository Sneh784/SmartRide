import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { driverApi } from '../api/driverApi';
import { apiError } from '../services/driverFormatters';
import DriverTripCard from './DriverTripCard';

const statusMessage = {
  ACCEPTED: 'Trip accepted.',
  DECLINED: 'Trip declined. The Fleet Manager has been notified.',
  IN_PROGRESS: 'Trip started and your availability has been set offline.',
  COMPLETED: 'Trip completed and added to your estimated earnings history.',
};

export default function DriverTripList({ title, description, statuses, emptyTitle, emptyDescription, showActions = true }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    driverApi.trips()
      .then(({ data }) => {
        if (active) setTrips(Array.isArray(data) ? data : []);
      })
      .catch((requestError) => {
        if (active) setError(apiError(requestError, 'Could not load your trips.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadVersion]);

  const reload = () => {
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
      setMessage(statusMessage[status] || 'Trip updated.');
      setLoading(true);
      setReloadVersion((value) => value + 1);
    } catch (requestError) {
      setError(apiError(requestError, 'Could not update this trip.'));
    } finally {
      setSavingId(null);
    }
  };

  const visibleTrips = trips.filter((trip) => statuses.includes(String(trip.trip_status || '').toUpperCase()));

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-black text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>
        <button onClick={reload} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>
      {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={reload} className="font-bold underline">Retry</button></div>}
      {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}
      {loading ? <div className="space-y-4" aria-label="Loading trips">{[1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-slate-200" />)}</div>
        : error ? null
        : visibleTrips.length ? <div className="space-y-4">{visibleTrips.map((trip) => <DriverTripCard key={trip.assignment_id} trip={trip} saving={savingId === trip.assignment_id} onStatusChange={updateTrip} showActions={showActions} />)}</div>
          : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <ShieldCheck className="mx-auto text-slate-400" size={30} />
            <h2 className="mt-3 font-bold text-slate-900">{emptyTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{emptyDescription}</p>
          </div>}
    </>
  );
}
