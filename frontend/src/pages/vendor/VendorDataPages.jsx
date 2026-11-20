import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, CircleAlert, CreditCard, Download, FileCheck2, LoaderCircle } from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';

const read = (row, key) => row?.[key] ?? row?.[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
const date = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);

function Banner({ error, onRetry }) {
  if (!error) return null;
  return <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span className="flex items-center gap-2"><CircleAlert size={17} />{error}</span>{onRetry && <button onClick={onRetry} className="font-bold underline">Retry</button>}</div>;
}

function Loading() {
  return <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading records…</div>;
}

function DataTable({ rows, columns, empty }) {
  return rows?.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(([key, label]) => <th key={key} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={read(row, 'id')} className="hover:bg-slate-50">{columns.map(([key]) => <td key={key} className="px-4 py-3 text-slate-700">{key === 'amount' || key === 'daily_rate' ? money(read(row, key)) : key === 'status' || key === 'approval_status' || key === 'availability_status' ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{String(read(row, key) || '—').replaceAll('_', ' ')}</span> : key.endsWith('date') || key === 'created_at' || key === 'payment_date' ? date(read(row, key)) : read(row, key) ?? '—'}</td>)}</tr>)}</tbody></table></div>
    : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">{empty}</div>;
}

function useRemote(load, deps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCounter, setReloadCounter] = useState(0);
  const reload = () => setReloadCounter((current) => current + 1);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    load().then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not load records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // The caller supplies dependency values matching the loader's captured state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadCounter]);
  return { data, loading, error, reload };
}

export function VendorBookings({ mode }) {
  const [reviewTarget, setReviewTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const params = mode === 'requests' ? { status: 'PENDING' } : mode === 'confirmed' ? { status: 'CONFIRMED' } : {};
  const { data, loading, error, reload } = useRemote(() => vendorApi.bookings(params).then((response) => response.data), [mode]);
  const rows = useMemo(() => {
    const records = Array.isArray(data) ? data : [];
    if (mode === 'active') return records.filter((row) => ['ACTIVE', 'IN_PROGRESS'].includes(String(read(row, 'status')).toUpperCase()));
    if (mode === 'history') return records.filter((row) => ['COMPLETED', 'RETURNED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(String(read(row, 'status')).toUpperCase()));
    return records;
  }, [data, mode]);
  const title = mode === 'requests' ? 'Booking requests' : mode === 'confirmed' ? 'Confirmed bookings' : mode === 'active' ? 'Active rentals' : 'Booking history';
  const review = async (reason) => {
    if (!reviewTarget) return;
    setSaving(true);
    setActionError('');
    try {
      if (reviewTarget.decision === 'CONFIRMED') await vendorApi.acceptBooking(read(reviewTarget.booking, 'id'));
      else await vendorApi.rejectBooking(read(reviewTarget.booking, 'id'), { reason });
      setReviewTarget(null);
      reload();
    } catch (requestError) {
      setActionError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not update this booking.');
    } finally {
      setSaving(false);
    }
  };
  const columns = [[ 'id', 'Booking ID' ], ['vehicle_name', 'Vehicle'], ['customer_name', 'Customer'], ['pickup_date', 'Pickup date'], ['return_date', 'Return date'], ['pickup_location', 'Pickup location'], ['amount', 'Amount'], ['status', 'Status']];
  return <>
    <header className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#D95400]">Booking management</p><h1 className="mt-1 text-2xl font-extrabold">{title}</h1><p className="mt-2 text-sm text-slate-500">Showing booking records for vehicles owned by your account. Customer contact details are not exposed.</p></header>
    <Banner error={error || actionError} onRetry={reload} />
    {loading ? <Loading /> : mode === 'requests' && rows.length ? (
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(([key, label]) => <th key={key} className="px-4 py-3 font-bold">{label}</th>)}<th className="px-4 py-3 font-bold">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={read(row, 'id')} className="hover:bg-slate-50">
          {columns.map(([key]) => <td key={key} className="px-4 py-3 text-slate-700">{key === 'amount' ? money(read(row, key)) : key === 'status' ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{read(row, key)}</span> : key.endsWith('date') ? date(read(row, key)) : read(row, key) ?? '—'}</td>)}
          <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => setReviewTarget({ booking: row, decision: 'CONFIRMED' })} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Accept</button><button onClick={() => setReviewTarget({ booking: row, decision: 'REJECTED' })} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Reject</button></div></td>
        </tr>)}</tbody>
      </table></div>
    ) : <DataTable rows={rows} columns={columns} empty="There are no bookings in this section." />}
    {reviewTarget && <BookingDecisionDialog target={reviewTarget} saving={saving} onClose={() => setReviewTarget(null)} onConfirm={review} />}
  </>;
}

function BookingDecisionDialog({ target, saving, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const rejecting = target.decision === 'REJECTED';
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
    <form onSubmit={(event) => { event.preventDefault(); onConfirm(reason); }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h2 className="text-lg font-bold">{rejecting ? 'Reject booking request?' : 'Accept booking request?'}</h2>
      <p className="mt-2 text-sm text-slate-600">{rejecting ? 'The customer will be notified of your decision and the reason.' : 'The backend will check vehicle approval and date conflicts before confirming the booking.'}</p>
      {rejecting && <label className="mt-4 block text-sm font-semibold text-slate-700">Rejection reason<textarea required minLength={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-[#FF6B00]" /></label>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${rejecting ? 'bg-red-600' : 'bg-emerald-600'}`}>{saving ? 'Saving…' : rejecting ? 'Confirm rejection' : 'Confirm acceptance'}</button></div>
    </form>
  </div>;
}

export function VendorPayments({ earnings = false }) {
  const { data, loading, error, reload } = useRemote(() => vendorApi.payments().then((response) => response.data), []);
  const rows = Array.isArray(data) ? data : [];
  const gross = rows.filter((row) => ['SUCCESS', 'SUCCEEDED', 'COMPLETED'].includes(String(read(row, 'status')).toUpperCase())).reduce((total, row) => total + Number(read(row, 'amount') || 0), 0);
  return <><header className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#D95400]">Financial management</p><h1 className="mt-1 text-2xl font-extrabold">{earnings ? 'Earnings' : 'Payments'}</h1><p className="mt-2 text-sm text-slate-500">Payment records for bookings associated with your vehicles. This reflects gross payment amount; commission and payout settlement are not modeled in the current backend.</p></header><div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#B54700]"><CreditCard size={21} /></span><div><p className="text-sm text-slate-500">Successful payments in loaded records</p><p className="text-2xl font-black">{money(gross)}</p></div></div><Banner error={error} onRetry={reload} />{loading ? <Loading /> : <DataTable rows={rows} columns={[[ 'id', 'Payment ID' ], ['booking_id', 'Booking ID'], ['vehicle_name', 'Vehicle'], ['amount', 'Amount'], ['currency', 'Currency'], ['provider', 'Provider'], ['status', 'Payment status'], ['payment_date', 'Date']]} empty="No payment records are available for your vehicles." />}</>;
}

export function VendorNotifications() {
  const { data, loading, error, reload } = useRemote(() => vendorApi.notifications().then((response) => response.data), []);
  const [actionError, setActionError] = useState('');
  const items = data?.items || [];
  const markRead = async (id) => {
    setActionError('');
    try {
      await vendorApi.markNotificationRead(id);
      reload();
    } catch (requestError) {
      setActionError(requestError?.response?.data?.message || 'Could not mark notification as read.');
    }
  };
  return <><header className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#D95400]">Business</p><h1 className="mt-1 text-2xl font-extrabold">Notifications</h1><p className="mt-2 text-sm text-slate-500">{Number(data?.unread) || 0} unread notifications</p></header><Banner error={error || actionError} onRetry={reload} />{loading ? <Loading /> : items.length ? <div className="space-y-3">{items.map((item) => <article key={item.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#B54700]"><Bell size={17} /></span><div><h2 className="font-bold">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{date(item.created_at)}</p></div></div>{!item.is_read && <button onClick={() => markRead(item.id)} className="self-start rounded-lg px-3 py-2 text-xs font-bold text-[#B54700] hover:bg-orange-50">Mark as read</button>}</article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">You have no notifications.</div>}</>;
}

export function VendorDocuments() {
  const { data, loading, error, reload } = useRemote(() => vendorApi.applicationStatus().then((response) => response.data), []);
  const [downloadError, setDownloadError] = useState('');
  const download = async (document) => {
    setDownloadError('');
    try {
      const { data: file } = await vendorApi.vendorDocument(document.id);
      const url = URL.createObjectURL(file);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${document.type}.${file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      setDownloadError(requestError?.response?.data?.message || 'Could not retrieve your private document.');
    }
  };
  const documents = data?.documents || [];
  return <><header className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#D95400]">Business</p><h1 className="mt-1 text-2xl font-extrabold">Documents & KYC</h1><p className="mt-2 text-sm text-slate-500">Your submitted application documents remain private and can only be accessed with your authenticated vendor account.</p></header><Banner error={error || downloadError} onRetry={reload} />{loading ? <Loading /> : documents.length ? <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-5">{documents.map((document) => <div key={document.id} className="flex items-center justify-between gap-3 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#B54700]"><FileCheck2 size={19} /></span><div><p className="font-semibold">{String(document.type).replaceAll('_', ' ')}</p><p className="text-xs text-slate-500">Uploaded with vendor application</p></div></div><button onClick={() => download(document)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"><Download size={15} />Download</button></div>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No application documents were found.</div>}</>;
}

const unavailable = {
  '/vendor/payout-history': ['Payout history', 'Payout ledger and settlement status are not currently available from the backend.'],
  '/vendor/reviews': ['Reviews & ratings', 'The current database does not include vendor review records.'],
  '/vendor/profile': ['My profile', 'Vendor profile editing is not currently supported by the backend.'],
  '/vendor/settings': ['Settings', 'Vendor preferences and password settings are not currently supported by the backend.'],
  '/vendor/support': ['Help & support', 'Vendor support tickets are not currently supported by the backend.'],
};

export function VendorUnavailablePage() {
  const { pathname } = useLocation();
  const [title, message] = unavailable[pathname] || ['Vendor workspace', 'This area is not available yet.'];
  return <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FileCheck2 size={22} /></span><h1 className="mt-4 text-2xl font-extrabold text-slate-900">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{message}</p></section>;
}
