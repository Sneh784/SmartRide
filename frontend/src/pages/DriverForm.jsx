import { useState } from 'react';
import { BadgeCheck, CarFront, CheckCircle2, FileCheck2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { driverApi } from '../api/driverApi';
import { vehicleCategories } from '../utils/vehicleCategories';

const initialForm = {
  fullName: '',
  email: '',
  mobileNumber: '',
  password: '',
  confirmPassword: '',
  dateOfBirth: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  licenseNumber: '',
  licenseExpiryDate: '',
  drivingExperienceYears: '',
  vehicleCategories: [],
  termsAccepted: false,
  driverPoliciesAccepted: false,
};

const latestBirthDate = new Date();
latestBirthDate.setFullYear(latestBirthDate.getFullYear() - 18);
const latestBirthDateValue = latestBirthDate.toISOString().slice(0, 10);
const earliestExpiry = new Date();
earliestExpiry.setDate(earliestExpiry.getDate() + 1);
const earliestExpiryValue = earliestExpiry.toISOString().slice(0, 10);

function Field({ label, name, value, onChange, required = true, type = 'text', ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}{required && ' *'}
      </span>
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

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function DriverForm() {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState(null);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleCategoryChange = (category) => {
    setForm((current) => {
      const selected = current.vehicleCategories.includes(category);
      return {
        ...current,
        vehicleCategories: selected
          ? current.vehicleCategories.filter((item) => item !== category)
          : [...current.vehicleCategories, category],
      };
    });
    setError('');
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = event.target.name === 'profilePhoto'
      ? ['image/png', 'image/jpeg']
      : ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFiles((current) => ({ ...current, [event.target.name]: null }));
      setError(event.target.name === 'profilePhoto'
        ? 'Profile photos must be PNG or JPG files no larger than 5 MB.'
        : 'Documents must be PDF, PNG, or JPG files no larger than 5 MB.');
      event.target.value = '';
      return;
    }
    setFiles((current) => ({ ...current, [event.target.name]: file }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.vehicleCategories.length === 0) {
      setError('Select at least one vehicle category you are licensed and experienced to drive.');
      return;
    }
    if (!form.termsAccepted || !form.driverPoliciesAccepted) {
      setError('Accept the Terms and Conditions and Driver Policies to continue.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!files.drivingLicense || !files.identityProof) {
      setError('Upload both your driving license and identity proof.');
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('application', new Blob([
        JSON.stringify({
          ...form,
          drivingExperienceYears: Number(form.drivingExperienceYears),
        }),
      ], { type: 'application/json' }));
      payload.append('drivingLicense', files.drivingLicense);
      payload.append('identityProof', files.identityProof);
      if (files.profilePhoto) payload.append('profilePhoto', files.profilePhoto);

      const response = await driverApi.apply(payload);
      setApplication(response.data);
    } catch (requestError) {
      setError(requestError?.response?.data?.message
        || requestError?.response?.data?.detail
        || 'Could not submit your driver application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (application) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl sm:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={34} aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Application submitted</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Thanks, {application.fullName}.</h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
            Your driver application is pending administrator review. You can sign in to the driver portal after it is approved.
          </p>
          <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-slate-50 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Application reference</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900">{application.applicationNumber}</p>
            <p className="mt-2 text-sm text-amber-700">Status: {application.status}</p>
          </div>
          <Link to="/login" className="mt-7 inline-flex rounded-xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#E85D00]">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl bg-[#14223A] p-6 text-white shadow-xl sm:p-9">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B00]">
            <CarFront size={25} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-200">Drive with SmartRide</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Driver application</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Tell us about your driving experience and the vehicles you can operate. An administrator will verify your documents before activating your driver account.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [FileCheck2, 'Submit your details'],
            [ShieldCheck, 'Admin verifies documents'],
            [BadgeCheck, 'Get approved to drive'],
          ].map(([Icon, text]) => (
            <div key={text} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-slate-200">
              <Icon size={17} className="text-orange-300" aria-hidden="true" />
              {text}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Personal information" description="Use the same contact details you will use to access your driver account.">
          <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} autoComplete="name" />
          <Field label="Email address" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
          <Field label="Mobile number" name="mobileNumber" type="tel" value={form.mobileNumber} onChange={handleChange} pattern="^\s*(?:\+?91[ -]?)?[6-9](?:[ -]?[0-9]){9}\s*$" title="Enter a valid Indian mobile number" autoComplete="tel" />
          <Field label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} max={latestBirthDateValue} />
          <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} autoComplete="new-password" />
          <Field label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" />
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Residential address *</span>
            <textarea name="address" required maxLength={1000} value={form.address} onChange={handleChange} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100" />
          </label>
          <Field label="City" name="city" value={form.city} onChange={handleChange} autoComplete="address-level2" />
          <Field label="State" name="state" value={form.state} onChange={handleChange} autoComplete="address-level1" />
          <Field label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} pattern="[0-9]{6}" title="Enter a six-digit pincode" autoComplete="postal-code" />
        </Section>

        <Section title="Driving credentials" description="The license must be valid on the date you submit this application.">
          <Field label="Driving license number" name="licenseNumber" value={form.licenseNumber} onChange={handleChange} minLength={5} maxLength={50} pattern="[A-Za-z0-9 -]{5,50}" title="Enter a valid license number" />
          <Field label="License expiry date" name="licenseExpiryDate" type="date" min={earliestExpiryValue} value={form.licenseExpiryDate} onChange={handleChange} />
          <Field label="Years of driving experience" name="drivingExperienceYears" type="number" min="0" max="60" value={form.drivingExperienceYears} onChange={handleChange} />
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-semibold text-slate-700">Vehicle categories you can drive *</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {vehicleCategories.map((category) => (
                <label key={category} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.vehicleCategories.includes(category)}
                    onChange={() => handleCategoryChange(category)}
                    className="mt-0.5 accent-[#FF6B00]"
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Document verification" description="Photos and documents are stored privately and available only to authorized administrators. Each file must be 5 MB or smaller.">
          {[
            ['profilePhoto', 'Profile photo (optional)', false],
            ['drivingLicense', "Driving license (front/back in one file)", true],
            ['identityProof', 'Government identity proof', true],
          ].map(([name, label, required]) => (
            <label key={name} className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required && ' *'}</span>
              <input
                type="file"
                name={name}
                required={required}
                accept={name === 'profilePhoto' ? 'image/png,image/jpeg' : 'application/pdf,image/png,image/jpeg'}
                onChange={handleFile}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:font-semibold file:text-[#B54700]"
              />
              {files[name] && <span className="mt-1 block truncate text-xs text-emerald-700">{files[name].name}</span>}
            </label>
          ))}
        </Section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" name="termsAccepted" checked={form.termsAccepted} onChange={handleChange} className="mt-1 accent-[#FF6B00]" />
            <span>I accept the Terms and Conditions.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" name="driverPoliciesAccepted" checked={form.driverPoliciesAccepted} onChange={handleChange} className="mt-1 accent-[#FF6B00]" />
            <span>I agree to follow SmartRide Driver Policies and understand that my account requires administrator approval.</span>
          </label>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Already approved? <Link to="/login" className="font-semibold text-[#B54700] hover:underline">Driver login</Link>
            </p>
            <button type="submit" disabled={loading} className="rounded-xl bg-[#FF6B00] px-6 py-3 font-bold text-white transition hover:bg-[#E85D00] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Submitting application…' : 'Submit for admin review'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
