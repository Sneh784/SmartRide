export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">SmartRide</h3>
          <p className="mt-3 text-sm text-slate-600">
            Smart vehicle rentals for personal, commercial, and fleet operations.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>About Us</li>
            <li>Careers</li>
            <li>Support</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">Services</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Vehicle Booking</li>
            <li>Fleet Management</li>
            <li>Driver Hire</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>support@smartride.com</li>
            <li>+91 98765 43210</li>
            <li>Hyderabad, India</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
