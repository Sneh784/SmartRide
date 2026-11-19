import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: 'Aarav',
    lastName: 'Mehta',
    email: 'aarav@example.com',
    phone: '+91 98765 43210',
    password: 'password123',
    confirmPassword: 'password123',
  });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!agree) {
      setError('Please agree to the Terms and Conditions and Privacy Policy.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });

      navigate('/login');
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.08fr_0.92fr]">
        <div
          className="relative overflow-hidden bg-slate-900 px-6 py-8 text-white sm:px-10 lg:px-12"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(15,23,42,0.78) 0%, rgba(15,23,42,0.6) 100%), url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#ff6b00] text-white">S</span>
                SmartRide
              </div>
            </div>

            <div className="pb-2 pt-16">
              <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] text-white">Join SmartRide Today</h1>
              <p className="mt-5 max-w-md text-lg text-slate-200">
                Create your account and discover a smarter way to travel.
              </p>

              <div className="mt-8 space-y-4 text-left">
                {[
                  ['Explore Multiple Vehicle Categories', 'Cars, bikes, buses, boats and more — all in one place.'],
                  ['Manage Your Bookings', 'Track trips, deposits and documents from one dashboard.'],
                  ['Enjoy Convenient Rentals', 'Flexible hourly, daily and long-term rental options.'],
                ].map(([title, text]) => (
                  <div key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ff6b00] text-lg font-bold text-white">
                      ✓
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{title}</h3>
                      <p className="mt-1 text-sm text-slate-200">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 lg:p-10">
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-900">Create Your Account</h2>
            <p className="mt-2 text-base text-slate-600">Fill in your details to get started.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">First Name</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#ff6b00] focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Last Name</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#ff6b00] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#ff6b00] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Mobile Number</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#ff6b00] focus:bg-white"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#ff6b00] focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#ff6b00] focus:bg-white"
                />
              </div>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={agree}
                onChange={(event) => setAgree(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff6b00] focus:ring-[#ff6b00]"
              />
              <span>
                I agree to the <span className="font-medium text-slate-800">Terms and Conditions</span> and <span className="font-medium text-slate-800">Privacy Policy</span>.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#ff6b00] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#ff6b00]">Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
