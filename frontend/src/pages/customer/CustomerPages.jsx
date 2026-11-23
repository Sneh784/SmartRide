import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Bell, CalendarDays, CarFront, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, CreditCard, Fuel, Gauge, Heart, LoaderCircle, MapPin, Settings2, ShieldCheck, Star, UserRound, Users, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { bookingApi } from '../../api/bookingApi';
import { customerApi } from '../../api/customerApi';
import { paymentApi } from '../../api/paymentApi';
import BrowseVehicles from '../BrowseVehicles';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { openRazorpayCheckout } from '../../utils/razorpay';

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
    <section className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#172033] via-[#1C2C47] to-[#334768] p-6 text-white shadow-lg sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-300">Customer overview</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Welcome back, {data?.customerName || 'Customer'}!</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Plan your next trip, keep track of your rentals, and manage your bookings from one place.</p>
        </div>
        <Link to="/customer/vehicles" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#E85D00]">Find a vehicle <ArrowRight size={17} /></Link>
      </div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{stats.map(([label, value, Icon, tone]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span></div><p className="mt-4 text-3xl font-extrabold text-[#172033]">{value}</p></div>)}</div>
    <div className="mt-7 grid gap-6 2xl:grid-cols-[1.35fr_.9fr]">
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Recent bookings</h2><Link to="/customer/bookings" className="text-sm font-semibold text-[#D95400]">View all</Link></div><BookingRows bookings={data?.recentBookings || []} /></section>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Upcoming rentals</h2><Link to="/customer/active-rentals" className="text-sm font-semibold text-[#D95400]">View rentals</Link></div>
        {data?.upcomingRentals?.length ? <div className="space-y-3">{data.upcomingRentals.map((booking) => <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{booking.vehicleName}</h3><p className="mt-1 text-xs text-slate-500">Booking #{booking.id}</p></div><StatusPill status={booking.status} /></div><p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={16} className="text-[#E85D00]" />{dateText(booking.pickupDate)} → {dateText(booking.returnDate)}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} className="text-[#E85D00]" />{booking.pickupLocation || 'Pickup location not set'}</p></article>)}</div> : <EmptyState icon={CalendarDays} title="Nothing scheduled" text="Upcoming confirmed reservations will show here." />}</section>
    </div>
    <section className="mt-7 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-5 sm:flex sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">Ready for your next trip?</h2><p className="mt-1 text-sm text-slate-600">Search available rides and send a booking request to the vendor.</p></div><div className="mt-4 flex flex-wrap gap-2 sm:mt-0"><Link to="/customer/vehicles" className="rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#E85D00]">Browse vehicles</Link><Link to="/customer/profile" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Update profile</Link></div></section>
  </>;
}

export function CustomerVehicleDetails() {
  const { vehicleId } = useParams();
  const { data: vehicle, loading, error, reload } = useRequest(() => customerApi.vehicle(vehicleId), [vehicleId]);
  const [selectedPhoto, setSelectedPhoto] = useState({ vehicleId: null, index: 0 });
  const [failedPhotos, setFailedPhotos] = useState(() => new Set());
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} retry={reload} />;
  if (!vehicle) return <ErrorState message="Vehicle details are not available." />;

  const read = (camel, snake = camel.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)) =>
    vehicle[camel] ?? vehicle[camel.toLowerCase()] ?? vehicle[snake];
  const photoPaths = Array.isArray(vehicle.photos) ? vehicle.photos : [];
  const photoUrls = [...new Set(photoPaths.map((photo) => typeof photo === 'string' ? photo : photo?.url).filter(Boolean))];
  if (!photoUrls.length && read('imageUrl')) photoUrls.push(read('imageUrl'));
  const images = photoUrls.map((url) => new URL(url, import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').toString());
  const selectedPhotoIndex = selectedPhoto.vehicleId === vehicleId ? selectedPhoto.index : 0;
  const currentPhoto = images[selectedPhotoIndex] || images[0];
  const title = vehicle.title || vehicle.name || [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Vehicle';
  const dailyRate = read('dailyRate') ?? read('pricePerDay') ?? 0;
  const hourlyRate = read('hourlyRate');
  const withDriverRate = read('withDriverRate');
  const status = String(read('availabilityStatus') || 'UNAVAILABLE').toUpperCase();
  const operationalStatus = String(read('operationalStatus') || 'AVAILABLE').toUpperCase();
  const canBook = status === 'AVAILABLE' && operationalStatus !== 'INACTIVE';
  const availableNow = read('isAvailableNow');
  const availabilityText = availableNow
    ? 'Available now'
    : canBook ? 'Check dates for availability' : 'Not accepting bookings';
  const featureValue = vehicle.features;
  const features = (Array.isArray(featureValue) ? featureValue : String(featureValue || '').split(/[,;\n]/))
    .map((feature) => String(feature).trim()).filter(Boolean);
  const specifications = [
    { label: 'Model year', value: read('modelYear'), icon: CalendarDays },
    { label: 'Fuel type', value: read('fuelType'), icon: Fuel },
    { label: 'Transmission', value: read('transmission'), icon: Settings2 },
    { label: 'Seating capacity', value: read('seatingCapacity') ? `${read('seatingCapacity')} seats` : null, icon: Users },
    { label: 'Mileage', value: read('mileage') ? `${read('mileage')} km/l` : null, icon: Gauge },
    { label: 'Color', value: read('color'), icon: CarFront },
  ].filter((item) => item.value);
  const rentalConditions = [
    { label: 'Rental mode', value: [
      read('withoutDriverAvailable') !== false ? 'Self-drive' : null,
      read('withDriverAvailable') ? 'With driver' : null,
    ].filter(Boolean).join(' · ') || null },
    { label: 'Security deposit', value: read('securityDeposit') != null ? money(read('securityDeposit')) : null },
    { label: 'Daily distance limit', value: read('kmLimitPerDay') ? `${read('kmLimitPerDay')} km per day` : null },
    { label: 'Extra distance charge', value: read('extraKmCharge') != null ? `${money(read('extraKmCharge'))} / km` : null },
    { label: 'Hourly rate', value: hourlyRate != null ? `${money(hourlyRate)} / hour` : null },
    { label: 'Driver rate', value: withDriverRate != null ? `${money(withDriverRate)} / day` : null },
  ].filter((condition) => condition.value);
  const stepPhoto = (direction) => {
    setSelectedPhoto({ vehicleId, index: (selectedPhotoIndex + direction + images.length) % images.length });
  };
  const choosePhoto = (index) => setSelectedPhoto({ vehicleId, index });
  const location = [vehicle.city, vehicle.location].filter(Boolean).join(', ');

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/customer/vehicles" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#B54700]"><ArrowRight className="rotate-180" size={16} />Back to vehicles</Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#C64D00]">{vehicle.category || 'Vehicle'}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${availableNow ? 'bg-emerald-50 text-emerald-700' : canBook ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${availableNow ? 'bg-emerald-500' : canBook ? 'bg-amber-500' : 'bg-slate-400'}`} />{availabilityText}</span>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><MapPin size={16} className="text-[#E85D00]" />{location || 'Location not listed'}</p>
        </div>
        {Number(vehicle.rating) > 0 && <span className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700"><Star size={16} fill="currentColor" />{Number(vehicle.rating).toFixed(1)} rating</span>}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]">
        <section className="min-w-0">
          <div className="relative flex aspect-[16/10] min-h-64 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-100 via-orange-50 to-orange-100 text-[#E85D00] shadow-sm sm:aspect-[16/9] lg:aspect-[1.55/1]">
            {currentPhoto && !failedPhotos.has(currentPhoto)
              ? <img key={currentPhoto} src={currentPhoto} alt={`${title} photo ${selectedPhotoIndex + 1}`} className="absolute inset-0 h-full w-full object-cover" onError={() => setFailedPhotos((current) => new Set([...current, currentPhoto]))} />
              : <div className="flex flex-col items-center gap-3 text-slate-400"><CarFront size={76} strokeWidth={1.1} /><span className="text-sm">Vehicle photos unavailable</span></div>}
            <span className="absolute bottom-4 left-4 rounded-full bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">{images.length ? `${selectedPhotoIndex + 1} / ${images.length}` : 'Vehicle photos'}</span>
            {images.length > 1 && <>
              <button type="button" onClick={() => stepPhoto(-1)} aria-label="Previous vehicle photo" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow transition hover:bg-white"><ChevronLeft size={22} /></button>
              <button type="button" onClick={() => stepPhoto(1)} aria-label="Next vehicle photo" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow transition hover:bg-white"><ChevronRight size={22} /></button>
            </>}
          </div>
          {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-1" aria-label="Vehicle photo gallery">
            {images.map((image, index) => <button key={image} type="button" onClick={() => choosePhoto(index)} aria-label={`Show vehicle photo ${index + 1}`} aria-pressed={selectedPhotoIndex === index} className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-24 sm:w-36 ${selectedPhotoIndex === index ? 'border-[#FF6B00] ring-2 ring-orange-100' : 'border-transparent opacity-75 hover:opacity-100'}`}>
              {!failedPhotos.has(image) ? <img src={image} alt="" className="h-full w-full object-cover" onError={() => setFailedPhotos((current) => new Set([...current, image]))} /> : <span className="flex h-full items-center justify-center bg-slate-100 text-slate-400"><CarFront size={24} /></span>}
            </button>)}
          </div>}
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-extrabold text-slate-900">About this vehicle</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{vehicle.description || 'The vendor has not added a vehicle description yet.'}</p>
            {features.length > 0 && <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-900">Features</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">{features.map((feature) => <li key={feature} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-700"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" />{feature}</li>)}</ul>
            </div>}
          </div>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Rental price</p>
            <div className="mt-2 flex items-baseline gap-2"><strong className="text-3xl font-black tracking-tight text-slate-900">{money(dailyRate)}</strong><span className="text-sm text-slate-500">/ day</span></div>
            {withDriverRate != null && <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-600">With driver</span><strong className="text-slate-900">{money(withDriverRate)} <span className="font-normal text-slate-500">/ day</span></strong></div>}
            {canBook
              ? <Link to={`/booking?vehicleId=${vehicle.id}`} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E85D00]">Choose dates <ArrowRight size={17} /></Link>
              : <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3.5 text-center text-sm font-semibold text-slate-500">This vehicle is not accepting bookings.</p>}
            {canBook && <p className="mt-3 text-center text-xs leading-5 text-slate-500">The vendor confirms your booking before payment is enabled.</p>}
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><Gauge size={18} className="text-[#E85D00]" />Specifications</h2>
            {specifications.length
              ? <dl className="mt-4 grid grid-cols-2 gap-3">{specifications.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl bg-slate-50 p-3"><dt className="flex items-center gap-1.5 text-xs text-slate-500"><Icon size={14} />{label}</dt><dd className="mt-1.5 break-words text-sm font-bold text-slate-800">{value}</dd></div>)}</dl>
              : <p className="mt-3 text-sm text-slate-500">Vehicle specifications have not been provided.</p>}
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><ShieldCheck size={18} className="text-emerald-600" />Rental conditions</h2>
            {rentalConditions.length
              ? <dl className="mt-4 divide-y divide-slate-100">{rentalConditions.map(({ label, value }) => <div key={label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"><dt className="text-sm text-slate-500">{label}</dt><dd className="text-right text-sm font-semibold text-slate-800">{value}</dd></div>)}</dl>
              : <p className="mt-3 text-sm leading-6 text-slate-500">Rental options and conditions will be confirmed by the vendor.</p>}
            {read('pickupLocation') && <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600"><MapPin size={16} className="mt-0.5 shrink-0 text-[#E85D00]" />Pickup: {read('pickupLocation')}</p>}
            <p className="mt-4 text-xs leading-5 text-slate-400">Please confirm pickup, return, and any additional conditions with the vendor before your trip.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function CustomerBookings({ mode = 'all' }) {
  const request = mode === 'active' ? customerApi.activeRentals : mode === 'history' ? customerApi.bookingHistory : customerApi.bookings;
  const { data, loading, error, reload } = useRequest(request, [mode]);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [actionId, setActionId] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const title = mode === 'active' ? 'Active Rentals' : mode === 'history' ? 'Booking History' : 'My Bookings';

  const payBooking = async (booking) => {
    setActionId(booking.id);
    try {
      const { data: order } = await paymentApi.createOrder({ bookingId: booking.id });
      await openRazorpayCheckout(order, {
        name: user?.name,
        email: user?.email,
        onSuccess: async (payment) => {
          try {
            await paymentApi.verify({
              bookingId: booking.id,
              razorpayOrderId: payment.razorpay_order_id,
              razorpayPaymentId: payment.razorpay_payment_id,
              razorpaySignature: payment.razorpay_signature,
            });
            toast.success(`Payment received for booking #${booking.id}.`);
            await reload();
          } catch (paymentError) {
            toast.error(paymentError?.response?.data?.message || 'Payment verification failed. Contact support before retrying.');
          } finally {
            setActionId(null);
          }
        },
        onFailure: (message) => {
          toast.error(message);
          setActionId(null);
        },
        onDismiss: () => setActionId(null),
      });
    } catch (paymentError) {
      toast.error(paymentError?.response?.data?.message || paymentError?.message || 'Could not start payment.');
      setActionId(null);
    }
  };

  const cancelBooking = async (booking) => {
    if (!window.confirm(`Cancel booking #${booking.id}?`)) return;
    setActionId(booking.id);
    try {
      await bookingApi.updateStatus(booking.id, 'CANCELLED');
      toast.success(`Booking #${booking.id} was cancelled.`);
      await reload();
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || 'Could not cancel this booking.');
    } finally {
      setActionId(null);
    }
  };

  const requestSupport = async (booking, requestType) => {
    setActionId(booking.id);
    try {
      await customerApi.createSupportTicket({
        subject: `${requestType} for booking #${booking.id}`,
        message: `Please review my ${requestType.toLowerCase()} for booking #${booking.id}.`,
      });
      toast.success('Your request was sent. SmartRide Support will follow up.');
      navigate('/customer/support');
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || 'Could not submit the refund request.');
    } finally {
      setActionId(null);
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewSaving(true);
    try {
      await customerApi.reviewBooking(reviewTarget.id, {
        rating: reviewTarget.rating,
        comment: reviewTarget.comment,
      });
      toast.success('Thanks for sharing your experience.');
      setReviewTarget(null);
      await reload();
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || 'Could not save your review.');
    } finally {
      setReviewSaving(false);
    }
  };

  if (loading) return <Loading />;
  return <>
    <PageTitle eyebrow="Reservations" title={title} text="Track vendor confirmation, secure payment, pickup and return status for every trip." />
    {error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <BookingRows bookings={[]} /> : (
      <div className="space-y-4">
        {data.map((booking) => {
          const status = String(booking.status || '').toUpperCase();
          const paid = ['PAID', 'SUCCESS', 'SUCCEEDED', 'COMPLETED'].includes(String(booking.paymentStatus || '').toUpperCase());
          const canCancel = ['PENDING', 'CONFIRMED'].includes(status) && !paid && !booking.paymentOrderOpen;
          const canReview = ['COMPLETED', 'RETURNED'].includes(status) && !booking.reviewed;
          return (
            <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-900">{booking.vehicleName || 'Vehicle rental'}</h2>
                    <StatusPill status={status} />
                    {paid && <StatusPill status="PAID" />}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Booking #{booking.id} · {booking.bookingType?.replaceAll('_', ' ') || 'Rental'}</p>
                  <p className="mt-3 text-sm text-slate-600">{dateText(booking.pickupDate)} → {dateText(booking.returnDate)}</p>
                  <p className="mt-1 text-sm text-slate-500">{booking.pickupLocation || 'Pickup location not set'} → {booking.returnLocation || 'Return location not set'}</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{money(booking.amount)}</p>
                  {status === 'PENDING' && <p className="mt-2 text-xs text-amber-700">Waiting for the vendor to confirm. Payment opens after confirmation.</p>}
                  {paid && status === 'CONFIRMED' && <p className="mt-2 text-xs text-emerald-700">Paid securely. Pickup details will be shared before your trip.</p>}
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {status === 'CONFIRMED' && !paid && (
                    <button disabled={actionId === booking.id} onClick={() => payBooking(booking)} className="rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                      {actionId === booking.id ? 'Opening payment…' : 'Pay securely'}
                    </button>
                  )}
                  {canCancel && (
                    <button disabled={actionId === booking.id} onClick={() => cancelBooking(booking)} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                      Cancel booking
                    </button>
                  )}
                  {paid && status === 'CONFIRMED' && (
                    <button disabled={actionId === booking.id} onClick={() => requestSupport(booking, 'Refund review')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                      Request refund review
                    </button>
                  )}
                  {booking.paymentOrderOpen && (
                    <button disabled={actionId === booking.id} onClick={() => requestSupport(booking, 'Cancellation review')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                      Contact support
                    </button>
                  )}
                  {canReview && (
                    <button onClick={() => setReviewTarget({ id: booking.id, rating: 5, comment: '' })} className="inline-flex items-center gap-2 rounded-xl border border-orange-200 px-4 py-2.5 text-sm font-semibold text-[#B54700] hover:bg-orange-50">
                      <Star size={16} /> Leave a review
                    </button>
                  )}
                  {booking.reviewed && <span className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">Review submitted</span>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    )}
    {reviewTarget && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
        <form onSubmit={submitReview} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-wider text-[#D95400]">Booking #{reviewTarget.id}</p><h2 className="mt-1 text-xl font-extrabold">How was your trip?</h2></div>
            <button type="button" onClick={() => setReviewTarget(null)} aria-label="Close review form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button>
          </div>
          <div className="mt-5 flex gap-1" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button key={rating} type="button" aria-label={`${rating} star${rating > 1 ? 's' : ''}`} onClick={() => setReviewTarget((current) => ({ ...current, rating }))} className="rounded-lg p-1 text-amber-400">
                <Star size={28} fill={rating <= reviewTarget.rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Tell us more (optional)
            <textarea maxLength={2000} rows={4} value={reviewTarget.comment} onChange={(event) => setReviewTarget((current) => ({ ...current, comment: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-[#FF6B00]" />
          </label>
          <button disabled={reviewSaving} className="mt-5 w-full rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{reviewSaving ? 'Submitting…' : 'Submit review'}</button>
        </form>
      </div>
    )}
  </>;
}

export function CustomerVehicles() {
  return <BrowseVehicles customerMode />;
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
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const values = form || { firstName: data?.firstName || '', lastName: data?.lastName || '', phone: data?.phone || '' };
  const save = async (event) => { event.preventDefault(); setSaving(true); setMessage(''); try { const response = await customerApi.updateProfile(values); setUser({ name: response.data.fullName, role: response.data.role, email: response.data.email }); setMessage('Profile updated.'); toast.success('Your profile was updated.'); await reload(); } catch (e) { const text = e?.response?.data?.message || 'Could not update profile.'; setMessage(text); toast.error(text); } finally { setSaving(false); } };
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Account" title="My Profile" text="Manage the contact details on your customer account." />{error ? <ErrorState message={error} retry={reload} /> : <form onSubmit={save} className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-center gap-4 border-b border-slate-100 pb-5"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[#D95400]"><UserRound size={24} /></span><div><h2 className="font-bold">{data.fullName}</h2><p className="text-sm text-slate-500">{data.email}</p></div></div>{[['firstName','First name'],['lastName','Last name'],['phone','Phone']].map(([key,label])=><label key={key} className="block text-sm font-semibold text-slate-700">{label}<input required={key!=='phone'} value={values[key]} onChange={(e)=>setForm((v)=>({...((v) || values),[key]:e.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-[#FF6B00]" /></label>)}<p className="text-sm text-slate-500">Email address cannot be changed here.</p>{message && <p className="text-sm font-medium text-emerald-700">{message}</p>}<button disabled={saving} className="rounded-xl bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving?'Saving…':'Save changes'}</button></form>}</>;
}

export function CustomerKyc() {
  const { data, loading, error, reload } = useRequest(customerApi.kyc);
  const toast = useToast();
  const [documentType, setDocumentType] = useState('PASSPORT');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setMessageError(false);
    try {
      const payload = new FormData();
      payload.append('application', new Blob([JSON.stringify({ documentType, documentNumber })], { type: 'application/json' }));
      if (documentFile) payload.append('document', documentFile);
      await customerApi.submitKyc(payload);
      setDocumentNumber('');
      setDocumentFile(null);
      setMessage('Verification details submitted for review.');
      toast.success('Verification details sent for review.');
      await reload();
    } catch (e) {
      const text = e?.response?.data?.message || 'Could not submit verification details.';
      setMessage(text);
      setMessageError(true);
      toast.error(text);
    } finally { setSaving(false); }
  };
  if (loading) return <Loading />;
  const record = data?.[0];
  return <><PageTitle eyebrow="Account verification" title="KYC Verification" text="Submit identity details and an optional verification document. The document number is masked; private uploads can be accessed by authorized administrators only." />{error ? <ErrorState message={error} retry={reload} /> : <div className="max-w-2xl space-y-5">{record && <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Verification request</h2><p className="mt-1 text-sm text-slate-500">{record.documenttype || record.documentType} ending {record.documentlastfour || record.documentLastFour}</p><p className="mt-1 text-xs text-slate-500">{record.documentoriginalname || record.documentOriginalName || 'No file attached'}</p></div><StatusPill status={record.status} /></div></div>}<form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><label className="block text-sm font-semibold">Document type<select value={documentType} onChange={(e)=>setDocumentType(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="PASSPORT">Passport</option><option value="DRIVING_LICENSE">Driving licence</option><option value="NATIONAL_ID">National ID</option></select></label><label className="block text-sm font-semibold">Document number<input required minLength={4} maxLength={32} value={documentNumber} onChange={(e)=>setDocumentNumber(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label><label className="block text-sm font-semibold">Identity document file (optional)<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (!['application/pdf','image/png','image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) { setMessage('Upload a PDF, PNG, or JPG file no larger than 5 MB.'); setMessageError(true); setDocumentFile(null); event.target.value = ''; return; } setMessage(''); setMessageError(false); setDocumentFile(file); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:font-semibold file:text-[#B54700]" />{documentFile && <span className="mt-1 block truncate text-xs text-emerald-700">{documentFile.name}</span>}</label>{message && <p className={`text-sm font-medium ${messageError ? 'text-red-700' : 'text-emerald-700'}`}>{message}</p>}<button disabled={saving} className="rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving?'Submitting…':'Submit for verification'}</button></form></div>}</>;
}

export function CustomerNotifications() {
  const { data, loading, error, reload } = useRequest(customerApi.notifications);
  const toast = useToast();
  const markRead = async (id) => { try { await customerApi.markNotificationRead(id); await reload(); } catch (requestError) { toast.error(requestError?.response?.data?.message || 'Could not update the notification.'); } };
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Updates" title="Notifications" text="Booking and account updates for your customer profile." />{error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState icon={Bell} title="You’re all caught up" text="New customer notifications will appear here." /> : <div className="space-y-3">{data.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{dateText(item.createdat || item.createdAt)}</p></div>{!(item.read ?? item.is_read) && <button onClick={()=>markRead(item.id)} className="shrink-0 text-xs font-bold text-[#D95400]">Mark read</button>}</div></article>)}</div>}</>;
}

export function CustomerSupport() {
  const { data, loading, error, reload } = useRequest(customerApi.supportTickets);
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setNotice(''); try { await customerApi.createSupportTicket({ subject, message }); setSubject(''); setMessage(''); setNotice('Your support request was submitted.'); toast.success('Your support request was submitted.'); await reload(); } catch (e) { const text = e?.response?.data?.message || 'Could not submit your request.'; setNotice(text); toast.error(text); } finally { setSaving(false); } };
  if (loading) return <Loading />;
  return <><PageTitle eyebrow="Help center" title="Support" text="Send a support request and review your previous tickets." /><div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Create a support request</h2><label className="block text-sm font-semibold">Subject<input required maxLength={160} value={subject} onChange={(e)=>setSubject(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label><label className="block text-sm font-semibold">How can we help?<textarea required maxLength={3000} rows={5} value={message} onChange={(e)=>setMessage(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>{notice && <p className="text-sm text-emerald-700">{notice}</p>}<button disabled={saving} className="rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving?'Sending…':'Submit request'}</button></form><section><h2 className="mb-3 font-bold">Previous requests</h2>{error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState icon={CircleAlert} title="No support requests" text="Your submitted requests will be listed here." /> : <div className="space-y-3">{data.map((ticket)=><article key={ticket.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">{ticket.subject}</h3><StatusPill status={ticket.status} /></div><p className="mt-2 text-sm text-slate-600">{ticket.message}</p><p className="mt-2 text-xs text-slate-400">#{ticket.id} · {dateText(ticket.createdat || ticket.createdAt)}</p></article>)}</div>}</section></div></>;
}
