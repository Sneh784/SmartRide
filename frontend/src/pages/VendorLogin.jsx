import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { vendorApi } from '../api/vendorApi';
import { useAuth } from '../context/AuthContext';

export default function VendorLogin() {
  const navigate = useNavigate();
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
      const { data } = await vendorApi.login(form);
      login({
        authToken: data.token,
        userData: { name: data.userName, role: data.role, email: data.email },
      });
      navigate('/vendor/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || requestError?.response?.data?.message || 'Unable to log in. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl justify-center px-4 py-14 sm:px-6">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-lg sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#D95400]">Vendor portal</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Vendor login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in after your application has been approved.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Email</span>
            <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Password</span>
            <span className="flex rounded-xl border border-slate-200 focus-within:border-[#FF6B00] focus-within:ring-2 focus-within:ring-orange-100">
              <input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} className="min-w-0 flex-1 rounded-l-xl px-4 py-3 outline-none" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="px-4 text-slate-500">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <div className="text-right"><span className="text-sm text-slate-400" title="Password recovery is not available yet">Forgot password?</span></div>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#FF6B00] px-4 py-3 font-bold text-white hover:bg-[#E85D00] disabled:opacity-60">{loading ? 'Signing in…' : 'Log in'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">New to SmartRide? <Link to="/vendor/register" className="font-semibold text-[#D95400]">Apply to become a vendor</Link></p>
      </section>
    </div>
  );
}
