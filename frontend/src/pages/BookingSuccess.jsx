import { CheckCircle2 } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';

function currency(value) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

export default function BookingSuccess() {
  const { state } = useLocation();
  const booking = state?.booking;
  if (!booking?.id) return <Navigate to="/customer/bookings" replace />;

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={36} /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Request sent</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Your trip is taking shape</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">The vendor has received your booking request. You can pay securely after the vendor confirms availability.</p>
        <div className="mx-auto mt-7 grid max-w-xl gap-4 rounded-2xl bg-slate-50 p-5 text-left sm:grid-cols-2">
          <div><p className="text-xs uppercase tracking-wider text-slate-500">Booking ID</p><p className="mt-1 font-bold text-slate-900">#{booking.id}</p></div>
          <div><p className="text-xs uppercase tracking-wider text-slate-500">Vehicle</p><p className="mt-1 font-bold text-slate-900">{booking.vehicleName}</p></div>
          <div><p className="text-xs uppercase tracking-wider text-slate-500">Estimated total</p><p className="mt-1 font-bold text-slate-900">{currency(booking.amount)}</p></div>
          <div><p className="text-xs uppercase tracking-wider text-slate-500">Status</p><p className="mt-1 font-bold text-amber-700">{booking.status || 'PENDING VENDOR CONFIRMATION'}</p></div>
        </div>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/customer/bookings" className="rounded-xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white hover:bg-[#E85D00]">Track booking</Link>
          <Link to="/customer/dashboard" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
