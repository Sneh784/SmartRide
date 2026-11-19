export default function Booking() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Booking</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Complete your reservation</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Trip summary</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <div className="flex justify-between"><span>Vehicle</span><span className="font-semibold text-slate-900">Mercedes GLE</span></div>
            <div className="flex justify-between"><span>Booking type</span><span className="font-semibold text-slate-900">With Driver</span></div>
            <div className="flex justify-between"><span>Duration</span><span className="font-semibold text-slate-900">3 days</span></div>
            <div className="flex justify-between"><span>Amount</span><span className="font-semibold text-slate-900">₹14,400</span></div>
          </div>
        </aside>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Pickup date</label>
              <input type="date" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Return date</label>
              <input type="date" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Pickup location</label>
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" defaultValue="Bengaluru Airport" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Return location</label>
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" defaultValue="Bengaluru Airport" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Booking type</label>
              <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <option>With Driver</option>
                <option>Without Driver</option>
              </select>
            </div>
          </div>

          <button className="mt-8 w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600">
            Continue to payment
          </button>
        </div>
      </div>
    </div>
  );
}
