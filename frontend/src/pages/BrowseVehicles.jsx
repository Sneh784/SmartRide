import {
  CalendarDays, CarFront, ChevronDown, Fuel, Heart, MapPin, Search,
  Settings2, ShieldCheck, SlidersHorizontal, Star, Users, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { customerApi } from '../api/customerApi';
import { vehicleApi } from '../api/vehicleApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

const getRate = (vehicle) => Number(vehicle.dailyrate || vehicle.dailyRate || vehicle.priceperday || 0);
const getTitle = (vehicle) => vehicle.title || vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Vehicle';
const getPhoto = (url) => {
  if (!url) return '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  return new URL(url, apiBase).toString();
};

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="border-b border-slate-200 py-4 last:border-b-0">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
      className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-900">
      {title}<ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="mt-3 space-y-2.5">{children}</div>}
  </section>;
}

function Choice({ checked, onChange, children, type = 'checkbox' }) {
  return <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-600 hover:text-slate-900">
    <input type={type} checked={checked} onChange={onChange}
      className={`h-4 w-4 accent-[#FF6B00] ${type === 'radio' ? 'rounded-full' : 'rounded'}`} />
    <span>{children}</span>
  </label>;
}

export default function BrowseVehicles({ customerMode = false }) {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [catalog, setCatalog] = useState({ key: null, vehicles: [], error: '' });
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState(() => searchParams.get('location') || '');
  const [categoriesSelected, setCategoriesSelected] = useState([]);
  const [fuelSelected, setFuelSelected] = useState([]);
  const [transmissionSelected, setTransmissionSelected] = useState([]);
  const [rentalMode, setRentalMode] = useState('ANY');
  const [availability, setAvailability] = useState('ANY');
  const [location, setLocation] = useState(() => searchParams.get('location') || '');
  const [minSeats, setMinSeats] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('recommended');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedDates, setAppliedDates] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [saved, setSaved] = useState(new Set());
  const [wishlistError, setWishlistError] = useState('');

  const canUseWishlist = customerMode && isAuthenticated && user?.role === 'CUSTOMER';
  const requestKey = `${JSON.stringify(appliedDates || {})}:${reload}`;

  useEffect(() => {
    let active = true;
    const params = appliedDates || {};
    vehicleApi.list(params)
      .then(({ data }) => { if (active) setCatalog({ key: requestKey, vehicles: Array.isArray(data) ? data : [], error: '' }); })
      .catch((requestError) => {
        if (active) setCatalog({
          key: requestKey,
          vehicles: [],
          error: requestError?.response?.data?.message || 'Could not load vehicles. Please try again.',
        });
      });
    return () => { active = false; };
  }, [requestKey, appliedDates]);

  useEffect(() => {
    if (!canUseWishlist) return undefined;
    let active = true;
    customerApi.wishlist()
      .then(({ data }) => {
        if (active) {
          setSaved(new Set(data.map((item) => Number(item.id))));
          setWishlistError('');
        }
      })
      .catch((requestError) => {
        if (active) setWishlistError(requestError?.response?.data?.message || 'Saved vehicles could not be loaded.');
      });
    return () => { active = false; };
  }, [canUseWishlist]);

  const loading = catalog.key !== requestKey;
  const error = loading ? '' : catalog.error;
  const vehicles = catalog.vehicles;
  const categories = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.category).filter(Boolean))].sort(), [vehicles]);
  const fuels = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.fueltype || vehicle.fuelType).filter(Boolean))].sort(), [vehicles]);
  const transmissions = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.transmission).filter(Boolean))].sort(), [vehicles]);
  const maxDailyRate = Math.max(0, ...vehicles.map(getRate));
  const activeFilters = categoriesSelected.length + fuelSelected.length + transmissionSelected.length
    + (rentalMode !== 'ANY' ? 1 : 0) + (availability !== 'ANY' ? 1 : 0)
    + (location.trim() ? 1 : 0) + (minSeats ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  const visibleVehicles = useMemo(() => vehicles.filter((vehicle) => {
    const rate = getRate(vehicle);
    const fuel = vehicle.fueltype || vehicle.fuelType || '';
    const title = getTitle(vehicle);
    const place = `${vehicle.city || ''} ${vehicle.location || ''}`;
    const hasDriver = Boolean(vehicle.withdriveravailable ?? vehicle.withDriverAvailable)
      || Number(vehicle.withdriverrate || vehicle.withDriverRate || 0) > 0;
    const selfDrive = vehicle.withoutdriveravailable ?? vehicle.withoutDriverAvailable;
    const seats = Number(vehicle.seatingcapacity || vehicle.seatingCapacity || 0);
    const availableNow = vehicle.isavailablenow ?? vehicle.isAvailableNow;
    const matchesSeats = !minSeats
      || (minSeats === '1-2' && seats > 0 && seats <= 2)
      || (minSeats === '3-5' && seats >= 3 && seats <= 5)
      || (minSeats === '6-8' && seats >= 6 && seats <= 8)
      || (minSeats === '9+' && seats >= 9);
    return (!search.trim() || `${title} ${vehicle.brand || ''} ${vehicle.model || ''} ${place}`.toLowerCase().includes(search.trim().toLowerCase()))
      && (!categoriesSelected.length || categoriesSelected.includes(vehicle.category))
      && (!fuelSelected.length || fuelSelected.includes(fuel))
      && (!transmissionSelected.length || transmissionSelected.includes(vehicle.transmission))
      && (rentalMode === 'ANY' || (rentalMode === 'WITH_DRIVER' ? hasDriver : selfDrive !== false))
      && (!location.trim() || place.toLowerCase().includes(location.trim().toLowerCase()))
      && matchesSeats
      && (!minPrice || rate >= Number(minPrice))
      && (!maxPrice || rate <= Number(maxPrice))
      && (availability !== 'NOW' || availableNow);
  }).sort((left, right) => {
    if (sort === 'price-low') return getRate(left) - getRate(right);
    if (sort === 'price-high') return getRate(right) - getRate(left);
    if (sort === 'rating') return Number(right.rating || 0) - Number(left.rating || 0);
    return Number(right.rating || 0) - Number(left.rating || 0);
  }), [vehicles, search, categoriesSelected, fuelSelected, transmissionSelected, rentalMode, availability, location, minSeats, minPrice, maxPrice, sort]);

  const toggle = (setter, selected, value) => setter(selected.includes(value)
    ? selected.filter((item) => item !== value) : [...selected, value]);
  const clearFilters = () => {
    setSearch('');
    setCategoriesSelected([]);
    setFuelSelected([]);
    setTransmissionSelected([]);
    setRentalMode('ANY');
    setAvailability('ANY');
    setLocation('');
    setMinSeats('');
    setMinPrice('');
    setMaxPrice('');
    setSort('recommended');
    setFromDate('');
    setToDate('');
    setAppliedDates(null);
  };
  const applyDateRange = () => {
    if (!fromDate || !toDate || toDate < fromDate) {
      toast.error('Choose a valid pickup and return date to check availability.');
      return;
    }
    const nextDay = new Date(`${toDate}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const until = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}T00:00:00`;
    setAvailability('DATES');
    setAppliedDates({ from: `${fromDate}T00:00:00`, to: until });
  };
  const chooseAvailability = (value) => {
    setAvailability(value);
    if (value !== 'DATES') setAppliedDates(null);
  };
  const toggleWishlist = async (vehicleId) => {
    if (!canUseWishlist) {
      toast.info('Sign in as a customer to save vehicles.');
      return;
    }
    try {
      if (saved.has(Number(vehicleId))) {
        await customerApi.removeWishlist(vehicleId);
        setSaved((current) => new Set([...current].filter((id) => id !== Number(vehicleId))));
        toast.info('Vehicle removed from your wishlist.');
      } else {
        await customerApi.addWishlist(vehicleId);
        setSaved((current) => new Set([...current, Number(vehicleId)]));
        toast.success('Vehicle saved to your wishlist.');
      }
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || 'Could not update your wishlist.');
    }
  };

  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100';
  const cards = visibleVehicles.map((vehicle) => {
    const rate = getRate(vehicle);
    const image = getPhoto(vehicle.imageurl || vehicle.imageUrl);
    const detailsUrl = customerMode ? `/customer/vehicles/${vehicle.id}` : `/vehicles/${vehicle.id}`;
    const isSaved = saved.has(Number(vehicle.id));
    const availableNow = vehicle.isavailablenow ?? vehicle.isAvailableNow;
    const canBook = String(vehicle.availabilitystatus || vehicle.availabilityStatus || '').toUpperCase() === 'AVAILABLE'
      && String(vehicle.operationalstatus || vehicle.operationalStatus || 'AVAILABLE').toUpperCase() !== 'INACTIVE';
    return <article key={vehicle.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative h-48 overflow-hidden bg-slate-100 sm:h-52">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-orange-50 text-slate-400"><CarFront size={72} strokeWidth={1.2} /></div>
        {image && <img src={image} alt={getTitle(vehicle)} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold shadow-sm ${availableNow || appliedDates ? 'text-emerald-700' : 'text-amber-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${availableNow || appliedDates ? 'bg-emerald-500' : 'bg-amber-500'}`} />{appliedDates ? 'Available for dates' : availableNow ? 'Available now' : 'Currently unavailable'}</span>
        {canUseWishlist && <button type="button" onClick={() => toggleWishlist(vehicle.id)} aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute right-3 top-3 rounded-full bg-white/95 p-2 shadow-sm transition hover:scale-105 ${isSaved ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'}`}>
          <Heart size={17} fill={isSaved ? 'currentColor' : 'none'} />
        </button>}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[#C64D00]">{vehicle.category || 'Vehicle'}{vehicle.subcategory ? ` · ${vehicle.subcategory}` : ''}</p>
          {Number(vehicle.rating) > 0 && <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-600"><Star size={13} fill="currentColor" />{Number(vehicle.rating).toFixed(1)}</span>}
        </div>
        <h2 className="mt-1 truncate text-base font-extrabold text-slate-900">{getTitle(vehicle)}</h2>
        <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-slate-500"><MapPin size={13} />{[vehicle.city, vehicle.location].filter(Boolean).join(', ') || 'Location not listed'}</p>
        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-slate-500">
          {(vehicle.fueltype || vehicle.fuelType) && <span className="flex items-center gap-1.5"><Fuel size={13} />{vehicle.fueltype || vehicle.fuelType}</span>}
          {vehicle.transmission && <span className="flex items-center gap-1.5"><Settings2 size={13} />{vehicle.transmission}</span>}
          {(vehicle.seatingcapacity || vehicle.seatingCapacity) && <span className="flex items-center gap-1.5"><Users size={13} />{vehicle.seatingcapacity || vehicle.seatingCapacity} seats</span>}
          {vehicle.modelyear && <span>{vehicle.modelyear} model</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(vehicle.withoutdriveravailable ?? vehicle.withoutDriverAvailable) !== false && <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">Self-drive</span>}
          {(vehicle.withdriveravailable ?? vehicle.withDriverAvailable) && <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">With driver</span>}
        </div>
        <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
          <div><p className="text-[10px] text-slate-500">Starting from</p><p className="text-lg font-black text-slate-900">{formatCurrency(rate)}<span className="text-[10px] font-medium text-slate-500"> / day</span></p></div>
          <span className="text-[10px] text-slate-500"><ShieldCheck size={13} className="mr-1 inline text-emerald-600" />Verified</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to={detailsUrl} className="inline-flex items-center justify-center rounded-lg border border-[#FF6B00] px-2 py-2 text-xs font-bold text-[#B54700] transition hover:bg-orange-50">View details ↗</Link>
          {canBook
            ? <Link to={`/booking?vehicleId=${vehicle.id}`} className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#FF6B00] px-2 py-2 text-xs font-bold text-white transition hover:bg-[#E85D00]">Book now <CalendarDays size={13} /></Link>
            : <span className="inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-slate-200 px-2 py-2 text-xs font-bold text-slate-500">Unavailable</span>}
        </div>
      </div>
    </article>;
  });

  const filterPanel = <div className="rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-200 py-4">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><SlidersHorizontal size={16} className="text-[#E85D00]" />Filter vehicles</h2>
      <button type="button" onClick={clearFilters} className="text-xs font-semibold text-[#B54700] hover:underline">Clear all</button>
    </div>
    <FilterSection title="Rental mode">
      {[['ANY', 'Any'], ['SELF_DRIVE', 'Self-drive'], ['WITH_DRIVER', 'With driver']].map(([value, label]) => <Choice key={value} type="radio" checked={rentalMode === value} onChange={() => setRentalMode(value)}>{label}</Choice>)}
    </FilterSection>
    <FilterSection title="Vehicle category">
      {categories.map((item) => <Choice key={item} checked={categoriesSelected.includes(item)} onChange={() => toggle(setCategoriesSelected, categoriesSelected, item)}>{item}</Choice>)}
      {!categories.length && <p className="text-xs text-slate-400">Categories appear when listings are available.</p>}
    </FilterSection>
    <FilterSection title="Price range (₹)">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] text-slate-500">Minimum<input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="0" className={`${inputClass} mt-1`} /></label>
        <label className="text-[10px] text-slate-500">Maximum<input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder={String(maxDailyRate)} className={`${inputClass} mt-1`} /></label>
      </div>
      {maxDailyRate > 0 && <input aria-label="Maximum daily price" type="range" min="0" max={maxDailyRate} step="100" value={Math.min(Number(maxPrice) || maxDailyRate, maxDailyRate)} onChange={(event) => setMaxPrice(event.target.value)} className="w-full accent-[#FF6B00]" />}
      <p className="text-[10px] text-slate-500">{formatCurrency(Number(minPrice) || 0)} – {formatCurrency(Number(maxPrice) || maxDailyRate)} per day</p>
    </FilterSection>
    <FilterSection title="Fuel type">
      {fuels.map((item) => <Choice key={item} checked={fuelSelected.includes(item)} onChange={() => toggle(setFuelSelected, fuelSelected, item)}>{item}</Choice>)}
    </FilterSection>
    <FilterSection title="Transmission">
      {transmissions.map((item) => <Choice key={item} checked={transmissionSelected.includes(item)} onChange={() => toggle(setTransmissionSelected, transmissionSelected, item)}>{item}</Choice>)}
    </FilterSection>
    <FilterSection title="Vehicle availability">
      {[['ANY', 'Any availability'], ['NOW', 'Available now'], ['DATES', 'Available for selected dates']].map(([value, label]) => <Choice key={value} type="radio" checked={availability === value} onChange={() => chooseAvailability(value)}>{label}</Choice>)}
      {availability === 'DATES' && <div className="space-y-2 pt-1">
        <label className="block text-[10px] font-semibold text-slate-500">Pickup date<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={`${inputClass} mt-1`} /></label>
        <label className="block text-[10px] font-semibold text-slate-500">Return date<input type="date" min={fromDate} value={toDate} onChange={(event) => setToDate(event.target.value)} className={`${inputClass} mt-1`} /></label>
        <button type="button" onClick={applyDateRange} className="w-full rounded-lg bg-[#FF6B00] px-3 py-2 text-xs font-bold text-white hover:bg-[#E85D00]">Check dates</button>
      </div>}
    </FilterSection>
    <FilterSection title="Location">
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2"><MapPin size={14} className="shrink-0 text-slate-400" /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or location" className="w-full text-xs outline-none" /></label>
    </FilterSection>
    <FilterSection title="Seating capacity" defaultOpen={false}>
      {[['1-2', '1–2 seats'], ['3-5', '3–5 seats'], ['6-8', '6–8 seats'], ['9+', '9+ seats']].map(([value, label]) => <Choice key={value} type="radio" checked={minSeats === value} onChange={() => setMinSeats(minSeats === value ? '' : value)}>{label}</Choice>)}
    </FilterSection>
  </div>;

  return <main className="min-h-screen bg-[#F4F6F9]">
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold text-slate-500"><Link to="/" className="hover:text-[#B54700]">Home</Link><span className="mx-2">›</span>Explore vehicles</p>
          <h1 className="mt-3 text-2xl font-black text-[#172033] sm:text-3xl">Explore Vehicles</h1>
          <p className="mt-1 text-sm text-slate-500">Find the perfect vehicle for your next journey.</p></div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500"><ShieldCheck size={15} className="text-emerald-600" />Verified vehicles</span>
      </div>
      <div className="mb-4 flex gap-2">
        <label className="flex min-h-11 flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm focus-within:border-[#FF6B00]">
          <Search size={17} className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicles by name, brand, or model" className="w-full bg-transparent text-sm outline-none" />
          {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="text-slate-400"><X size={15} /></button>}
        </label>
        <button type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm lg:hidden"><SlidersHorizontal size={16} />Filters{activeFilters > 0 && <span className="rounded-full bg-orange-100 px-1.5 text-xs text-[#B54700]">{activeFilters}</span>}</button>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="vehicle-filter-scrollbar sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-scroll pr-1 lg:block">{filterPanel}</aside>
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600"><strong className="font-bold text-slate-900">{loading ? '…' : visibleVehicles.length}</strong> vehicles available</p>
            <label className="flex items-center gap-2 text-xs text-slate-500">Sort by
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort vehicles" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#FF6B00]">
                <option value="recommended">Recommended</option><option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option><option value="rating">Top rated</option>
              </select>
            </label>
          </div>
          {wishlistError && <p role="status" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{wishlistError}</p>}
          {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[390px] animate-pulse rounded-xl bg-slate-200" />)}</div>
            : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}<button onClick={() => setReload((value) => value + 1)} className="ml-2 font-semibold underline">Try again</button></div>
              : visibleVehicles.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards}</div>
                : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><CarFront size={34} className="mx-auto text-slate-400" /><h2 className="mt-3 font-bold text-slate-900">No matching vehicles</h2><p className="mt-1 text-sm text-slate-500">Try changing your search or clearing one or more filters.</p><button onClick={clearFilters} className="mt-4 rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-bold text-white">Clear all filters</button></div>}
        </section>
      </div>
    </div>
    {mobileFiltersOpen && <div className="fixed inset-0 z-[70] bg-slate-950/40 lg:hidden" onClick={() => setMobileFiltersOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Vehicle filters" onClick={(event) => event.stopPropagation()} className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-[#F4F6F9] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3"><h2 className="font-bold">Filter vehicles</h2><button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
        <div className="vehicle-filter-scrollbar flex-1 overflow-y-auto p-4">{filterPanel}</div>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-white p-4"><button onClick={clearFilters} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold">Clear all</button><button onClick={() => setMobileFiltersOpen(false)} className="rounded-lg bg-[#FF6B00] px-3 py-2.5 text-sm font-bold text-white">Show {visibleVehicles.length} vehicles</button></div>
      </div>
    </div>}
  </main>;
}
