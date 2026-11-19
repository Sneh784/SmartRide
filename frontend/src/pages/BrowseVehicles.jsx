import { Filter, Search, SlidersHorizontal } from 'lucide-react';

const vehicles = [
  { name: 'Mercedes GLE', price: '₹4,800/day', city: 'Bengaluru', type: 'Car', rating: 4.9 },
  { name: 'Mahindra Bolero', price: '₹2,900/day', city: 'Hyderabad', type: 'SUV', rating: 4.7 },
  { name: 'Force Traveller', price: '₹5,400/day', city: 'Mumbai', type: 'Passenger', rating: 4.8 },
  { name: 'Royal Enfield', price: '₹1,700/day', city: 'Pune', type: 'Two-Wheeler', rating: 4.6 },
];

export default function BrowseVehicles() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Vehicle marketplace</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Browse vehicles</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input placeholder="Search by brand or model" className="w-56 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Filters</h2>
            <Filter size={18} className="text-slate-500" />
          </div>

          <div className="mt-6 space-y-6 text-sm">
            <div>
              <p className="mb-2 font-semibold text-slate-700">Category</p>
              <div className="space-y-2 text-slate-600">
                {['Cars', 'Two-Wheelers', 'Commercial Vehicles', 'Passenger Vehicles'].map((item) => (
                  <label key={item} className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked={item === 'Cars'} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold text-slate-700">Booking Type</p>
              <div className="space-y-2 text-slate-600">
                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> With Driver</label>
                <label className="flex items-center gap-2"><input type="checkbox" /> Without Driver</label>
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold text-slate-700">Price Range</p>
              <input type="range" className="w-full" />
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600">
              Apply Filters
            </button>
            <button className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              Clear All
            </button>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-600">Showing 4 vehicles</p>
            <select className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <option>Featured</option>
              <option>Lowest Price</option>
              <option>Rating</option>
            </select>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {vehicles.map((vehicle) => (
              <article key={vehicle.name} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:shadow-lg">
                <div className="h-52 bg-gradient-to-br from-slate-100 via-slate-200 to-brand-50" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">{vehicle.type}</p>
                      <h3 className="mt-2 text-2xl font-bold text-slate-900">{vehicle.name}</h3>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">★ {vehicle.rating}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{vehicle.city} • Available today</p>
                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">From</p>
                      <p className="text-2xl font-black text-slate-900">{vehicle.price}</p>
                    </div>
                    <a href="/vehicles/1" className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">View details</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
