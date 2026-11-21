import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { driverApi } from '../api/driverApi';
import { apiError, dateOnly } from '../services/driverFormatters';

const initialForm = { fullName: '', phone: '', address: '', city: '', state: '', pincode: '' };
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100';

export default function DriverProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    driverApi.profile()
      .then(({ data }) => {
        if (!active) return;
        setProfile(data);
        setForm({
          fullName: data.fullName || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
        });
      })
      .catch((requestError) => {
        if (active) setError(apiError(requestError, 'Could not load your profile.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadVersion]);

  const reload = () => {
    setError('');
    setLoading(true);
    setReloadVersion((value) => value + 1);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data } = await driverApi.updateProfile(form);
      setProfile(data);
      setForm((current) => ({ ...current, fullName: data.fullName, phone: data.phone }));
      setUser({ ...user, name: data.fullName });
      setMessage('Profile updated successfully.');
    } catch (requestError) {
      setError(apiError(requestError, 'Could not update your profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />;
  if (!profile) {
    return <section className="rounded-2xl border border-red-200 bg-white p-8 text-center">
      <p role="alert" className="text-sm text-red-700">{error || 'Driver profile is unavailable.'}</p>
      <button onClick={reload} className="mt-4 rounded-lg bg-[#172033] px-4 py-2 text-sm font-bold text-white">Retry</button>
    </section>;
  }

  return (
    <>
      <div className="mb-5"><h1 className="text-2xl font-black text-slate-900">Driver profile</h1><p className="mt-1 text-sm text-slate-500">Update your contact and residential details. Email and identity verification records remain read-only.</p></div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}
      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">Contact information</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">Full name<input required maxLength={255} value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className={`${inputClass} mt-1.5`} /></label>
            <label className="block text-sm font-semibold text-slate-700">Email address<input readOnly value={profile?.email || ''} className={`${inputClass} mt-1.5 bg-slate-50 text-slate-500`} /></label>
            <label className="block text-sm font-semibold text-slate-700">Mobile number<input required type="tel" pattern="^\s*(?:\+?91[ -]?)?[6-9](?:[ -]?[0-9]){9}\s*$" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={`${inputClass} mt-1.5`} /></label>
            <label className="block text-sm font-semibold text-slate-700">Address<input required maxLength={1000} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className={`${inputClass} mt-1.5`} /></label>
            <label className="block text-sm font-semibold text-slate-700">City<input required maxLength={100} value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className={`${inputClass} mt-1.5`} /></label>
            <label className="block text-sm font-semibold text-slate-700">State<input required maxLength={100} value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} className={`${inputClass} mt-1.5`} /></label>
            <label className="block text-sm font-semibold text-slate-700">Pincode<input required inputMode="numeric" pattern="[0-9]{6}" value={form.pincode} onChange={(event) => setForm((current) => ({ ...current, pincode: event.target.value }))} className={`${inputClass} mt-1.5`} /></label>
          </div>
          <button disabled={saving} className="mt-6 rounded-xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white hover:bg-[#E85D00] disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button>
        </section>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Driver verification</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-slate-500">Account status</dt><dd className="mt-1 font-bold text-emerald-700">{profile?.approvalStatus || '—'}</dd></div>
              <div><dt className="text-slate-500">Application reference</dt><dd className="mt-1 font-semibold text-slate-800">{profile?.applicationNumber || '—'}</dd></div>
              <div><dt className="text-slate-500">License expiry</dt><dd className="mt-1 font-semibold text-slate-800">{dateOnly(profile?.licenseExpiryDate)}</dd></div>
              <div><dt className="text-slate-500">Driving experience</dt><dd className="mt-1 font-semibold text-slate-800">{profile?.experienceYears ?? '—'} years</dd></div>
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Authorized categories</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{profile?.vehicleCategories || 'No vehicle categories recorded.'}</p>
          </section>
        </aside>
      </form>
    </>
  );
}
