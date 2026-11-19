const bookings = [
  { id: 'SR-1042', vehicle: 'Mercedes GLE', status: 'Confirmed', total: '₹14,400' },
  { id: 'SR-0898', vehicle: 'Mahindra Bolero', status: 'In progress', total: '₹8,700' },
];

export default function MyBookings() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Reservations</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">My bookings</h1>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{booking.id}</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">{booking.vehicle}</h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{booking.status}</span>
              <span className="text-lg font-bold text-slate-900">{booking.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
