import {CalendarRange, CarFront, CreditCard, MapPin, Search,ShieldCheck,Star,Users,} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { vehicleApi } from '../api/vehicleApi';

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Verified everything',
    text: 'Every vendor, vehicle and driver passes document checks before listing.',
  },
  {
    icon: Users,
    title: 'Self-drive or chauffeur',
    text: 'Choose your mode per booking. Professional drivers rated by real customers.',
  },
  {
    icon: CreditCard,
    title: 'Transparent deposits',
    text: 'Refundable security deposits with clear deduction reports and fast refunds.',
  },
  {
    icon: MapPin,
    title: 'Live tracking',
    text: 'Follow pickups, trips and returns in real time.',
  },
  {
    icon: CalendarRange,
    title: 'Flexible payments',
    text: 'UPI, cards, net banking and wallets — all secured.',
  },
  {
    icon: Users,
    title: '24/7 support',
    text: 'Roadside help and booking support whenever you need it.',
  },
];

const reviews = [
  {
    quote: 'Booked a Civic for a weekend in Lonavala. KYC took 5 minutes and the deposit was back in two days.',
    author: 'Neha K.',
  },
  {
    quote: 'The chauffeur was on time and the XC90 spotless. Live tracking gave my parents peace of mind.',
    author: 'Kabir S.',
  },
  {
    quote: 'Clear pricing, no surprises at return. SmartRide is my go-to now.',
    author: 'Ananya R.',
  },
];

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextDateInputValue(value) {
  const [year, month, day] = value.split('-').map(Number);
  return dateInputValue(new Date(year, month - 1, day + 1));
}

export default function Home() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [pickupLocation, setPickupLocation] = useState('Pune');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [rentalMode, setRentalMode] = useState('Self-drive');
  const [minimumDate] = useState(() => dateInputValue(new Date()));
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState('');
  const [vehiclesReload, setVehiclesReload] = useState(0);
  const categories = [...new Set(featuredVehicles.map((vehicle) => vehicle.category).filter(Boolean))]
    .map((name) => ({
      name,
      count: featuredVehicles.filter((vehicle) => vehicle.category === name).length,
      icon: CarFront,
    }));

  const searchVehicles = (event) => {
    event.preventDefault();
    const searchParams = new URLSearchParams({
      location: pickupLocation.trim(),
      pickupDate,
      returnDate,
      mode: rentalMode,
    });
    navigate(`/vehicles?${searchParams.toString()}`);
  };

  useEffect(() => {
    if (!hash) return undefined;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hash]);

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = (event) => setPrefersReducedMotion(event.matches);

    motionPreference.addEventListener('change', updateMotionPreference);
    return () => motionPreference.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    let active = true;
    vehicleApi.list()
      .then(({ data }) => {
        if (active) setFeaturedVehicles(Array.isArray(data) ? data : []);
      })
      .catch((requestError) => {
        if (active) {
          setVehiclesError(requestError?.response?.data?.message || 'Could not load available vehicles.');
        }
      })
      .finally(() => {
        if (active) setVehiclesLoading(false);
      });
    return () => { active = false; };
  }, [vehiclesReload]);

  return (
    <div className="bg-[#f3f5f8] text-slate-900">
      <section className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(ellipse_at_79%_28%,rgba(255,112,52,0.18),transparent_34%),linear-gradient(120deg,#0c1726_0%,#14253a_62%,#1a2e42_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
          <div className="relative z-10 px-5 pb-10 pt-8 sm:px-10 lg:px-12 lg:pb-12 lg:pt-10">
            <div className="grid gap-6 min-[801px]:min-h-[320px] min-[801px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] min-[801px]:items-center">
              <div className="max-w-[640px] text-white">
                <span className="inline-flex rounded-full border border-orange-300/60 bg-[#ff6b00]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-sm">
                  Verified vendors • Secure deposits
                </span>

                <h1 className="mt-7 text-5xl font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-6xl lg:text-[68px]">
                  Your next great drive starts here.
                </h1>

                <p className="mt-5 max-w-[580px] text-base text-slate-200 sm:text-lg">
                  Find your ride, choose your route, and make the journey yours. Self-drive or go with a professional chauffeur.
                </p>
              </div>

              <div className="relative aspect-[1.62] min-h-[240px] overflow-hidden rounded-[22px] border border-white/10 shadow-inner" aria-hidden="true">
                <svg className="block h-full w-full" viewBox="0 0 720 440" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="home-sky" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#c8e0e5" />
                      <stop offset="100%" stopColor="#edf1e8" />
                    </linearGradient>
                    <linearGradient id="home-road" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#06425a" />
                      <stop offset="100%" stopColor="#03354d" />
                    </linearGradient>
                  </defs>
                  <rect width="720" height="440" fill="url(#home-sky)" />
                  <g fill="#fff" opacity=".95">
                    <ellipse cx="92" cy="104" rx="26" ry="12" />
                    <ellipse cx="117" cy="99" rx="29" ry="17" />
                    <ellipse cx="143" cy="105" rx="30" ry="13" />
                    <ellipse cx="224" cy="130" rx="20" ry="9" />
                    <ellipse cx="245" cy="125" rx="24" ry="13" />
                    <ellipse cx="267" cy="131" rx="25" ry="10" />
                    <ellipse cx="564" cy="105" rx="26" ry="12" />
                    <ellipse cx="590" cy="98" rx="31" ry="18" />
                    <ellipse cx="620" cy="106" rx="31" ry="13" />
                  </g>
                  <path d="M0 286c110-48 228-46 330-12 90 30 190-30 290-4 40 10 72 27 100 22v148H0Z" fill="#7fa5b7" />
                  <path d="M0 180c50 40 125 120 220 110 95-10 130-95 220-115 80-17 135 3 180 55 35 44 60 70 100 86v124H0Z" fill="url(#home-road)" />
                  <path d="M0 180c50 40 125 120 220 110 95-10 130-95 220-115 80-17 135 3 180 55 35 44 60 70 100 86" fill="none" stroke="#dbe9e5" strokeWidth="4" opacity=".82" />

                  <g fill="#06425a">
                    <path d="M430 70h70l16 16-16 16h-70Z" />
                    <path d="M459 96h9v83h-9Z" />
                  </g>

                  <g>
                    {!prefersReducedMotion && (
                      <animateMotion
                        path="M 0 180 C 50 220 125 300 220 290 C 315 280 350 195 440 175 C 520 158 575 178 620 230 C 655 274 680 300 720 316"
                        dur="14s"
                        rotate="auto"
                        repeatCount="indefinite"
                      />
                    )}
                    <g transform={prefersReducedMotion ? 'translate(400 184) translate(84 -66) scale(-1 1)' : 'translate(84 -66) scale(-1 1)'}>
                      <path d="M105-25q12 10 13 22m-5-38q12 10 13 22m-5-38q12 10 13 22" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9" />
                      <ellipse cx="80" cy="66" rx="73" ry="5" fill="#062c3a" opacity=".25" />
                      <path d="M8 49v-7q1-8 12-11l21-5 16-18q5-6 14-6h32q9 0 14 8l13 19 13 5q7 3 7 10v12H8Z" fill="#ed1239" />
                      <path d="m45 27 14-16q3-4 9-4h13v20Z" fill="#07516a" />
                      <path d="M86 7h17q7 0 11 7l8 13H86Z" fill="#07516a" />
                      <path d="M83 8v20m4 0v18" stroke="#083a50" strokeWidth="3" />
                      <path d="M13 44h13m121 0h8" stroke="#ffd9c6" strokeWidth="4" strokeLinecap="round" />
                      <g>
                        {!prefersReducedMotion && (
                          <animateTransform attributeName="transform" type="rotate" from="0 38 54" to="-360 38 54" dur="800ms" repeatCount="indefinite" />
                        )}
                        <circle cx="38" cy="54" r="12" fill="#092f42" />
                        <circle cx="38" cy="54" r="6" fill="#357086" />
                        <path d="M38 48v12m-6-6h12" stroke="#7899a3" strokeWidth="2" />
                      </g>
                      <g>
                        {!prefersReducedMotion && (
                          <animateTransform attributeName="transform" type="rotate" from="0 130 54" to="-360 130 54" dur="800ms" repeatCount="indefinite" />
                        )}
                        <circle cx="130" cy="54" r="12" fill="#092f42" />
                        <circle cx="130" cy="54" r="6" fill="#357086" />
                        <path d="M130 48v12m-6-6h12" stroke="#7899a3" strokeWidth="2" />
                      </g>
                    </g>
                  </g>
                </svg>
              </div>
            </div>

            <form onSubmit={searchVehicles} className="mt-8 grid gap-3 rounded-[24px] border border-slate-200/60 bg-white/95 p-4 text-slate-900 shadow-xl backdrop-blur-sm md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:mt-10">
              <div className="flex items-center justify-between gap-3 md:col-span-full">
                <div>
                  <p className="text-lg font-extrabold tracking-tight text-slate-900">Plan your next drive</p>
                  <p className="mt-0.5 text-sm text-slate-500">Choose your pickup city and travel dates.</p>
                </div>
                <span className="hidden rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-[#d95400] sm:inline-flex">
                  Your ride, your way
                </span>
              </div>

              <label htmlFor="home-pickup-location" className="flex min-w-0 cursor-text items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-[#ff6b00]/60 focus-within:ring-4 focus-within:ring-orange-500/10">
                <MapPin className="h-4 w-4 text-[#ff6b00]" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pickup location</span>
                  <input
                    id="home-pickup-location"
                    name="location"
                    type="text"
                    maxLength={100}
                    required
                    className="mt-1 w-full bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    value={pickupLocation}
                    onChange={(event) => setPickupLocation(event.target.value)}
                  />
                </div>
              </label>

              <label htmlFor="home-pickup-date" className="flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-[#ff6b00]/60 focus-within:ring-4 focus-within:ring-orange-500/10">
                <CalendarRange className="h-4 w-4 text-[#ff6b00]" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Start date</span>
                  <input
                    id="home-pickup-date"
                    name="pickupDate"
                    type="date"
                    min={minimumDate}
                    required
                    className="mt-1 w-full min-w-0 cursor-pointer bg-transparent text-sm font-medium text-slate-900 outline-none scheme-light accent-[#ff6b00]"
                    value={pickupDate}
                    onChange={(event) => {
                      const nextPickupDate = event.target.value;
                      setPickupDate(nextPickupDate);
                      if (returnDate && returnDate < nextDateInputValue(nextPickupDate)) setReturnDate('');
                    }}
                  />
                </div>
              </label>

              <label htmlFor="home-return-date" className="flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-[#ff6b00]/60 focus-within:ring-4 focus-within:ring-orange-500/10">
                <CalendarRange className="h-4 w-4 text-[#ff6b00]" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">End date</span>
                  <input
                    id="home-return-date"
                    name="returnDate"
                    type="date"
                    min={pickupDate ? nextDateInputValue(pickupDate) : minimumDate}
                    required
                    className="mt-1 w-full min-w-0 cursor-pointer bg-transparent text-sm font-medium text-slate-900 outline-none scheme-light accent-[#ff6b00]"
                    value={returnDate}
                    onChange={(event) => setReturnDate(event.target.value)}
                  />
                </div>
              </label>

              <label htmlFor="home-rental-mode" className="flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-[#ff6b00]/60 focus-within:ring-4 focus-within:ring-orange-500/10">
                <CarFront className="h-4 w-4 text-[#ff6b00]" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Rental mode</span>
                  <select
                    id="home-rental-mode"
                    name="mode"
                    value={rentalMode}
                    onChange={(event) => setRentalMode(event.target.value)}
                    className="mt-1 w-full cursor-pointer bg-transparent text-base font-medium text-slate-900 outline-none"
                  >
                    <option>Self-drive</option>
                    <option>With driver</option>
                  </select>
                </div>
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff6b00] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-[#e85d00] hover:shadow-xl"
              >
                <Search className="h-4 w-4" />
                Find rides
              </button>
            </form>
          </div>
        </div>
      </section>

      <section id="popular-vehicles" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-900">Popular vehicles</h2>
            <p className="mt-2 text-lg text-slate-600">Top-rated rentals near you this week.</p>
          </div>
          <Link to="/vehicles" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            View all
          </Link>
        </div>

        {vehiclesError ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p>{vehiclesError}</p>
            <button onClick={() => { setVehiclesError(''); setVehiclesLoading(true); setVehiclesReload((value) => value + 1); }} className="mt-3 font-semibold underline">Try again</button>
          </div>
        ) : vehiclesLoading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-3" aria-label="Loading available vehicles">
            {[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-[22px] bg-slate-200" />)}
          </div>
        ) : featuredVehicles.length ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {featuredVehicles.slice(0, 3).map((vehicle) => {
              const title = vehicle.title || vehicle.name || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim();
              const rate = Number(vehicle.dailyrate || vehicle.dailyRate || vehicle.priceperday || 0);
              const specs = [
                vehicle.seatingcapacity ? `${vehicle.seatingcapacity} seats` : '',
                vehicle.fueltype,
                vehicle.transmission,
                vehicle.city || vehicle.location,
              ].filter(Boolean);
              return (
                <article key={vehicle.id} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl motion-reduce:transition-none">
                  <div className="flex h-56 items-center justify-center bg-gradient-to-br from-slate-100 via-orange-50 to-orange-100 text-[#E85D00]">
                    <CarFront className="h-20 w-20 opacity-70" aria-hidden="true" />
                  </div>
                  <div className="space-y-3 px-4 pb-4 pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-500">{[vehicle.brand, vehicle.category].filter(Boolean).join(' • ') || 'Vendor listing'}</p>
                        <h3 className="text-[22px] font-black tracking-[-0.04em] text-slate-900">{title}</h3>
                      </div>
                      {Number(vehicle.rating) > 0 && (
                        <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-sm font-bold text-amber-500">
                          <Star className="h-4 w-4 fill-current" />{Number(vehicle.rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      {specs.map((spec) => <span key={spec} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">{spec}</span>)}
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-2">
                      <div className="text-[24px] font-black tracking-[-0.04em] text-slate-900">
                        ₹{rate.toLocaleString('en-IN')}
                        <span className="text-sm font-medium text-slate-500"> / day</span>
                      </div>
                      <Link to={`/vehicles/${vehicle.id}`} className="inline-flex items-center gap-2 rounded-xl bg-[#ff6b00] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e85d00]">
                        View details
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No approved vehicles are available right now. Please check back soon.</p>
        )}
      </section>

      <section id="categories" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7">
          <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-900">Browse by category</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {categories.map(({ name, count, icon: Icon }) => (
            <div key={name} className="rounded-[24px] border border-slate-200 bg-white p-5 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg motion-reduce:transition-none">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5ee] text-[#ff6b00]">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold tracking-[-0.04em] text-slate-900">{name}</h3>
              <p className="mt-2 text-sm text-slate-500">{count} available</p>
            </div>
          ))}
        </div>
      </section>

      <section id="why-smarride" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-900">Why SmartRide</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {highlights.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg motion-reduce:transition-none">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5ee] text-[#ff6b00]">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-[22px] font-bold tracking-[-0.04em] text-slate-900">{title}</h3>
              <p className="mt-3 text-base text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {reviews.map((review) => (
            <div key={review.author} className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg motion-reduce:transition-none">
              <div className="mb-4 flex items-center gap-1 text-[#ff6b00]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-lg font-medium leading-8 text-slate-700">“{review.quote}”</p>
              <p className="mt-5 text-lg font-bold text-slate-900">{review.author}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 rounded-[28px] bg-[#ff6b00] px-8 py-8 text-white shadow-[0_25px_60px_rgba(255,107,0,0.25)] transition duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-4xl font-black tracking-[-0.05em] text-white">Own vehicles or love driving?</h2>
            <p className="mt-2 text-lg text-orange-50">List your fleet or join as a driver and start earning with SmartRide.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/vendor/register" className="inline-flex items-center justify-center rounded-xl border border-white/80 bg-white px-6 py-3 text-base font-semibold text-[#ff6b00] transition hover:bg-orange-50">
              Become a vendor
            </Link>
            <Link to="/driver/register" className="inline-flex items-center justify-center rounded-xl border border-white/80 bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10">
              Become a driver
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
