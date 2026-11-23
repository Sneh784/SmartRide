import { CarFront, MapPin, Search, SlidersHorizontal, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { vehicleApi } from '../api/vehicleApi';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

export default function BrowseVehicles() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('location') || '');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('featured');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    vehicleApi.list()
      .then(({ data }) => {
        if (active) setVehicles(Array.isArray(data) ? data : []);
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Could not load vehicles. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reload]);

  const categories = [...new Set(vehicles.map((vehicle) => vehicle.category).filter(Boolean))].sort();
  const visibleVehicles = vehicles
    .filter((vehicle) => `${vehicle.title || vehicle.name || ''} ${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.city || ''} ${vehicle.location || ''}`
      .toLowerCase().includes(query.trim().toLowerCase()))
    .filter((vehicle) => !category || vehicle.category === category)
    .sort((left, right) => {
      const leftRate = Number(left.dailyrate || left.dailyRate || left.priceperday || 0);
      const rightRate = Number(right.dailyrate || right.dailyRate || right.priceperday || 0);
      if (sort === 'price-low') return leftRate - rightRate;
      if (sort === 'price-high') return rightRate - leftRate;
      if (sort === 'rating') return Number(right.rating || 0) - Number(left.rating || 0);
      return 0;
    });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Vehicle marketplace</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Browse available vehicles</h1>
          <p className="mt-2 text-sm text-slate-600">Listings shown here have been approved and marked available by SmartRide.</p>
        </div>
        <Link to="/vendor/register" className="text-sm font-semibold text-brand-600 hover:underline">List your vehicle</Link>
      </div>

      <section className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
          <Search size={17} className="text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicle or city" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
          <SlidersHorizontal size={17} className="text-slate-400" />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full bg-transparent outline-none">
            <option value="">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort vehicles" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="featured">Recommended</option>
          <option value="price-low">Price: low to high</option>
          <option value="price-high">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </section>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading vehicles">
          {[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p>{error}</p>
          <button onClick={() => { setError(''); setLoading(true); setReload((value) => value + 1); }} className="mt-3 font-semibold underline">Try again</button>
        </div>
      ) : visibleVehicles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <CarFront className="mx-auto text-slate-400" size={32} />
          <h2 className="mt-3 font-bold text-slate-900">{query || category ? 'No matching vehicles' : 'No vehicles available yet'}</h2>
          <p className="mt-1 text-sm text-slate-600">{query || category ? 'Try another search or clear the category filter.' : 'Approved and available vendor listings will appear here.'}</p>
          {(query || category) && <button onClick={() => { setQuery(''); setCategory(''); }} className="mt-3 text-sm font-semibold text-brand-600 hover:underline">Clear filters</button>}
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{visibleVehicles.length} available {visibleVehicles.length === 1 ? 'vehicle' : 'vehicles'}</p>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleVehicles.map((vehicle) => {
              const title = vehicle.title || vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim();
              const rate = vehicle.dailyrate || vehicle.dailyRate || vehicle.priceperday;
              return (
                <article key={vehicle.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex h-48 items-center justify-center bg-gradient-to-br from-slate-100 via-orange-50 to-orange-100 text-brand-600">
                    <CarFront size={64} aria-hidden="true" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">{vehicle.category || 'Vehicle'}</p>
                        <h2 className="mt-2 text-xl font-bold text-slate-900">{title}</h2>
                      </div>
                      {Number(vehicle.rating) > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-sm font-bold text-amber-600"><Star size={14} fill="currentColor" />{Number(vehicle.rating).toFixed(1)}</span>}
                    </div>
                    <p className="mt-3 flex items-center gap-1 text-sm text-slate-600"><MapPin size={15} />{vehicle.city || vehicle.location || 'Location not listed'}</p>
                    <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs text-slate-500">Daily rate</p>
                        <p className="text-xl font-black text-slate-900">{formatCurrency(rate)}<span className="text-xs font-medium text-slate-500"> / day</span></p>
                      </div>
                      <Link to={`/vehicles/${vehicle.id}`} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">View details</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
