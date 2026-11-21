import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CarFront, CircleAlert, LoaderCircle, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { vendorApi } from '../../api/vendorApi';

const read = (row, key) => row?.[key] ?? row?.[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const photoUrl = (value) => value
  ? new URL(value, import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').toString()
  : '';

function Status({ value }) {
  const status = String(value || 'UNKNOWN').replaceAll('_', ' ');
  const tone = /APPROVED|AVAILABLE/i.test(status) ? 'bg-emerald-50 text-emerald-700'
    : /REJECT|UNAVAILABLE/i.test(status) ? 'bg-red-50 text-red-700'
      : /PENDING/i.test(status) ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{status}</span>;
}

export default function VendorVehicles({ approvalsOnly = false }) {
  const { state } = useLocation();
  const [status, setStatus] = useState(approvalsOnly ? 'PENDING' : '');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await vendorApi.vehicles({ status, search });
      setRows(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not load your vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    vendorApi.vehicles({ status, search }).then(({ data }) => {
      if (active) setRows(Array.isArray(data) ? data : []);
    }).catch((requestError) => {
      if (active) setError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not load your vehicles.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [status, search]);

  const remove = async (vehicle) => {
    if (!window.confirm(`Delete "${read(vehicle, 'title')}"? Only vehicles without booking history can be deleted.`)) return;
    setError('');
    setMessage('');
    try {
      await vendorApi.deleteVehicle(read(vehicle, 'id'));
      setMessage('Vehicle deleted.');
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not delete this vehicle.');
    }
  };

  const toggleAvailability = async (vehicle, next) => {
    setError('');
    setMessage('');
    try {
      await vendorApi.setVehicleAvailability(read(vehicle, 'id'), next);
      setMessage('Vehicle availability updated.');
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not update vehicle availability.');
    }
  };

  const uploadPhotos = async (vehicle, files) => {
    if (!files.length) return;
    const invalid = files.find((file) => file.size > 5 * 1024 * 1024
      || !['image/jpeg', 'image/png'].includes(file.type));
    if (invalid) {
      setError('Vehicle photos must be JPG or PNG files, each 5 MB or smaller.');
      return;
    }
    const body = new FormData();
    files.forEach((file) => body.append('photos', file));
    setError('');
    setMessage('');
    try {
      await vendorApi.uploadVehicleMedia(read(vehicle, 'id'), body);
      setMessage('Vehicle photos uploaded to Cloudinary.');
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.detail
        || 'Could not upload vehicle photos. Check Cloudinary configuration and try again.');
    }
  };

  const emptyTitle = approvalsOnly && status === 'PENDING' ? 'No vehicles awaiting review' : 'No vehicles found';
  const emptyDescription = search || status
    ? 'Try another search or filter.'
    : approvalsOnly
      ? 'Submit a vehicle to track its review status here.'
      : 'Add a vehicle to start building your fleet.';

  return (
    <div>
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#D95400]">Vehicle management</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{approvalsOnly ? 'Vehicle approvals' : 'My vehicles'}</h1>
          <p className="mt-2 text-sm text-slate-500">{approvalsOnly
            ? 'Track the review status of vehicles submitted to SmartRide.'
            : 'Manage only vehicles associated with your vendor account.'}</p>
        </div>
        {!approvalsOnly && <Link to="/vendor/vehicles/add" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#E85D00]"><Plus size={17} />Add vehicle</Link>}
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:max-w-sm">
          <Search size={17} className="text-slate-400" />
          <input value={search} onChange={(event) => { setLoading(true); setSearch(event.target.value); }} placeholder="Search title, brand, or model" className="min-w-0 flex-1 text-sm outline-none" />
        </label>
        <select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">{approvalsOnly ? 'All approval statuses' : 'All vehicles'}</option>
          <option value="PENDING">{approvalsOnly ? 'Pending review' : 'Pending approval'}</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          {!approvalsOnly && <><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option></>}
        </select>
      </div>

      {state?.message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{state.message}</p>}
      {error && <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><CircleAlert size={17} />{error}</div>}
      {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}

      {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading vehicles…</div>
        : rows.length ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                {['Vehicle', 'Category', 'Year', 'City', 'Price / day', 'Approval', 'Availability', 'Actions'].map((title) => <th key={title} className="px-4 py-3 font-bold">{title}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((vehicle) => {
                  const approval = String(read(vehicle, 'approval_status') || 'PENDING').toUpperCase();
                  const availability = String(read(vehicle, 'availability_status') || 'UNAVAILABLE').toUpperCase();
                  const editable = approval === 'PENDING' || approval === 'REJECTED';
                  const image = photoUrl(read(vehicle, 'image_url'));
                  return <tr key={read(vehicle, 'id')} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-4"><div className="flex items-center gap-3"><span className="relative flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-orange-50 text-[#B54700]"><CarFront size={20} />{image && <img src={image} alt={`${read(vehicle, 'title')} photo`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}</span><div><p className="font-bold text-slate-900">{read(vehicle, 'title')}</p><p className="text-xs text-slate-500">{read(vehicle, 'brand')} {read(vehicle, 'model')}</p></div></div></td>
                    <td className="px-4 py-4 text-slate-600">{read(vehicle, 'category') || '—'}</td>
                    <td className="px-4 py-4 text-slate-600">{read(vehicle, 'year') || '—'}</td>
                    <td className="px-4 py-4 text-slate-600">{read(vehicle, 'city') || '—'}</td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{money(read(vehicle, 'daily_rate'))}</td>
                    <td className="px-4 py-4"><Status value={approval} />{read(vehicle, 'approval_reason') && <p className="mt-1 max-w-48 text-xs text-red-700">{read(vehicle, 'approval_reason')}</p>}</td>
                    <td className="px-4 py-4">{approval === 'APPROVED' ? <select aria-label={`Availability for ${read(vehicle, 'title')}`} value={availability} onChange={(event) => toggleAvailability(vehicle, event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option></select> : <Status value={availability} />}</td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2">
                      {!approvalsOnly && <label title="Upload or replace vehicle photos" className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"><Upload size={15} /><input type="file" accept="image/jpeg,image/png" multiple className="sr-only" aria-label={`Upload photos for ${read(vehicle, 'title')}`} onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ''; if (files.length > 6) setError('Select no more than 6 vehicle photos.'); else uploadPhotos(vehicle, files); }} /></label>}
                      {editable && <Link to={`/vendor/vehicles/edit/${read(vehicle, 'id')}`} aria-label={`Edit ${read(vehicle, 'title')}`} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"><Pencil size={15} /></Link>}
                      {editable && <button onClick={() => remove(vehicle)} aria-label={`Delete ${read(vehicle, 'title')}`} className="rounded-lg border border-slate-200 p-2 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>}
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><CarFront size={28} className="mx-auto text-slate-300" /><p className="mt-3 font-semibold text-slate-700">{emptyTitle}</p><p className="mt-1 text-sm text-slate-500">{emptyDescription}</p>{!search && (!approvalsOnly || !status) && <Link to="/vendor/vehicles/add" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-bold text-white hover:bg-[#E85D00]"><Plus size={16} />Add vehicle</Link>}</div>}
    </div>
  );
}
