import { Check, Gauge, MapPin, ShieldCheck, Users } from 'lucide-react';

export default function VehicleDetails() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="h-[420px] rounded-[32px] bg-gradient-to-br from-slate-200 via-slate-100 to-brand-100" />
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-28 rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Premium SUV</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Mercedes GLE</h1>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={16} />
            Bengaluru • Available now
          </div>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Starting from</p>
              <p className="text-3xl font-black text-slate-900">₹4,800</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">4.9 rating</span>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-700">
            <div className="flex items-center gap-3"><Users size={18} className="text-brand-600" /> 5 seats</div>
            <div className="flex items-center gap-3"><Gauge size={18} className="text-brand-600" /> Automatic transmission</div>
            <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-brand-600" /> Insurance included</div>
          </div>

          <button className="mt-8 w-full rounded-2xl bg-brand-500 px-4 py-3 font-semibold text-white hover:bg-brand-600">
            Book now
          </button>
          <button className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700">
            Check availability
          </button>
        </aside>
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">About this vehicle</h2>
          <p className="mt-4 text-slate-600">
            A premium SUV designed for comfort, long-distance rides, and executive travel. It includes premium interiors, panoramic sunroof, dual-zone climate control, and a safety-first setup.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {['Leather upholstery', 'Bluetooth + Android Auto', 'Automatic parking', 'Remote assistance'].map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                <Check className="text-brand-600" size={16} />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Vendor</h2>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-lg font-semibold text-slate-900">BlueStar Rentals</p>
            <p className="mt-1 text-sm text-slate-600">Verified vendor • 5 years in service</p>
          </div>
        </div>
      </section>
    </div>
  );
}
