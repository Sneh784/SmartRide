import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/ui/PasswordInput';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login({
        email: form.email,
        password: form.password,
      });

      const token = response?.data?.token;
      const userData = {
        name: response?.data?.userName || 'SmartRide User',
        role: response?.data?.role || '',
        email: form.email,
      };

      login({ authToken: token, userData });
      const destinations = {
        CUSTOMER: '/customer/dashboard',
        VENDOR: '/vendor/dashboard',
        DRIVER: '/driver/dashboard',
        FLEET_MANAGER: '/fleet-manager/dashboard',
        ADMIN: '/admin-dashboard',
      };
      navigate(location.state?.from?.pathname || destinations[userData.role] || '/', { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
        <div className="bg-slate-900 p-10 text-white">
          <span className="inline-flex rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
            Welcome back
          </span>
          <h1 className="mt-6 text-4xl font-black">Access your SmartRide account</h1>
          <p className="mt-4 text-slate-300">
            Manage bookings, vehicle access, and vendor dashboard actions securely.
          </p>
        </div>

        <div className="p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-slate-900">Login</h2>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#ff6b00] focus:bg-white"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <PasswordInput
                id="password"
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                visibilityLabel="password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#ff6b00] focus:bg-white"
              />
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#ff6b00] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="mt-6 text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-[#ff6b00]">Create one</Link>
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Fleet Manager?{' '}
            <Link to="/fleet-manager/login" className="font-semibold text-[#ff6b00]">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
