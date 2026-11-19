import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function VendorApplicationSubmitted() {
  const { state } = useLocation();
  const application = useMemo(() => {
    if (state?.applicationId) return state;
    try {
      return JSON.parse(sessionStorage.getItem('vendorApplicationSubmitted') || 'null');
    } catch {
      return null;
    }
  }, [state]);

  if (!application) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Application details unavailable</h1>
        <p className="mt-2 text-slate-600">If you submitted an application, check your registered email for updates.</p>
        <Link to="/vendor/register" className="mt-5 inline-block font-semibold text-[#D95400]">Start a new application</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={36} /></span>
        <h1 className="mt-5 text-3xl font-black text-slate-900">Vendor Application Submitted Successfully!</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">Thank you for registering with SmartRide. Your application has been submitted successfully and is waiting for Admin approval.</p>
        <dl className="mt-8 grid gap-4 rounded-2xl bg-slate-50 p-5 text-left sm:grid-cols-2">
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Application ID</dt><dd className="mt-1 font-semibold text-slate-900">{application.applicationId}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Vendor name</dt><dd className="mt-1 font-semibold text-slate-900">{application.vendorName}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Registered email</dt><dd className="mt-1 font-semibold text-slate-900">{application.email}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Application date</dt><dd className="mt-1 font-semibold text-slate-900">{new Date(application.submittedAt).toLocaleString()}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Application status</dt><dd className="mt-1 inline-flex rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-800">{application.status}</dd></div>
        </dl>
        <p className="mt-6 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-900">Your account will become active after Admin verification and approval. You will receive an update when your application is reviewed.</p>
        <Link to="/vendor/login" className="mt-6 inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Go to vendor login</Link>
      </section>
    </div>
  );
}
