import {
  CalendarRange,
  CarFront,
  CreditCard,
  MapPin,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const vehicles = [
  {
    name: 'Corolla Altis',
    price: '₹2,800',
    rating: 4.8,
    type: 'Self-drive',
    image:
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=900&q=80',
    specs: ['5 seats', 'Petrol', 'Automatic', 'Pune, Bane'],
  },
  {
    name: 'Range Rover Vogue',
    price: '₹14,500',
    rating: 4.9,
    type: 'With driver',
    image:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80',
    specs: ['5 seats', 'Diesel', 'Automatic', 'Mumbai, Bandra'],
  },
  {
    name: 'Civic Type R',
    price: '₹6,200',
    rating: 4.7,
    type: 'Self-drive',
    image:
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=900&q=80',
    specs: ['4 seats', 'Petrol', 'Manual', 'Bengaluru, Indiranagar'],
  },
];

const categories = [
  { name: 'Sedan', count: '14 available', icon: CarFront },
  { name: 'SUV', count: '14 available', icon: CarFront },
  { name: 'Hatchback', count: '13 available', icon: CarFront },
  { name: 'Luxury', count: '13 available', icon: CarFront },
];

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

export default function Home() {
  const { hash } = useLocation();

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

  return (
    <div className="bg-[#f3f5f8] text-slate-900">
      <section className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.25)]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(18,24,32,0.72) 0%, rgba(18,24,32,0.56) 30%, rgba(18,24,32,0.24) 100%), url('https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1800&q=80')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="px-5 pb-10 pt-8 sm:px-10 lg:px-12 lg:pb-12 lg:pt-10">
            <div className="max-w-[760px] text-white">
              <span className="inline-flex rounded-full border border-orange-300/60 bg-[#ff6b00]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-sm">
                Verified vendors • Secure deposits
              </span>

              <h1 className="mt-7 text-5xl font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-6xl lg:text-[78px]">
                Rent the right vehicle, your way.
              </h1>

              <p className="mt-5 max-w-[680px] text-base text-slate-200 sm:text-lg">
                Drive yourself or ride with a professional chauffeur. Transparent pricing, KYC in minutes, and live trip tracking.
              </p>
            </div>

            <form className="mt-8 grid gap-3 rounded-[24px] border border-slate-200/60 bg-white/95 p-4 text-slate-900 shadow-xl backdrop-blur-sm md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:mt-10">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <MapPin className="h-4 w-4 text-[#ff6b00]" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pickup location</span>
                  <input
                    className="mt-1 w-full bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    value="Pune"
                    readOnly
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <CalendarRange className="h-4 w-4 text-[#ff6b00]" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pickup date</span>
                  <input
                    className="mt-1 w-full bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    value="10/28/2026"
                    readOnly
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <CalendarRange className="h-4 w-4 text-[#ff6b00]" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Return date</span>
                  <input
                    className="mt-1 w-full bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    value="10/30/2026"
                    readOnly
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <CarFront className="h-4 w-4 text-[#ff6b00]" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Rental mode</span>
                  <select className="mt-1 w-full bg-transparent text-base font-medium text-slate-900 outline-none">
                    <option>Self-drive</option>
                    <option>With driver</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-[#ff6b00] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#e85d00]"
              >
                Search
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

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <article key={vehicle.name} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
              <div className="relative">
                <div className="mb-3 flex items-center justify-between px-4 pt-4">
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {vehicle.type}
                  </span>
                </div>
                <img src={vehicle.image} alt={vehicle.name} className="h-56 w-full object-cover" />
              </div>

              <div className="space-y-3 px-4 pb-4 pt-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{vehicle.type === 'Self-drive' ? 'Toyota - Sedan' : 'Land Rover - Luxury'}</p>
                    <h3 className="text-[22px] font-black tracking-[-0.04em] text-slate-900">{vehicle.name}</h3>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-sm font-bold text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    {vehicle.rating}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  {vehicle.specs.map((spec) => (
                    <span key={spec} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                      {spec}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <div className="text-[24px] font-black tracking-[-0.04em] text-slate-900">
                    ₹{vehicle.price}
                    <span className="text-sm font-medium text-slate-500"> / day</span>
                  </div>
                  <Link
                    to="/vehicles"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#ff6b00] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e85d00]"
                  >
                    View details
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="categories" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7">
          <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-900">Browse by category</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {categories.map(({ name, count, icon: Icon }) => (
            <div key={name} className="rounded-[24px] border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5ee] text-[#ff6b00]">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold tracking-[-0.04em] text-slate-900">{name}</h3>
              <p className="mt-2 text-sm text-slate-500">{count}</p>
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
            <div key={title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
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
            <div key={review.author} className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
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
        <div className="flex flex-col gap-5 rounded-[28px] bg-[#ff6b00] px-8 py-8 text-white shadow-[0_25px_60px_rgba(255,107,0,0.25)] lg:flex-row lg:items-center lg:justify-between">
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
