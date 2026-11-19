import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Bell, CalendarDays, CarFront, CheckCircle2, CircleAlert, Clock3, CreditCard, Heart, LoaderCircle, MapPin, Search, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { useAuth } from '../../context/AuthContext';

function useRequest(request, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await request();
      setState({ data: response.data, loading: false, error: '' });
    } catch (error) {
      setState({ data: null, loading: false, error: error?.response?.data?.message || 'Could not load this information.' });
    }
  // The caller controls when the request changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

function PageTitle({ eyebrow, title, text, action }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#E85D00]">{eyebrow}</p><h1 className="mt-1 text-2xl font-extrabold text-[#172033] sm:text-3xl">{title}</h1>{text && <p className="mt-2 max-w-2xl text-sm text-slate-500">{text}</p>}</div>{action}</div>;
}

function Loading() { return <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={19} /> Loading customer data…</div>; }
function ErrorState({ message, retry }) { return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p className="flex items-center gap-2 font-semibold"><CircleAlert size={18} /> {message}</p>{retry && <button onClick={retry} className="mt-3 font-semibold underline">Try again</button>}</div>; }
function EmptyState({ icon: Icon = CarFront, title, text, action }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><Icon size={30} className="mx-auto text-slate-400" /><h3 className="mt-3 font-bold text-slate-800">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>{action}</div>; }
function StatusPill({ status = 'PENDING' }) {
  const value = String(status).replaceAll('_', ' ');
  const tone = /complete|return/i.test(value) ? 'bg-emerald-50 text-emerald-700' : /cancel|reject/i.test(value) ? 'bg-red-50 text-red-700' : /active|progress/i.test(value) ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{value}</span>;
}
const dateText = (date) => date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date)) : '—';
const money = (amount, currency = 'INR') => amount == null ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

function BookingRows({ bookings, emptyTitle = 'No bookings yet' }) {
  if (!bookings?.length) return <EmptyState title={emptyTitle} text="When you make a reservation, its details and status will appear here." action={<Link to="/customer/vehicles" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#E85D00]">Browse vehicles <ArrowRight size={16} /></Link>} />;
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100">{bookings.map((booking) => <article key={booking.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#E85D00]"><CarFront size={21} /></span><div className="min-w-0"><h3 className="truncate font-bold text-slate-800">{booking.vehicleName || 'Vehicle'}</h3><p className="mt-1 text-xs text-slate-500">Booking #{booking.id} · {dateText(booking.bookingDate)}</p><p className="mt-1 text-xs text-slate-500">{dateText(booking.pickupDate)} to {dateText(booking.returnDate)}</p><details className="mt-2 text-xs text-slate-500"><summary className="w-fit cursor-pointer font-semibold text-[#D95400]">View details</summary><div className="mt-2 space-y-1"><p>Booking type: {booking.bookingType || '—'}</p><p>Pickup: {booking.pickupLocation || 'Not set'}</p><p>Return: {booking.returnLocation || 'Not set'}</p></div></details></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><span className="font-bold text-slate-800">{money(booking.amount)}</span><StatusPill status={booking.status} /></div></article>)}</div></div>;
}

export function CustomerDashboard() {
  const { data, loading, error, reload } = useRequest(customerApi.dashboard);
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} retry={reload} />;
  const stats = [
    ['Total bookings', data?.totalBookings ?? 0, CalendarDays, 'bg-orange-50 text-[#E85D00]'],
    ['Upcoming bookings', data?.upcomingBookings ?? 0, Clock3, 'bg-blue-50 text-blue-700'],
    ['Active rentals', data?.activeRentals ?? 0, CarFront, 'bg-violet-50 text-violet-700'],
    ['Completed bookings', data?.completedBookings ?? 0, CheckCircle2, 'bg-emerald-50 text-emerald-700'],
  ];
  return <>
    <PageTitle eyebrow="Customer overview" title={`Welcome back, ${data?.customerName || 'Customer'}!`} text="Here’s an overview of your SmartRide bookings and rentals." />
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{stats.map(([label, value, Icon, tone]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span></div><p className="mt-4 text-3xl font-extrabold text-[#172033]">{value}</p></div>)}</div>
    <div className="mt-7 grid gap-6 2xl:grid-cols-[1.35fr_.9fr]">
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Recent bookings</h2><Link to="/customer/bookings" className="text-sm font-semibold text-[#D95400]">View all</Link></div><BookingRows bookings={data?.recentBookings || []} /></section>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Upcoming rentals</h2><Link to="/customer/active-rentals" className="text-sm font-semibold text-[#D95400]">View rentals</Link></div>
        {data?.upcomingRentals?.length ? <div className="space-y-3">{data.upcomingRentals.map((booking) => <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{booking.vehicleName}</h3><p className="mt-1 text-xs text-slate-500">Booking #{booking.id}</p></div><StatusPill status={booking.status} /></div><p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={16} className="text-[#E85D00]" />{dateText(booking.pickupDate)} → {dateText(booking.returnDate)}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} className="text-[#E85D00]" />{booking.pickupLocation || 'Pickup location not set'}</p></article>)}</div> : <EmptyState icon={CalendarDays} title="Nothing scheduled" text="Upcoming confirmed reservations will show here." />}</section>
    </div>
    <section className="mt-7 rounded-2xl bg-[#172033] p-5 text-white sm:flex sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Ready for your next trip?</h2><p className="mt-1 text-sm text-slate-300">Browse the vehicles currently available in SmartRide.</p></div><div className="mt-4 flex flex-wrap gap-2 sm:mt-0"><Link to="/customer/vehicles" className="rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold hover:bg-[#E85D00]">Browse vehicles</Link><Link to="/customer/profile" className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">Update profile</Link></div></section>
  </>;
}

export function CustomerBookings({ mode = 'all' }) {
  const request = mode === 'active' ? customerApi.activeRentals : mode === 'history' ? customerApi.bookingHistory : customerApi.bookings;
  const { data, loading, error, reload } = useRequest(request, [mode]);
  const title = mode === 'active' ? 'Active Rentals' : mode === 'history' ? 'Booking History' : 'My Bookings';
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Reservations" title={title} text="Your customer-specific reservation records from SmartRide." />{error ? <ErrorState message={error} retry={reload} /> : <BookingRows bookings={data || []} />}</>;
}

export function CustomerVehicles() {
  const { data, loading, error, reload } = useRequest(customerApi.vehicles);
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(new Set());
  const [actionError, setActionError] = useState('');
  const visible = (data || []).filter((vehicle) => `${vehicle.title} ${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.city || ''}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { customerApi.wishlist().then((response) => setSaved(new Set(response.data.map((item) => item.id)))).catch(() => {}); }, []);
  const toggleSave = async (vehicleId) => {
    setActionError('');
    try {
      if (saved.has(vehicleId)) { await customerApi.removeWishlist(vehicleId); setSaved((prev) => new Set([...prev].filter((id) => id !== vehicleId))); }
      else { await customerApi.addWishlist(vehicleId); setSaved((prev) => new Set([...prev, vehicleId])); }
    } catch (e) { setActionError(e?.response?.data?.message || 'Could not update your wishlist.'); }
  };
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Marketplace" title="Browse Vehicles" text="Vehicles currently listed in the SmartRide fleet." action={<label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><Search size={17} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles" className="w-40 bg-transparent text-sm outline-none" /></label>} />{error ? <ErrorState message={error} retry={reload} /> : actionError ? <ErrorState message={actionError} /> : null}{!error && !visible.length ? <EmptyState title={query ? 'No matching vehicles' : 'No vehicles listed yet'} text={query ? 'Try a different vehicle name or city.' : 'Vehicles will appear here once they are listed in the fleet.'} /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visible.map((vehicle) => <article key={vehicle.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#E85D00]"><CarFront size={22} /></span><button onClick={() => toggleSave(vehicle.id)} aria-label={saved.has(vehicle.id) ? 'Remove from wishlist' : 'Add to wishlist'} className={`rounded-lg p-2 ${saved.has(vehicle.id) ? 'text-pink-600' : 'text-slate-400 hover:text-pink-600'}`}><Heart size={19} fill={saved.has(vehicle.id) ? 'currentColor' : 'none'} /></button></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#E85D00]">{vehicle.category || 'Vehicle'}</p><h2 className="mt-1 text-lg font-bold">{vehicle.title || `${vehicle.brand || ''} ${vehicle.model || ''}`}</h2><p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin size={15} />{vehicle.city || vehicle.location || 'Location not listed'}</p><div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">Daily rate</p><p className="mt-1 text-xl font-extrabold">{money(vehicle.dailyrate || vehicle.dailyRate)}<span className="text-xs font-medium text-slate-500"> / day</span></p></div></article>)}</div>}</>;
}

export function CustomerWishlist() {
  const { data, loading, error, reload } = useRequest(customerApi.wishlist);
  const remove = async (id) => { await customerApi.removeWishlist(id); reload(); };
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Saved vehicles" title="Wishlist" text="Vehicles you have saved for later." />{error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState icon={Heart} title="Your wishlist is empty" text="Save vehicles from Browse Vehicles and they will appear here." action={<Link to="/customer/vehicles" className="mt-4 inline-flex rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white">Browse vehicles</Link>} /> : <div className="space-y-3">{data.map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"><div><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.city || item.category || 'SmartRide fleet'} · {money(item.dailyrate || item.dailyRate)} / day</p></div><button onClick={() => remove(item.id)} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Remove</button></div>)}</div>}</>;
}

export function CustomerPayments() {
  const { data, loading, error, reload } = useRequest(customerApi.payments);
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Transactions" title="Payments" text="Payment records linked to your bookings." />{error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState icon={CreditCard} title="No payment records" text="Payments will appear here after they are recorded against your bookings." /> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100">{data.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-bold">Payment #{payment.id}</p><p className="mt-1 text-sm text-slate-500">Booking #{payment.bookingid} · {dateText(payment.paymentdate)}</p></div><div className="flex items-center gap-3"><span className="font-bold">{money(payment.amount, payment.currency || 'INR')}</span><StatusPill status={payment.status} /></div></div>)}</div></div>}</>;
}

export function CustomerProfile() {
  const { data, loading, error, reload } = useRequest(customerApi.profile);
  const { setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const values = form || { firstName: data?.firstName || '', lastName: data?.lastName || '', phone: data?.phone || '' };
  const save = async (event) => { event.preventDefault(); setSaving(true); setMessage(''); try { const response = await customerApi.updateProfile(values); setUser({ name: response.data.fullName, role: response.data.role, email: response.data.email }); setMessage('Profile updated.'); await reload(); } catch (e) { setMessage(e?.response?.data?.message || 'Could not update profile.'); } finally { setSaving(false); } };
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Account" title="My Profile" text="Manage the contact details on your customer account." />{error ? <ErrorState message={error} retry={reload} /> : <form onSubmit={save} className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-center gap-4 border-b border-slate-100 pb-5"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[#D95400]"><UserRound size={24} /></span><div><h2 className="font-bold">{data.fullName}</h2><p className="text-sm text-slate-500">{data.email}</p></div></div>{[['firstName','First name'],['lastName','Last name'],['phone','Phone']].map(([key,label])=><label key={key} className="block text-sm font-semibold text-slate-700">{label}<input required={key!=='phone'} value={values[key]} onChange={(e)=>setForm((v)=>({...((v) || values),[key]:e.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-[#FF6B00]" /></label>)}<p className="text-sm text-slate-500">Email address cannot be changed here.</p>{message && <p className="text-sm font-medium text-emerald-700">{message}</p>}<button disabled={saving} className="rounded-xl bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving?'Saving…':'Save changes'}</button></form>}</>;
}

export function CustomerKyc() {
  const { data, loading, error, reload } = useRequest(customerApi.kyc);
  const [documentType, setDocumentType] = useState('PASSPORT');
  const [documentNumber, setDocumentNumber] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setMessage(''); try { await customerApi.submitKyc({ documentType, documentNumber }); setDocumentNumber(''); setMessage('Verification details submitted for review.'); await reload(); } catch (e) { setMessage(e?.response?.data?.message || 'Could not submit verification details.'); } finally { setSaving(false); } };
  if (loading) return <Loading />;
  const record = data?.[0];
  return <><PageTitle eyebrow="Account verification" title="KYC Verification" text="Submit identity details for your account. Only the last four characters of the document number are retained." />{error ? <ErrorState message={error} retry={reload} /> : <div className="max-w-2xl space-y-5">{record && <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Verification request</h2><p className="mt-1 text-sm text-slate-500">{record.documenttype || record.documentType} ending {record.documentlastfour || record.documentLastFour}</p></div><StatusPill status={record.status} /></div></div>}<form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><label className="block text-sm font-semibold">Document type<select value={documentType} onChange={(e)=>setDocumentType(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="PASSPORT">Passport</option><option value="DRIVING_LICENSE">Driving licence</option><option value="NATIONAL_ID">National ID</option></select></label><label className="block text-sm font-semibold">Document number<input required minLength={4} maxLength={32} value={documentNumber} onChange={(e)=>setDocumentNumber(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>{message && <p className="text-sm font-medium text-emerald-700">{message}</p>}<button disabled={saving} className="rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving?'Submitting…':'Submit for verification'}</button></form></div>}</>;
}

export function CustomerNotifications() {
  const { data, loading, error, reload } = useRequest(customerApi.notifications);
  const markRead = async (id) => { await customerApi.markNotificationRead(id); reload(); };
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Updates" title="Notifications" text="Booking and account updates for your customer profile." />{error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState icon={Bell} title="You’re all caught up" text="New customer notifications will appear here." /> : <div className="space-y-3">{data.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{dateText(item.createdat || item.createdAt)}</p></div>{!(item.read ?? item.is_read) && <button onClick={()=>markRead(item.id)} className="shrink-0 text-xs font-bold text-[#D95400]">Mark read</button>}</div></article>)}</div>}</>;
}

export function CustomerSupport() {
  const { data, loading, error, reload } = useRequest(customerApi.supportTickets);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setNotice(''); try { await customerApi.createSupportTicket({ subject, message }); setSubject(''); setMessage(''); setNotice('Your support request was submitted.'); await reload(); } catch (e) { setNotice(e?.response?.data?.message || 'Could not submit your request.'); } finally { setSaving(false); } };
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Help center" title="Support" text="Send a support request and review your previous tickets." /><div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Create a support request</h2><label className="block text-sm font-semibold">Subject<input required maxLength={160} value={subject} onChange={(e)=>setSubject(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label><label className="block text-sm font-semibold">How can we help?<textarea required maxLength={3000} rows={5} value={message} onChange={(e)=>setMessage(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>{notice && <p className="text-sm text-emerald-700">{notice}</p>}<button disabled={saving} className="rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving?'Sending…':'Submit request'}</button></form><section><h2 className="mb-3 font-bold">Previous requests</h2>{error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState icon={CircleAlert} title="No support requests" text="Your submitted requests will be listed here." /> : <div className="space-y-3">{data.map((ticket)=><article key={ticket.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">{ticket.subject}</h3><StatusPill status={ticket.status} /></div><p className="mt-2 text-sm text-slate-600">{ticket.message}</p><p className="mt-2 text-xs text-slate-400">#{ticket.id} · {dateText(ticket.createdat || ticket.createdAt)}</p></article>)}</div>}</section></div></>;
}
