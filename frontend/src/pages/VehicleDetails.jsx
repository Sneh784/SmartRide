import { CarFront, Check, Gauge, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { vehicleApi } from '../api/vehicleApi';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

export default function VehicleDetails() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  const [error, setError] = useState('');
  const loading = loadedId !== id;

  useEffect(() => {
    let active = true;
    vehicleApi.getById(id)
      .then(({ data }) => {
        if (active) {
          setVehicle(data);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError?.response?.data?.message || 'Vehicle details could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoadedId(id);
      });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8" aria-label="Loading vehicle details">
      <div className="h-96 rounded-[32px] bg-slate-200" />
    </div>;
  }

  if (error || !vehicle) {
    return <div role="alert" className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Vehicle unavailable</h1>
      <p className="mt-2 text-slate-600">{error || 'This vehicle may have been removed or is no longer available.'}</p>
      <Link to="/vehicles" className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Browse available vehicles</Link>
    </div>;
  }

  const title = vehicle.title || vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim();
  const rate = vehicle.dailyrate || vehicle.dailyRate || vehicle.priceperday;
  const features = String(vehicle.features || '').split(/[,;\n]/).map((feature) => feature.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex min-h-[360px] items-center justify-center rounded-[32px] bg-gradient-to-br from-slate-100 via-orange-50 to-orange-100 text-brand-600">
          <CarFront className="h-32 w-32 opacity-70" aria-hidden="true" />
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">{vehicle.category || 'Vehicle'}</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">{title}</h1>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={16} />
            {[vehicle.city, vehicle.location].filter(Boolean).join(' • ') || 'Location not listed'}
          </div>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Daily rate</p>
              <p className="text-3xl font-black text-slate-900">{formatCurrency(rate)}</p>
            </div>
            {Number(vehicle.rating) > 0 && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{Number(vehicle.rating).toFixed(1)} rating</span>}
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-700">
            {vehicle.seatingcapacity && <div className="flex items-center gap-3"><Users size={18} className="text-brand-600" />{vehicle.seatingcapacity} seats</div>}
            {(vehicle.transmission || vehicle.fueltype) && <div className="flex items-center gap-3"><Gauge size={18} className="text-brand-600" />{[vehicle.transmission, vehicle.fueltype].filter(Boolean).join(' • ')}</div>}
            <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-brand-600" />Approved and available</div>
          </div>

          <Link to={`/booking?vehicleId=${vehicle.id}`} className="mt-8 block w-full rounded-2xl bg-brand-500 px-4 py-3 text-center font-semibold text-white hover:bg-brand-600">
            Book now
          </Link>
          <Link to="/vehicles" className="mt-3 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-center font-semibold text-slate-700">
            Back to vehicles
          </Link>
        </aside>
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">About this vehicle</h2>
          <p className="mt-4 whitespace-pre-line text-slate-600">{vehicle.description || 'No description was provided by the vendor.'}</p>
          {features.length > 0 && <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => <div key={feature} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700"><Check className="text-brand-600" size={16} />{feature}</div>)}
          </div>}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Listing information</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ['Brand', vehicle.brand],
              ['Model', vehicle.model],
              ['Year', vehicle.modelyear],
              ['Category', vehicle.category],
              ['Pickup location', [vehicle.city, vehicle.location].filter(Boolean).join(', ')],
            ].filter(([, value]) => value).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
