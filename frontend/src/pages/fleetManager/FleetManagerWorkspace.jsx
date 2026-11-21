import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, CarFront, CircleAlert, ClipboardList, Download, LoaderCircle, Plus, Wrench } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { fleetManagerApi } from '../../api/fleetManagerApi';
import { useAuth } from '../../context/AuthContext';

const read = (row, key) => row?.[key] ?? row?.[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
const cash = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const when = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100';
const localInputTime = (offsetHours = 1) => {
  const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function useRemote(load, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((current) => current + 1);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    load().then((result) => { if (active) setData(result); })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.detail || requestError?.response?.data?.message || 'Could not load fleet records.');
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // The caller supplies dependency values matching the loader's captured state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  return { data, loading, error, reload, setError };
}

function Banner({ error, message, onRetry }) {
  return <>
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span className="flex items-center gap-2"><CircleAlert size={17} />{error}</span>{onRetry && <button onClick={onRetry} className="font-bold underline">Retry</button>}</div>}
    {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
  </>;
}

function Loading() {
  return <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading fleet data…</div>;
}

function Heading({ title, description, children }) {
  return <header className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
    <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#D95400]">Fleet operations</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">{title}</h1>{description && <p className="mt-2 text-sm text-slate-500">{description}</p>}</div>
    {children}
  </header>;
}

function Status({ value }) {
  const status = String(value || 'UNKNOWN').replaceAll('_', ' ');
  const tone = /AVAILABLE|APPROVED|COMPLETED|RESOLVED/i.test(status) ? 'bg-emerald-50 text-emerald-700'
    : /INACTIVE|CANCELLED|REJECTED|CRITICAL/i.test(status) ? 'bg-red-50 text-red-700'
      : /PENDING|SCHEDULED|OPEN|HIGH|ASSIGNED|ON RENT|UNDER MAINTENANCE|IN PROGRESS/i.test(status) ? 'bg-amber-50 text-amber-800'
        : 'bg-slate-100 text-slate-600';
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{status}</span>;
}

function DataTable({ rows, columns, actions, empty = 'No records are available in your authorized fleet.' }) {
  if (!rows?.length) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">{empty}</div>;
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(([key, label]) => <th key={key} className="px-4 py-3 font-bold">{label}</th>)}{actions && <th className="px-4 py-3 font-bold">Actions</th>}</tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={read(row, 'id') ?? read(row, 'bookingId') ?? index} className="align-top hover:bg-slate-50/70">
        {columns.map(([key]) => {
          const value = read(row, key);
          const cell = key === 'status' || key === 'operational_status' || key === 'availability' || key.endsWith('status')
            ? <Status value={value} />
            : key.toLowerCase().includes('date') || key.endsWith('at') || key === 'created_at'
              ? when(value)
              : ['estimated_cost', 'actual_cost', 'amount'].includes(key) ? cash(value) : String(value ?? '—');
          return <td key={key} className="px-4 py-3 text-slate-700">{cell}</td>;
        })}
        {actions && <td className="px-4 py-3">{actions(row)}</td>}
      </tr>)}</tbody>
    </table>
  </div>;
}

function useAction(reload) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const run = async (action, successMessage) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      reload?.();
      return true;
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || requestError?.response?.data?.message || 'Could not save this change.');
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { saving, error, message, setError, run };
}

function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useRemote(() => fleetManagerApi.dashboard().then((response) => response.data), []);
  if (loading) return <Loading />;
  const stats = [
    ['Total fleet vehicles', 'total_vehicles', CarFront],
    ['Available vehicles', 'available_vehicles', CarFront],
    ['Assigned vehicles', 'assigned_vehicles', ClipboardList],
    ['Vehicles on rent', 'vehicles_on_rent', CalendarDays],
    ['Under maintenance', 'vehicles_under_maintenance', Wrench],
    ['Available drivers', 'available_drivers', Activity],
    ['Assigned drivers', 'assigned_drivers', ClipboardList],
    ['Open maintenance requests', 'pending_maintenance_requests', Wrench],
  ];
  const monthly = data?.monthlyUtilization || [];
  const availability = data?.availabilityBreakdown || [];
  return <>
    <Banner error={error} onRetry={reload} />
    <section className="mb-6 flex flex-col justify-between gap-4 rounded-2xl bg-[#172033] p-6 text-white sm:flex-row sm:items-center sm:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-300">Fleet Manager workspace</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Welcome back, {user?.name || 'Fleet Manager'}!</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Monitor fleet operations, manage vehicle assignments, schedule maintenance, and track fleet performance.</p></div>
      <div className="flex flex-wrap gap-2"><Link to="/fleet-manager/vehicle-assignments" className="rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#E85D00]">Assign vehicle</Link><Link to="/fleet-manager/maintenance/schedule" className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Schedule service</Link><Link to="/fleet-manager/reports" className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Generate report</Link></div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, key, Icon]) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#B54700]"><Icon size={20} /></span><p className="mt-4 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{Number(read(data, key)) || 0}</p></article>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Monthly rental operations</h2>{monthly.length ? <div className="mt-5 flex h-44 items-end gap-3 overflow-x-auto border-b border-slate-100 pb-2">{monthly.map((item) => { const count = Number(read(item, 'rental_count')) || 0; const max = Math.max(...monthly.map((row) => Number(read(row, 'rental_count')) || 0), 1); return <div key={read(item, 'month')} className="flex h-full min-w-12 flex-1 flex-col items-center justify-end"><span className="text-xs text-slate-500">{count}</span><div className="mt-1 w-full rounded-t bg-[#FF6B00]" style={{ height: `${Math.max(count ? 5 : 0, count / max * 75)}%` }} /><span className="mt-2 text-[10px] text-slate-400">{read(item, 'month')}</span></div>; })}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No rental activity in the reporting period.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Vehicle availability</h2><div className="mt-4 space-y-3">{availability.length ? availability.map((row) => <div key={read(row, 'status')} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><Status value={read(row, 'status')} /><span className="font-extrabold">{Number(read(row, 'count')) || 0}</span></div>) : <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No vehicles have been granted to this account yet.</p>}</div></section>
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-3 font-bold">Recent assignments</h2><DataTable rows={data?.recentAssignments || []} columns={[[ 'vehicle_name', 'Vehicle' ], ['driver_name', 'Driver'], ['start_at', 'Start'], ['status', 'Status']]} empty="No assignments yet." /></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-3 font-bold">Upcoming maintenance</h2><DataTable rows={data?.upcomingMaintenance || []} columns={[[ 'vehicle_name', 'Vehicle' ], ['maintenance_type', 'Service'], ['scheduled_at', 'Scheduled']]} empty="No scheduled maintenance." /></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-3 font-bold">Active rentals</h2><DataTable rows={data?.activeRentals || []} columns={[[ 'booking_id', 'Booking' ], ['vehicle_name', 'Vehicle'], ['expected_return_date', 'Return']]} empty="No active rentals." /></section>
    </div>
    <p className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">Vehicle and driver access is limited to resources explicitly granted by an Administrator. Fleet Managers cannot change vendor pricing or approval decisions.</p>
  </>;
}

function VehiclePage({ availabilityOnly = false }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const loader = () => (availabilityOnly
    ? fleetManagerApi.availability({ status })
    : fleetManagerApi.vehicles({ search, status })).then((response) => response.data);
  const { data, loading, error, reload } = useRemote(loader, [search, status, availabilityOnly]);
  const action = useAction(reload);
  const rows = Array.isArray(data) ? data : [];
  const updateStatus = async (row, next) => {
    if (!window.confirm(`Set ${read(row, 'vehicle_name')} to ${next.toLowerCase()}?`)) return;
    await action.run(() => fleetManagerApi.setOperationalStatus(read(row, 'id'), next), 'Vehicle operational status updated.');
  };
  return <>
    <Heading title={availabilityOnly ? 'Vehicle availability' : 'Vehicle management'} description="Approved vehicles explicitly granted to your account. Vendor ownership, pricing, and admin approval remain unchanged.">
      <div className="flex gap-2">
        {!availabilityOnly && <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicle or registration" className={`${input} sm:w-64`} />}
        <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${input} sm:w-48`}><option value="">All statuses</option>{['AVAILABLE', 'ASSIGNED', 'ON_RENT', 'UNDER_MAINTENANCE', 'INACTIVE'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select>
      </div>
    </Heading>
    <Banner error={error || action.error} message={action.message} onRetry={reload} />
    {loading ? <Loading /> : <DataTable rows={rows} columns={[[ 'vehicle_name', 'Vehicle' ], ['brand', 'Brand'], ['model', 'Model'], ['registration_number', 'Registration'], ['category', 'Category'], ['vendor_name', 'Vendor'], ['assigned_driver', 'Assigned driver'], ['operational_status', 'Operational status']]}
      actions={(row) => <select aria-label={`Set status for ${read(row, 'vehicle_name')}`} value={read(row, 'operational_status') || 'INACTIVE'} disabled={action.saving} onChange={(event) => updateStatus(row, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="AVAILABLE">Available</option><option value="INACTIVE">Inactive</option><option value="ASSIGNED" disabled>Assigned (automatic)</option><option value="ON_RENT" disabled>On rent (automatic)</option><option value="UNDER_MAINTENANCE" disabled>Under maintenance (automatic)</option></select>} empty="No vehicles are currently granted to this Fleet Manager." />}
  </>;
}

function AssignmentPage() {
  const { data: vehiclesData } = useRemote(() => fleetManagerApi.vehicles().then((response) => response.data), []);
  const { data: driversData } = useRemote(() => fleetManagerApi.drivers().then((response) => response.data), []);
  const { data, loading, error, reload } = useRemote(() => fleetManagerApi.assignments().then((response) => response.data), []);
  const action = useAction(reload);
  const [form, setForm] = useState({ vehicleId: '', driverId: '', startAt: localInputTime(1), endAt: localInputTime(25), location: '', purpose: 'Fleet operations', notes: '' });
  const vehicles = (Array.isArray(vehiclesData) ? vehiclesData : []).filter((vehicle) => read(vehicle, 'approval_status') === 'APPROVED' && read(vehicle, 'availability_status') === 'AVAILABLE' && !['INACTIVE', 'UNDER_MAINTENANCE'].includes(read(vehicle, 'operational_status')));
  const drivers = (Array.isArray(driversData) ? driversData : []).filter((driver) => read(driver, 'account_status') === 'APPROVED' && read(driver, 'availability') === 'AVAILABLE');
  const submit = async (event) => {
    event.preventDefault();
    const saved = await action.run(() => fleetManagerApi.createAssignment({
      ...form, vehicleId: Number(form.vehicleId), driverId: Number(form.driverId),
      startAt: form.startAt, endAt: form.endAt || null,
    }), 'Vehicle and driver assigned.');
    if (saved) setForm((value) => ({ ...value, vehicleId: '', driverId: '', notes: '' }));
  };
  const statusAction = (row, status) => action.run(() => fleetManagerApi.updateAssignmentStatus(read(row, 'id'), status), `Assignment ${status.toLowerCase()}.`);
  return <>
    <Heading title="Vehicle assignments" description="Assign only vehicles and approved drivers in your Admin-granted scope." />
    <Banner error={error || action.error} message={action.message} onRetry={reload} />
    <form onSubmit={submit} className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-semibold">Vehicle<select required value={form.vehicleId} onChange={(event) => setForm((v) => ({ ...v, vehicleId: event.target.value }))} className={`${input} mt-1.5`}><option value="">Choose vehicle</option>{vehicles.map((row) => <option key={read(row, 'id')} value={read(row, 'id')}>{read(row, 'vehicle_name')} · {read(row, 'registration_number')}</option>)}</select></label>
      <label className="text-sm font-semibold">Approved driver<select required value={form.driverId} onChange={(event) => setForm((v) => ({ ...v, driverId: event.target.value }))} className={`${input} mt-1.5`}><option value="">Choose driver</option>{drivers.map((row) => <option key={read(row, 'id')} value={read(row, 'id')}>{read(row, 'name')}</option>)}</select></label>
      <label className="text-sm font-semibold">Start time<input required type="datetime-local" value={form.startAt} onChange={(event) => setForm((v) => ({ ...v, startAt: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <label className="text-sm font-semibold">End time (optional)<input type="datetime-local" min={form.startAt} value={form.endAt} onChange={(event) => setForm((v) => ({ ...v, endAt: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <label className="text-sm font-semibold">Operating location<input required maxLength={200} value={form.location} onChange={(event) => setForm((v) => ({ ...v, location: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <label className="text-sm font-semibold">Purpose<input required maxLength={300} value={form.purpose} onChange={(event) => setForm((v) => ({ ...v, purpose: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <label className="text-sm font-semibold md:col-span-2">Notes<input maxLength={2000} value={form.notes} onChange={(event) => setForm((v) => ({ ...v, notes: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <div className="md:col-span-2 xl:col-span-4"><button disabled={action.saving || !vehicles.length || !drivers.length} className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#E85D00] disabled:opacity-50"><Plus size={16} />{action.saving ? 'Saving…' : 'Create assignment'}</button></div>
    </form>
    {loading ? <Loading /> : <DataTable rows={Array.isArray(data) ? data : []} columns={[[ 'id', 'Assignment' ], ['vehicle_name', 'Vehicle'], ['driver_name', 'Driver'], ['start_at', 'Start'], ['end_at', 'End'], ['location', 'Location'], ['purpose', 'Purpose'], ['status', 'Status']]}
      actions={(row) => <div className="flex gap-2">{read(row, 'status') === 'ASSIGNED' && <button onClick={() => statusAction(row, 'IN_PROGRESS')} className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-[#B54700]">Start</button>}{['ASSIGNED', 'IN_PROGRESS'].includes(read(row, 'status')) && <button onClick={() => statusAction(row, 'COMPLETED')} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">Complete</button>}{['ASSIGNED', 'IN_PROGRESS'].includes(read(row, 'status')) && <button onClick={() => statusAction(row, 'CANCELLED')} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700">Cancel</button>}</div>} />}
  </>;
}

function DriversPage() {
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useRemote(() => fleetManagerApi.drivers({ search }).then((response) => response.data), [search]);
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState('');
  const showHistory = async (driver) => {
    setHistoryError('');
    try {
      const { data: rows } = await fleetManagerApi.driverAssignments(read(driver, 'id'));
      setHistory({ driver, rows });
    } catch (requestError) {
      setHistoryError(requestError?.response?.data?.detail || 'Could not load this driver assignment history.');
    }
  };
  return <>
    <Heading title="Driver management" description="View approved drivers explicitly granted to your account. Driver approval and account status are controlled by Admins.">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search driver name or email" className={`${input} sm:w-72`} />
    </Heading>
    <Banner error={error || historyError} onRetry={reload} />
    {loading ? <Loading /> : <DataTable rows={Array.isArray(data) ? data : []} columns={[[ 'name', 'Driver' ], ['email', 'Email'], ['phone', 'Phone'], ['license_expiry_date', 'License expiry'], ['availability', 'Availability'], ['current_vehicle', 'Current vehicle'], ['account_status', 'Account status']]}
      actions={(row) => <button onClick={() => showHistory(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold hover:bg-slate-50">Assignment history</button>} />}
    {history && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4"><section className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{read(history.driver, 'name')} · Assignment history</h2><button onClick={() => setHistory(null)} className="rounded-lg border px-3 py-1.5 text-sm">Close</button></div><DataTable rows={history.rows} columns={[[ 'vehicle_name', 'Vehicle' ], ['start_at', 'Start'], ['end_at', 'End'], ['purpose', 'Purpose'], ['status', 'Status']]} /></section></div>}
  </>;
}

function ActiveRentals() {
  const { data, loading, error, reload } = useRemote(() => fleetManagerApi.activeRentals().then((response) => response.data), []);
  const [issueRental, setIssueRental] = useState(null);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const action = useAction(reload);
  const submitIssue = async (event) => {
    event.preventDefault();
    const result = await action.run(() => fleetManagerApi.reportRentalIssue(read(issueRental, 'booking_id'), {
      vehicleId: read(issueRental, 'vehicle_id'), description, priority,
    }), 'Issue reported to maintenance.');
    if (result) { setIssueRental(null); setDescription(''); }
  };
  return <>
    <Heading title="Active rentals" description="Rental records for vehicles in your authorized fleet. No GPS location is available." />
    <Banner error={error || action.error} message={action.message} onRetry={reload} />
    {loading ? <Loading /> : <DataTable rows={Array.isArray(data) ? data : []} columns={[[ 'booking_id', 'Booking' ], ['vehicle_name', 'Vehicle'], ['driver_name', 'Driver'], ['customer_name', 'Customer'], ['rental_start_date', 'Start'], ['expected_return_date', 'Expected return'], ['pickup_location', 'Pickup'], ['return_location', 'Return'], ['rental_status', 'Status']]}
      actions={(row) => <button onClick={() => setIssueRental(row)} className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#B54700]">Report issue</button>} />}
    {issueRental && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={submitIssue} className="w-full max-w-md rounded-2xl bg-white p-6"><h2 className="text-lg font-bold">Report issue · Booking #{read(issueRental, 'booking_id')}</h2><label className="mt-4 block text-sm font-semibold">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)} className={`${input} mt-1`}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label><label className="mt-4 block text-sm font-semibold">Issue description<textarea required maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className={`${input} mt-1`} /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setIssueRental(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={action.saving} className="rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-bold text-white">Submit issue</button></div></form></div>}
  </>;
}

function MaintenancePage({ mode }) {
  const [status, setStatus] = useState(mode === 'history' ? 'COMPLETED' : mode === 'requests' ? 'OPEN' : '');
  const endpoint = mode === 'requests'
    ? () => fleetManagerApi.maintenanceRequests({ status }).then((response) => response.data)
    : () => fleetManagerApi.maintenance({ status }).then((response) => response.data);
  const { data, loading, error, reload } = useRemote(endpoint, [status, mode]);
  const { data: vehicleData } = useRemote(() => fleetManagerApi.vehicles().then((response) => response.data), []);
  const action = useAction(reload);
  const [form, setForm] = useState({ vehicleId: '', maintenanceType: 'REGULAR_SERVICE', description: '', scheduledAt: localInputTime(24), serviceProvider: '', estimatedCost: '', notes: '' });
  const [requestForm, setRequestForm] = useState({ vehicleId: '', description: '', priority: 'MEDIUM' });
  const vehicles = Array.isArray(vehicleData) ? vehicleData : [];
  const submitSchedule = async (event) => {
    event.preventDefault();
    const saved = await action.run(() => fleetManagerApi.createMaintenance({
      ...form, vehicleId: Number(form.vehicleId), estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null,
    }), 'Maintenance scheduled; vehicle is unavailable until resolved.');
    if (saved) setForm((value) => ({ ...value, vehicleId: '', description: '', notes: '' }));
  };
  const submitRequest = async (event) => {
    event.preventDefault();
    const saved = await action.run(() => fleetManagerApi.createMaintenanceRequest({
      ...requestForm, vehicleId: Number(requestForm.vehicleId),
    }), 'Maintenance request created.');
    if (saved) setRequestForm({ vehicleId: '', description: '', priority: 'MEDIUM' });
  };
  const updateRecord = (row, next) => action.run(() => mode === 'requests'
    ? fleetManagerApi.updateMaintenanceRequest(read(row, 'id'), { status: next })
    : fleetManagerApi.updateMaintenanceStatus(read(row, 'id'), { status: next }), `Status updated to ${next.toLowerCase()}.`);
  const title = mode === 'schedule' ? 'Maintenance schedule' : mode === 'requests' ? 'Maintenance requests' : 'Maintenance history';
  const rows = Array.isArray(data) ? data : [];
  return <>
    <Heading title={title} description="Maintenance records are scoped to vehicles granted to your Fleet Manager account. Scheduled and in-progress service blocks new assignments and rentals.">
      <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${input} sm:w-52`}><option value="">All statuses</option>{(mode === 'requests' ? ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'] : ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).map((item) => <option key={item}>{item}</option>)}</select>
    </Heading>
    <Banner error={error || action.error} message={action.message} onRetry={reload} />
    {mode === 'schedule' && <form onSubmit={submitSchedule} className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-semibold">Vehicle<select required value={form.vehicleId} onChange={(event) => setForm((v) => ({ ...v, vehicleId: event.target.value }))} className={`${input} mt-1.5`}><option value="">Choose vehicle</option>{vehicles.map((row) => <option key={read(row, 'id')} value={read(row, 'id')}>{read(row, 'vehicle_name')} · {read(row, 'registration_number')}</option>)}</select></label>
      <label className="text-sm font-semibold">Maintenance type<select value={form.maintenanceType} onChange={(event) => setForm((v) => ({ ...v, maintenanceType: event.target.value }))} className={`${input} mt-1.5`}>{[['REGULAR_SERVICE','Regular Service'],['OIL_CHANGE','Oil Change'],['BRAKE_INSPECTION','Brake Inspection'],['TIRE_REPLACEMENT','Tire Replacement'],['ENGINE_REPAIR','Engine Repair'],['ELECTRICAL_REPAIR','Electrical Repair'],['INSURANCE_RENEWAL','Insurance Renewal'],['FITNESS_CERTIFICATE_RENEWAL','Fitness Certificate Renewal'],['OTHER','Other']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm font-semibold">Scheduled date/time<input required type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm((v) => ({ ...v, scheduledAt: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <label className="text-sm font-semibold">Service provider<input maxLength={255} value={form.serviceProvider} onChange={(event) => setForm((v) => ({ ...v, serviceProvider: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <label className="text-sm font-semibold md:col-span-2">Description<input required maxLength={2000} value={form.description} onChange={(event) => setForm((v) => ({ ...v, description: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <label className="text-sm font-semibold">Estimated cost<input type="number" min="0" step="0.01" value={form.estimatedCost} onChange={(event) => setForm((v) => ({ ...v, estimatedCost: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <label className="text-sm font-semibold">Notes<input maxLength={2000} value={form.notes} onChange={(event) => setForm((v) => ({ ...v, notes: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <div className="md:col-span-2 xl:col-span-4"><button disabled={action.saving || !vehicles.length} className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Plus size={16} />Schedule maintenance</button></div>
    </form>}
    {mode === 'requests' && <form onSubmit={submitRequest} className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
      <label className="text-sm font-semibold">Vehicle<select required value={requestForm.vehicleId} onChange={(event) => setRequestForm((v) => ({ ...v, vehicleId: event.target.value }))} className={`${input} mt-1.5`}><option value="">Choose vehicle</option>{vehicles.map((row) => <option key={read(row, 'id')} value={read(row, 'id')}>{read(row, 'vehicle_name')}</option>)}</select></label>
      <label className="text-sm font-semibold">Priority<select value={requestForm.priority} onChange={(event) => setRequestForm((v) => ({ ...v, priority: event.target.value }))} className={`${input} mt-1.5`}>{['LOW','MEDIUM','HIGH','CRITICAL'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm font-semibold md:col-span-2">Issue description<input required maxLength={2000} value={requestForm.description} onChange={(event) => setRequestForm((v) => ({ ...v, description: event.target.value }))} className={`${input} mt-1.5`} /></label>
      <div className="md:col-span-4"><button disabled={action.saving || !vehicles.length} className="rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Create request</button></div>
    </form>}
    {loading ? <Loading /> : <DataTable rows={rows} columns={mode === 'requests'
      ? [[ 'id', 'Request' ], ['vehicle_name', 'Vehicle'], ['reported_by', 'Reported by'], ['description', 'Issue'], ['priority', 'Priority'], ['created_at', 'Requested'], ['status', 'Status']]
      : [[ 'vehicle_name', 'Vehicle' ], ['maintenance_type', 'Service type'], ['description', 'Description'], ['scheduled_at', 'Scheduled'], ['service_provider', 'Provider'], ['estimated_cost', 'Estimate'], ['actual_cost', 'Actual cost'], ['status', 'Status']]}
      actions={(row) => mode === 'requests'
        ? <div className="flex gap-2">{read(row, 'status') === 'OPEN' && <button onClick={() => updateRecord(row, 'IN_PROGRESS')} className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-[#B54700]">Start</button>}{['OPEN','IN_PROGRESS'].includes(read(row, 'status')) && <button onClick={() => updateRecord(row, 'RESOLVED')} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">Resolve</button>}</div>
        : <div className="flex gap-2">{read(row, 'status') === 'SCHEDULED' && <button onClick={() => updateRecord(row, 'IN_PROGRESS')} className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-[#B54700]">Start</button>}{['SCHEDULED','IN_PROGRESS'].includes(read(row, 'status')) && <button onClick={() => updateRecord(row, 'COMPLETED')} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">Complete</button>}{['SCHEDULED','IN_PROGRESS'].includes(read(row, 'status')) && <button onClick={() => updateRecord(row, 'CANCELLED')} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700">Cancel</button>}</div>} empty={mode === 'requests' ? 'No maintenance requests match this filter.' : 'No maintenance records match this filter.'} />}
  </>;
}

function UtilizationPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, loading, error, reload } = useRemote(() => fleetManagerApi.utilization({ from, to }).then((response) => response.data), [from, to]);
  const measures = [['Fleet vehicles', 'total_vehicles', ''], ['Available now', 'available_vehicles', ''], ['Vehicles on rent', 'vehicles_on_rent', ''], ['Under maintenance', 'vehicles_under_maintenance', ''], ['Rental days', 'total_rental_days', ''], ['Operational vehicle-days', 'total_available_days', ''], ['Utilization', 'utilization_percent', '%']];
  return <>
    <Heading title="Vehicle utilization" description="Rental days overlapping the selected dates divided by operational vehicle-days, less scheduled maintenance downtime.">
      <div className="flex gap-2"><label className="text-xs font-semibold">From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className={`${input} mt-1`} /></label><label className="text-xs font-semibold">To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className={`${input} mt-1`} /></label></div>
    </Heading>
    <Banner error={error} onRetry={reload} />
    {loading ? <Loading /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{measures.map(([label, key, suffix]) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{Number(read(data, key) || 0).toFixed(suffix === '%' ? 2 : 0)}{suffix}</p></article>)}</div>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold">Vehicle utilization detail</h2><DataTable rows={data?.vehicles || []} columns={[[ 'vehicle_name', 'Vehicle' ], ['category', 'Category'], ['rental_days', 'Rental days'], ['available_days', 'Operational days']]} /></section>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold">Category utilization</h2><DataTable rows={data?.categories || []} columns={[[ 'category', 'Category' ], ['rental_days', 'Rental days'], ['available_days', 'Operational days'], ['utilization_percent', 'Utilization %']]} /></section>
      <p className="mt-3 text-xs text-slate-500">{data?.calculation}</p>
    </>}
  </>;
}

function ReportsPage() {
  const [type, setType] = useState('fleet-summary');
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, loading, error, reload } = useRemote(() => fleetManagerApi.report(type, { from, to }).then((response) => response.data), [type, from, to]);
  const rows = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const downloadCsv = () => {
    if (!rows.length) return;
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const contents = [headers.map(escape).join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }));
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `fleet-${type}-${from}-${to}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <>
    <Heading title="Operational reports" description="Reports contain only resources granted to your account and do not include payment records.">
      <button onClick={downloadCsv} disabled={!rows.length} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-50"><Download size={16} />Export CSV</button>
    </Heading>
    <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
      <label className="text-xs font-semibold">Report<select value={type} onChange={(event) => setType(event.target.value)} className={`${input} mt-1`}><option value="fleet-summary">Fleet summary</option><option value="assignments">Vehicle assignments</option><option value="driver-assignments">Driver assignments</option><option value="maintenance">Maintenance</option><option value="utilization">Vehicle utilization</option><option value="active-rentals">Active rentals</option><option value="operational-cost">Operational costs</option></select></label>
      <label className="text-xs font-semibold">Start date<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className={`${input} mt-1`} /></label>
      <label className="text-xs font-semibold">End date<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className={`${input} mt-1`} /></label>
    </div>
    <Banner error={error} onRetry={reload} />
    {loading ? <Loading /> : <DataTable rows={rows} columns={rows.length ? Object.keys(rows[0]).map((key) => [key, key.replaceAll('_', ' ')]) : [[ 'empty', 'Records' ]]} empty="No report data found for this period." />}
  </>;
}

function NotificationsPage() {
  const { data, loading, error, reload } = useRemote(() => fleetManagerApi.notifications().then((response) => response.data), []);
  const action = useAction(reload);
  const items = data?.items || [];
  return <>
    <Heading title="Notifications" description={`${Number(data?.unread) || 0} unread operations notifications.`}>
      <button onClick={() => action.run(() => fleetManagerApi.markAllNotificationsRead(), 'All notifications marked as read.')} disabled={!Number(data?.unread)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-50">Mark all read</button>
    </Heading>
    <Banner error={error || action.error} message={action.message} onRetry={reload} />
    {loading ? <Loading /> : items.length ? <div className="space-y-3">{items.map((item) => <article key={item.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><h2 className="font-bold">{item.title}</h2><Status value={item.notification_type} /></div><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{when(item.created_at)}</p></div>{!item.is_read && <button onClick={() => action.run(() => fleetManagerApi.markNotificationRead(item.id), 'Notification marked as read.')} className="self-start rounded-lg px-3 py-2 text-xs font-bold text-[#B54700] hover:bg-orange-50">Mark read</button>}</article>)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No notifications.</p>}
  </>;
}

function ProfilePage({ settings = false }) {
  const { data, loading, error, reload } = useRemote(() => fleetManagerApi.profile().then((response) => response.data), []);
  const action = useAction(reload);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [prefs, setPrefs] = useState({ email_notifications: true, compact_tables: false });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  useEffect(() => {
    if (data) { setName(data.fullName || ''); setPhone(data.phone || ''); }
  }, [data]);
  useEffect(() => {
    if (settings) fleetManagerApi.preferences().then(({ data: value }) => setPrefs(value))
      .catch((requestError) => action.setError(requestError?.response?.data?.detail || 'Could not load preferences.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);
  if (loading) return <Loading />;
  const saveProfile = (event) => {
    event.preventDefault();
    action.run(() => fleetManagerApi.updateProfile({ fullName: name, phone }), 'Profile updated.');
  };
  const savePreferences = (event) => {
    event.preventDefault();
    action.run(() => fleetManagerApi.updatePreferences({
      emailNotifications: Boolean(prefs.email_notifications),
      compactTables: Boolean(prefs.compact_tables),
    }), 'Preferences saved.');
  };
  const savePassword = async (event) => {
    event.preventDefault();
    const saved = await action.run(() => fleetManagerApi.changePassword(password), 'Password changed.');
    if (saved) setPassword({ currentPassword: '', newPassword: '' });
  };
  return <>
    <Heading title={settings ? 'Settings' : 'My profile'} description={settings ? 'Manage preferences and securely change your account password.' : 'Email, role, and account status are managed by the configured account process.'} />
    <Banner error={error || action.error} message={action.message} onRetry={reload} />
    {!settings ? <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold">Profile information</h2>
        <label className="block text-sm font-semibold">Full name<input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className={`${input} mt-1.5`} /></label>
        <label className="mt-4 block text-sm font-semibold">Email address<input readOnly value={data?.email || ''} className={`${input} mt-1.5 bg-slate-50 text-slate-500`} /></label>
        <label className="mt-4 block text-sm font-semibold">Phone number<input maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} className={`${input} mt-1.5`} /></label>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><p><span className="block text-xs text-slate-500">Role</span><Status value={data?.role} /></p><p><span className="block text-xs text-slate-500">Account status</span><Status value={data?.status} /></p></div>
        <button disabled={action.saving} className="mt-5 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save profile</button>
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-[#B54700]">{(data?.fullName || 'FM').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><h2 className="mt-4 text-lg font-bold">{data?.fullName}</h2><p className="text-sm text-slate-500">{data?.email}</p><p className="mt-4 text-sm text-slate-600">Profile images are not part of the current Fleet Manager account model.</p></section>
    </div> : <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={savePreferences} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Preferences</h2>{[['email_notifications','Email notifications'],['compact_tables','Compact tables']].map(([key,label]) => <label key={key} className="mt-4 flex items-center justify-between gap-3 text-sm"><span>{label}</span><input type="checkbox" checked={Boolean(prefs[key])} onChange={(event) => setPrefs((value) => ({ ...value, [key]: event.target.checked }))} className="h-4 w-4 accent-[#FF6B00]" /></label>)}<button disabled={action.saving} className="mt-5 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save preferences</button></form>
      <form onSubmit={savePassword} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Change password</h2><p className="mt-1 text-xs text-slate-500">This updates the database password hash. Startup configuration will not reset it on restart.</p><label className="mt-4 block text-sm font-semibold">Current password<input required type="password" autoComplete="current-password" value={password.currentPassword} onChange={(event) => setPassword((value) => ({ ...value, currentPassword: event.target.value }))} className={`${input} mt-1.5`} /></label><label className="mt-4 block text-sm font-semibold">New password<input required minLength={12} maxLength={100} type="password" autoComplete="new-password" value={password.newPassword} onChange={(event) => setPassword((value) => ({ ...value, newPassword: event.target.value }))} className={`${input} mt-1.5`} /></label><button disabled={action.saving} className="mt-5 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Update password</button></form>
    </div>}
  </>;
}

function AnalyticsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const { data: utilization, loading, error, reload } = useRemote(() => fleetManagerApi.utilization({ from: monthAgo, to: today }).then((response) => response.data), []);
  const { data: maintenance } = useRemote(() => fleetManagerApi.maintenance().then((response) => response.data), []);
  const { data: drivers } = useRemote(() => fleetManagerApi.drivers().then((response) => response.data), []);
  const completed = (Array.isArray(maintenance) ? maintenance : []).filter((item) => read(item, 'status') === 'COMPLETED');
  const costs = completed.reduce((sum, item) => sum + Number(read(item, 'actual_cost') || read(item, 'estimated_cost') || 0), 0);
  const open = (Array.isArray(maintenance) ? maintenance : []).filter((item) => ['SCHEDULED', 'IN_PROGRESS'].includes(read(item, 'status'))).length;
  const assignedDrivers = (Array.isArray(drivers) ? drivers : []).filter((item) => read(item, 'availability') === 'ASSIGNED').length;
  return <>
    <Heading title="Performance analytics" description="Operational indicators are computed from your authorized vehicle, booking, assignment, and maintenance records." />
    <Banner error={error} onRetry={reload} />
    {loading ? <Loading /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[['Utilization · last 30 days', `${Number(read(utilization, 'utilization_percent') || 0).toFixed(2)}%`], ['Rental days · last 30 days', Number(read(utilization, 'total_rental_days') || 0).toFixed(1)], ['Open maintenance', open], ['Assigned drivers', assignedDrivers], ['Recorded maintenance cost', cash(costs)], ['Scoped fleet vehicles', read(utilization, 'total_vehicles') || 0]].map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>)}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-4"><h2 className="mb-4 font-bold">Vehicle utilization by category · last 30 days</h2><DataTable rows={utilization?.categories || []} columns={[[ 'category', 'Category' ], ['rental_days', 'Rental days'], ['available_days', 'Operational days'], ['utilization_percent', 'Utilization %']]} /></section>
    </div>}
  </>;
}

export default function FleetManagerWorkspace() {
  const { pathname } = useLocation();
  if (pathname.endsWith('/dashboard')) return <Dashboard />;
  if (pathname.endsWith('/vehicles')) return <VehiclePage />;
  if (pathname.endsWith('/availability')) return <VehiclePage availabilityOnly />;
  if (pathname.endsWith('/vehicle-assignments')) return <AssignmentPage />;
  if (pathname.endsWith('/drivers')) return <DriversPage />;
  if (pathname.endsWith('/active-rentals')) return <ActiveRentals />;
  if (pathname.endsWith('/maintenance/schedule')) return <MaintenancePage mode="schedule" />;
  if (pathname.endsWith('/maintenance/requests')) return <MaintenancePage mode="requests" />;
  if (pathname.endsWith('/maintenance/history')) return <MaintenancePage mode="history" />;
  if (pathname.endsWith('/utilization')) return <UtilizationPage />;
  if (pathname.endsWith('/reports')) return <ReportsPage />;
  if (pathname.endsWith('/analytics')) return <AnalyticsPage />;
  if (pathname.endsWith('/notifications')) return <NotificationsPage />;
  if (pathname.endsWith('/profile')) return <ProfilePage />;
  if (pathname.endsWith('/settings')) return <ProfilePage settings />;
  return <Dashboard />;
}
