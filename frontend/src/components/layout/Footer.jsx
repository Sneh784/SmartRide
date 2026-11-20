import { ArrowRight, CarFront, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const footerLinks = [
  {
    heading: 'Explore',
    links: [
      { label: 'Browse vehicles', to: '/#popular-vehicles' },
      { label: 'Self-drive rentals', to: '/vehicles' },
      { label: 'Chauffeur rentals', to: '/vehicles' },
      { label: 'Popular vehicles', to: '/#popular-vehicles' },
    ],
  },
  {
    heading: 'Partner with us',
    links: [
      { label: 'Become a vendor', to: '/vendor/register' },
      { label: 'Become a driver', to: '/driver/register' },
      { label: 'Fleet solutions', to: '/vendor/register' },
    ],
  },
  {
    heading: 'Discover',
    links: [
      { label: 'Why SmartRide', to: '/#why-smarride' },
      { label: 'Browse categories', to: '/#categories' },
      { label: 'Contact & get started', to: '/#contact' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-8 overflow-hidden bg-[#0d1015] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-[#ff6b00]/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" aria-label="SmartRide home" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff6b00] text-white shadow-lg shadow-orange-950/30">
                <CarFront className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-2xl font-black tracking-[-0.05em]">
                Smart<span className="text-[#ff8c42]">Ride</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
              Your next ride, made simple. Find the right vehicle, book with confidence, and enjoy the journey.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="h-4 w-4 text-[#ff8c42]" aria-hidden="true" />
              Made for journeys across India
            </p>
          </div>

          {footerLinks.map(({ heading, links }) => (
            <nav key={heading} aria-label={heading}>
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">{heading}</h2>
              <ul className="mt-5 space-y-3">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="group inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff8c42]"
                    >
                      {label}
                      <ArrowRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-center text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© 2026 SmartRide Technologies. All rights reserved.</p>
          <Link to="/vehicles" className="font-semibold text-slate-400 transition-colors hover:text-[#ff8c42]">
            Ready to find your ride? Browse vehicles
          </Link>
        </div>
      </div>
    </footer>
  );
}
