import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { vendorApi } from '../api/vendorApi';

const initialForm = {
  fullName: '', email: '', mobileNumber: '', password: '', confirmPassword: '',
  
   city: '', state: '', pincode: '',
  termsAccepted: false, vendorPoliciesAccepted: false,
};

const fileFields = [
  ['profileImage', 'Profile image', false, true],
  ['identityProof', 'Identity proof (Aadhaar or accepted ID)', true, false],
  ['panCard', 'PAN card', true, false],
];

function Field({ label, name, value, onChange, required = true, type = 'text', ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required && ' *'}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100"
        {...props}
      />
    </label>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="mb-5 text-lg font-bold text-slate-900">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function VendorRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleFile = (event) => {
    const { name, files: selected } = event.target;
    const file = selected?.[0];
    if (!file) return;
    const imageOnly = name === 'profileImage';
    const supportedType = imageOnly
      ? ['image/png', 'image/jpeg'].includes(file.type)
      : ['application/pdf', 'image/png', 'image/jpeg'].includes(file.type);
    if (!supportedType || file.size > 5 * 1024 * 1024) {
      setError(`${event.target.labels[0]?.innerText || 'File'} must be a supported ${imageOnly ? 'PNG or JPG image' : 'PDF, PNG, or JPG'} no larger than 5 MB.`);
      event.target.value = '';
      return;
    }
    setFiles((current) => ({ ...current, [name]: file }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.termsAccepted || !form.vendorPoliciesAccepted) {
      setError('Please accept the Terms and Conditions and Vendor Policies.');
      return;
    }
    if (form.password.length < 8 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password)
      || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('application', new Blob([JSON.stringify(form)], { type: 'application/json' }));
      fileFields.forEach(([name]) => {
        if (files[name]) payload.append(name, files[name]);
      });
      const { data } = await vendorApi.register(payload);
      sessionStorage.setItem('vendorApplicationSubmitted', JSON.stringify(data));
      navigate('/vendor/application-submitted', { state: data, replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || requestError?.response?.data?.message || 'Could not submit your vendor application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-[#D95400]">Partner with SmartRide</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">Vendor registration</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Share your personal and business details. Your account will remain inactive until an administrator reviews your application.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Personal information">
          <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} autoComplete="name" />
          <Field label="Email address" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
          <Field label="Mobile number" name="mobileNumber" type="tel" value={form.mobileNumber} onChange={handleChange} pattern="^\s*(?:\+?91[ \-]?)?[6-9](?:[ \-]?[0-9]){9}\s*$" title="Enter a valid Indian mobile number" autoComplete="tel" />
          <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} autoComplete="new-password" />
          <Field label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" />
          <Field label="City" name="city" value={form.city} onChange={handleChange} />
          <Field label="State" name="state" value={form.state} onChange={handleChange} />
          <Field label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} pattern="[0-9]{6}" title="Enter a six-digit pincode" />
        

        </Section>

         
                  <Section title="Identity verification">
          <p className="text-sm text-slate-500 sm:col-span-2">Upload PDF, PNG, or JPG files. Each file must be 5 MB or smaller. Files are stored privately and are only available to you and authorized administrators.</p>
          {fileFields.map(([name, label, required, imageOnly]) => (
            <label key={name} className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required && ' *'}</span>
              <input
                type="file"
                name={name}
                required={required}
                accept={imageOnly ? 'image/png,image/jpeg' : 'application/pdf,image/png,image/jpeg'}
                onChange={handleFile}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:font-semibold file:text-[#B54700]"
              />
              {files[name] && <span className="mt-1 block truncate text-xs text-emerald-700">{files[name].name}</span>}
            </label>
          ))}
        </Section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" name="termsAccepted" checked={form.termsAccepted} onChange={handleChange} className="mt-1 accent-[#FF6B00]" />
            <span>I accept the Terms and Conditions.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" name="vendorPoliciesAccepted" checked={form.vendorPoliciesAccepted} onChange={handleChange} className="mt-1 accent-[#FF6B00]" />
            <span>I agree to follow SmartRide Vendor Policies.</span>
          </label>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Already applied? <Link to="/vendor/login" className="font-semibold text-[#D95400]">Vendor login</Link></p>
            <button type="submit" disabled={loading} className="rounded-xl bg-[#FF6B00] px-6 py-3 font-bold text-white transition hover:bg-[#E85D00] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Submitting application…' : 'Submit application'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
