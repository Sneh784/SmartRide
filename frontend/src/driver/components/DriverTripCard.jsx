import {
  ArrowUpRight, CarFront, Check, Mail, MapPin, Phone, UserRound, X,
} from 'lucide-react';
import { dateTime, money } from '../services/driverFormatters';

const statusClass = {
  PENDING: 'bg-amber-50 text-amber-800',
  ACCEPTED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-orange-50 text-orange-800',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  DECLINED: 'bg-red-50 text-red-700',
};

function directionsUrl(location) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location || '')}`;
}

export default function DriverTripCard({ trip, saving, onStatusChange, showActions = true }) {
  const status = String(trip.trip_status || '').toUpperCase();
  const vehicleName = trip.vehicle_name || `${trip.brand || ''} ${trip.model || ''}`.trim() || 'Assigned vehicle';

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#D95400]"><CarFront size={22} /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Booking #{trip.booking_id}</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">{vehicleName}</h2>
            <p className="mt-1 text-sm text-slate-500">{[trip.brand, trip.model, trip.registration_number].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass[status] || 'bg-slate-100 text-slate-600'}`}>{status.replaceAll('_', ' ')}</span>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr_0.85fr]">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer</h3>
          <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900"><UserRound size={16} className="text-slate-400" />{trip.customer_name || 'Customer'}</p>
          {trip.customer_phone && <a href={`tel:${trip.customer_phone}`} className="mt-2 flex items-center gap-2 text-sm text-slate-600 hover:text-[#D95400]"><Phone size={15} />{trip.customer_phone}</a>}
          {trip.customer_email && <a href={`mailto:${trip.customer_email}`} className="mt-2 flex items-center gap-2 break-all text-sm text-slate-600 hover:text-[#D95400]"><Mail size={15} />{trip.customer_email}</a>}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pickup</p>
            <p className="mt-1 flex items-start gap-2 text-sm font-semibold text-slate-800"><MapPin size={16} className="mt-0.5 shrink-0 text-[#D95400]" />{trip.pickup_location || 'Pickup location not provided'}</p>
            <p className="ml-6 mt-1 text-xs text-slate-500">{dateTime(trip.pickup_date)}</p>
            {trip.pickup_location && <a href={directionsUrl(trip.pickup_location)} target="_blank" rel="noreferrer" className="ml-6 mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#B54700] hover:underline">Navigate to pickup <ArrowUpRight size={13} /></a>}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Drop-off</p>
            <p className="mt-1 flex items-start gap-2 text-sm font-semibold text-slate-800"><MapPin size={16} className="mt-0.5 shrink-0 text-emerald-600" />{trip.return_location || 'Drop-off location not provided'}</p>
            <p className="ml-6 mt-1 text-xs text-slate-500">{dateTime(trip.return_date)}</p>
            {trip.return_location && <a href={directionsUrl(trip.return_location)} target="_blank" rel="noreferrer" className="ml-6 mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#B54700] hover:underline">Navigate to drop-off <ArrowUpRight size={13} /></a>}
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-xl bg-slate-50 p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Estimated trip earnings</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{money(trip.estimated_earnings)}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Estimate from the vehicle's with-driver daily rate and booked days; not a payout record.</p>
          </div>
          {showActions && <div className="mt-4 flex flex-wrap gap-2">
            {status === 'PENDING' && <>
              <button disabled={saving} onClick={() => onStatusChange(trip, 'ACCEPTED')} className="inline-flex items-center gap-1 rounded-lg bg-[#FF6B00] px-3 py-2 text-sm font-bold text-white hover:bg-[#E85D00] disabled:opacity-50"><Check size={15} />Accept</button>
              <button disabled={saving} onClick={() => onStatusChange(trip, 'DECLINED')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><X size={15} />Decline</button>
            </>}
            {status === 'ACCEPTED' && <button disabled={saving} onClick={() => onStatusChange(trip, 'IN_PROGRESS')} className="rounded-lg bg-[#172033] px-3 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50">Start trip</button>}
            {status === 'IN_PROGRESS' && <button disabled={saving} onClick={() => onStatusChange(trip, 'COMPLETED')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Complete trip</button>}
          </div>}
        </section>
      </div>
    </article>
  );
}
