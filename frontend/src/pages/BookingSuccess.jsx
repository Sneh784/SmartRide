import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BookingSuccess() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-emerald-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={44} />
        </div>
        <h1 className="mt-6 text-3xl font-black text-slate-900">Booking confirmed</h1>
        <p className="mt-3 text-slate-600">Your reservation has been successfully created and payment is verified.</p>

        <div className="mt-8 grid gap-4 rounded-3xl bg-slate-50 p-6 text-left sm:grid-cols-2">
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Booking ID</p><p className="mt-2 font-bold text-slate-900">SR-2026-1042</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Vehicle</p><p className="mt-2 font-bold text-slate-900">Mercedes GLE</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dates</p><p className="mt-2 font-bold text-slate-900">16 Nov - 18 Nov</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount</p><p className="mt-2 font-bold text-slate-900">₹14,400</p></div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white">Download receipt</button>
          <Link to="/my-bookings" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">View my bookings</Link>
        </div>
      </div>
    </div>
  );
}
