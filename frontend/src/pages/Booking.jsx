import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CarFront, CircleAlert, LoaderCircle, MapPin, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { bookingApi } from '../api/bookingApi';
import { customerApi } from '../api/customerApi';
import { useToast } from '../hooks/useToast';

function localDateTimeValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function rateFor(vehicle, bookingType) {
  const dailyRate = Number(vehicle?.dailyrate || vehicle?.daily_rate || 0);
  const withDriverRate = Number(vehicle?.withdriverrate || vehicle?.with_driver_rate || 0);
  return bookingType === 'WITH_DRIVER' && withDriverRate > 0 ? withDriverRate : dailyRate;
}

function currency(value) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const vehicleId = searchParams.get('vehicleId');
  const [vehicle, setVehicle] = useState(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [minimumPickupDate] = useState(() => localDateTimeValue(new Date()));
  const [pickupDate, setPickupDate] = useState(() => localDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [returnDate, setReturnDate] = useState(() => localDateTimeValue(new Date(Date.now() + 48 * 60 * 60 * 1000)));
  const [bookingType, setBookingType] = useState('WITHOUT_DRIVER');
  const [pickupLocation, setPickupLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');

  useEffect(() => {
    let active = true;
    if (!vehicleId) return () => { active = false; };
    customerApi.vehicle(vehicleId)
      .then(({ data }) => {
        if (active) {
          setVehicle(data);
          setPickupLocation(data.location || data.city || '');
          setReturnLocation(data.location || data.city || '');
          setLoadError('');
        }
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError?.response?.data?.message || 'This vehicle is not available for booking.');
      })
      .finally(() => {
        if (active) setLoadingVehicle(false);
      });
    return () => { active = false; };
  }, [vehicleId]);

  const estimate = useMemo(() => {
    if (!pickupDate || !returnDate || new Date(returnDate) <= new Date(pickupDate)) return 0;
    const seconds = (new Date(returnDate) - new Date(pickupDate)) / 1000;
    const days = Math.max(1, Math.ceil(seconds / 86400));
    return rateFor(vehicle, bookingType) * days;
  }, [bookingType, pickupDate, returnDate, vehicle]);

  const submit = async (event) => {
    event.preventDefault();
    if (new Date(pickupDate) <= new Date() || new Date(returnDate) <= new Date(pickupDate)) {
      toast.error('Choose a future pickup time and a return time after pickup.');
      return;
    }
    if (!pickupLocation.trim() || !returnLocation.trim()) {
      toast.error('Enter pickup and return locations.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await bookingApi.create({
        vehicleId: Number(vehicleId),
        bookingType,
        pickupDate,
        returnDate,
        pickupLocation,
        returnLocation,
      });
      toast.success(`Booking request #${data.id} sent to the vendor.`);
      navigate('/booking-success', { state: { booking: data } });
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || 'Could not create your booking. Please check availability and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!vehicleId) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <CircleAlert size={36} className="mx-auto text-amber-500" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Choose a vehicle first</h1>
        <p className="mt-2 text-sm text-slate-500">Browse the available vehicles and select one before choosing your trip dates.</p>
        <Link to="/customer/vehicles" className="mt-6 inline-flex rounded-xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white">Browse available vehicles</Link>
      </div>
    );
  }
  if (loadingVehicle) return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={20} />Loading vehicle…</div>;
  if (loadError || !vehicle) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <CircleAlert size={36} className="mx-auto text-amber-500" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Choose a vehicle first</h1>
        <p className="mt-2 text-sm text-slate-500">{loadError || 'Browse the vehicles currently available for rent.'}</p>
        <Link to="/customer/vehicles" className="mt-6 inline-flex rounded-xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white">Browse available vehicles</Link>
      </div>
    );
  }

  const vehicleName = vehicle.title || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Vehicle rental';

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/customer/vehicles" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#B54700]"><ArrowLeft size={16} />Back to vehicles</Link>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#D95400]">Plan your trip</p>
        <h1 className="mt-1 text-3xl font-black text-[#172033]">Request a booking</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">The vendor confirms availability first. You can then pay securely from My Bookings.</p>
      </div>

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <aside className="h-fit overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex h-44 items-center justify-center bg-gradient-to-br from-slate-100 via-orange-50 to-orange-100 text-[#E85D00]"><CarFront size={72} strokeWidth={1.3} /></div>
          <div className="p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#E85D00]">{vehicle.category || 'Available vehicle'}</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">{vehicleName}</h2>
            <p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin size={15} />{vehicle.city || vehicle.location || 'Pickup location to confirm'}</p>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">Estimated rental total</p>
              <p className="mt-1 text-3xl font-black text-slate-900">{currency(estimate)}</p>
              <p className="mt-1 text-xs text-slate-500">Final amount is calculated by the server from the vehicle rate and rental duration.</p>
            </div>
          </div>
        </aside>

        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900">
            <ShieldCheck size={19} className="mt-0.5 shrink-0" />
            <p>Have your driving licence available. If identity verification is required, submit it from <Link to="/customer/kyc" className="font-bold underline">KYC Verification</Link>.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Pickup date and time
              <span className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5"><CalendarDays size={16} className="text-slate-400" /><input required type="datetime-local" min={minimumPickupDate} value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} className="w-full font-normal outline-none" /></span>
            </label>
            <label className="text-sm font-semibold text-slate-700">Return date and time
              <span className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5"><CalendarDays size={16} className="text-slate-400" /><input required type="datetime-local" min={pickupDate} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} className="w-full font-normal outline-none" /></span>
            </label>
            <label className="text-sm font-semibold text-slate-700">Pickup location
              <input required maxLength={200} value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} placeholder="Enter pickup location" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-[#FF6B00]" />
            </label>
            <label className="text-sm font-semibold text-slate-700">Return location
              <input required maxLength={200} value={returnLocation} onChange={(event) => setReturnLocation(event.target.value)} placeholder="Enter return location" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-[#FF6B00]" />
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Booking type
              <select value={bookingType} onChange={(event) => setBookingType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-[#FF6B00]">
                <option value="WITHOUT_DRIVER">Self drive</option>
                <option value="WITH_DRIVER">With driver</option>
              </select>
            </label>
          </div>
          <button type="submit" disabled={submitting || estimate <= 0} className="w-full rounded-xl bg-[#FF6B00] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#E85D00] disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Sending booking request…' : 'Request this booking'}
          </button>
        </section>
      </form>
    </div>
  );
}
