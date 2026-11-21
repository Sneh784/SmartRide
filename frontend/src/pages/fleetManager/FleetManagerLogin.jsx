import { useState } from 'react';
import { CarFront, Eye, EyeOff } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fleetManagerApi } from '../../api/fleetManagerApi';
import { useAuth } from '../../context/AuthContext';

export default function FleetManagerLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await fleetManagerApi.login(form);
      login({
        authToken: data.token,
        userData: { name: data.userName, role: data.role, email: data.email },
      });
      navigate(location.state?.from?.pathname || '/fleet-manager/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#F5F7FA] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#172033] text-white"><CarFront size={25} /></span>
          <span className="text-xl font-extrabold text-[#172033]">Smart<span className="text-[#FF6B00]">Ride</span></span>
        </div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#D95400]">Fleet operations</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">Fleet Manager login</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to manage your authorized fleet and operations.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold text-slate-700">
            Email address
            <input required type="email" autoComplete="username" value={form.email}
              onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <span className="mt-1.5 flex rounded-xl border border-slate-200 focus-within:border-[#FF6B00] focus-within:ring-2 focus-within:ring-orange-100">
              <input required type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
                className="min-w-0 flex-1 rounded-l-xl px-4 py-3 font-normal outline-none" />
              <button type="button" onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'} className="px-4 text-slate-500">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-[#FF6B00] px-4 py-3 font-bold text-white transition hover:bg-[#E85D00] disabled:opacity-60">
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <Link to="/" className="mt-6 block text-center text-sm font-semibold text-slate-500 hover:text-[#B54700]">Back to SmartRide</Link>
      </section>
    </main>
  );
}
