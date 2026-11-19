import { BriefcaseBusiness, CarFront, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Browse Vehicles', to: '/vehicles' },
  { label: 'Categories', to: '/#categories' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

const registrationItems = [
  { label: 'Become a Vendor', to: '/vendor/register', icon: BriefcaseBusiness },
  { label: 'Become a Driver', to: '/driver/register', icon: CarFront },
];

function NavigationLinks({ onNavigate, className = '' }) {
  return (
    <nav aria-label="Main navigation" className={className}>
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `whitespace-nowrap text-sm font-medium transition-colors ${
              isActive ? 'text-[#E85D00]' : 'text-slate-600 hover:text-[#E85D00]'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function RegistrationLinks({ onNavigate, className = '' }) {
  return (
    <div className={className}>
      {registrationItems.map(({ label, to, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#FF6B00] px-4 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#E85D00] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85D00]"
        >
          <Icon size={17} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </div>
  );
}

function AccountLinks({ onNavigate, className = '' }) {
  return (
    <div className={className}>
      <Link
        to="/login"
        onClick={onNavigate}
        className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-slate-700 transition-colors hover:text-[#E85D00]"
      >
        Login
      </Link>
      <Link
        to="/register"
        onClick={onNavigate}
        className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-[#FF6B00] px-5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#E85D00] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85D00]"
      >
        Sign Up
      </Link>
    </div>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid min-h-[76px] max-w-[1600px] grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 2xl:px-8 xl:grid-cols-[auto_1fr_auto]">
        <Link
          to="/"
          onClick={closeMenu}
          aria-label="SmartRide home"
          className="flex w-fit items-center gap-2.5"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#10233F] text-white shadow-sm">
            <CarFront size={23} strokeWidth={2.2} aria-hidden="true" />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#FF6B00]" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-[#10233F]">
            Smart<span className="text-[#FF6B00]">Ride</span>
          </span>
        </Link>

        <div className="hidden min-w-0 items-center justify-center gap-5 xl:flex 2xl:gap-7">
          <NavigationLinks className="flex items-center gap-4 2xl:gap-5" />
          <RegistrationLinks className="flex items-center gap-2.5" />
        </div>

        <AccountLinks className="hidden items-center justify-end gap-3 xl:flex" />

        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-[#10233F] transition-colors hover:border-[#FF6B00] hover:text-[#E85D00] xl:hidden"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-slate-200 bg-white px-4 pb-5 pt-4 sm:px-6 xl:hidden"
        >
          <NavigationLinks
            onNavigate={closeMenu}
            className="flex flex-col items-stretch gap-1"
          />
          <RegistrationLinks
            onNavigate={closeMenu}
            className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2"
          />
          <AccountLinks
            onNavigate={closeMenu}
            className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4"
          />
        </div>
      )}
    </header>
  );
}
