import { useEffect, useState } from 'react';
import {
  ArrowRight, Bell, CalendarDays, CarFront, CheckCircle2, CircleAlert,
  Clock3, IndianRupee, LoaderCircle, Plus, ReceiptText, RotateCw, XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { vendorApi } from '../api/vendorApi';
import { useAuth } from '../context/AuthContext';

const valueOf = (row, key) => row?.[key] ?? row?.[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
const currency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value) || 0);
const date = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';

const statCards = [
  ['Total vehicles', 'total_vehicles', CarFront, '/vendor/vehicles', 'text-slate-700 bg-slate-100'],
  ['Approved vehicles', 'approved_vehicles', CheckCircle2, '/vendor/vehicle-approval', 'text-emerald-700 bg-emerald-50'],
  ['Pending vehicles', 'pending_vehicles', Clock3, '/vendor/vehicle-approval', 'text-amber-700 bg-amber-50'],
  ['Rejected vehicles', 'rejected_vehicles', XCircle, '/vendor/vehicle-approval', 'text-red-700 bg-red-50'],
  ['Total bookings', 'total_bookings', ReceiptText, '/vendor/booking-history', 'text-blue-700 bg-blue-50'],
  ['Active rentals', 'active_rentals', CarFront, '/vendor/active-rentals', 'text-violet-700 bg-violet-50'],
  ['Completed rentals', 'completed_rentals', CalendarDays, '/vendor/booking-history', 'text-teal-700 bg-teal-50'],
];

function Status({ value }) {
  const status = String(value || 'UNKNOWN').replaceAll('_', ' ');
  const color = /APPROVED|ACTIVE|CONFIRMED|COMPLETED|SUCCESS/i.test(status) ? 'bg-emerald-50 text-emerald-700'
    : /REJECT|FAIL|CANCEL/i.test(status) ? 'bg-red-50 text-red-700'
      : /PENDING|PROCESS/i.test(status) ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>{status}</span>;
}

function BarChart({ title, items, valueKey, formatValue = (value) => String(value) }) {
  const rows = items || [];
  const maximum = Math.max(...rows.map((row) => Number(valueOf(row, valueKey)) || 0), 1);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-900">{title}</h2>
      {rows.length ? (
        <div className="mt-5 flex h-44 items-end gap-3 overflow-x-auto border-b border-slate-100 pb-2">
          {rows.map((row) => {
            const value = Number(valueOf(row, valueKey)) || 0;
            return (
              <div key={valueOf(row, 'month')} className="flex h-full min-w-10 flex-1 flex-col items-center justify-end" title={formatValue(value)}>
                <span className="mb-1 text-[10px] font-semibold text-slate-500">{formatValue(value)}</span>
                <div className="w-full rounded-t-md bg-[#FF6B00] transition-colors hover:bg-[#E85D00]" style={{ height: `${Math.max(value ? 5 : 0, (value / maximum) * 70)}%` }} />
                <span className="mt-2 text-[10px] text-slate-400">{valueOf(row, 'month')}</span>
              </div>
            );
          })}
        </div>
      ) : <p className="mt-5 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No records available for this chart yet.</p>}
    </section>
  );
}

function RecentTable({ title, link, columns, rows, empty, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <Link to={link} className="inline-flex items-center gap-1 text-xs font-bold text-[#B54700] hover:underline">View all <ArrowRight size={14} /></Link>
      </div>
      {rows?.length ? (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>{columns.map(([key, label]) => <th key={key} className="px-3 py-2 font-semibold">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={valueOf(row, 'id')} className="hover:bg-slate-50">
                {columns.map(([key]) => <td key={key} className="px-3 py-3 text-slate-700">{key === 'status' || key === 'approval_status' ? <Status value={valueOf(row, key)} /> : key.endsWith('date') || key === 'created_at' ? date(valueOf(row, key)) : key === 'amount' || key === 'daily_rate' ? currency(valueOf(row, key)) : valueOf(row, key) ?? '—'}</td>)}
              </tr>)}
            </tbody>
          </table>
        </div>
      ) : children || <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">{empty}</p>}
    </section>
  );
}

export default function VendorForm() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await vendorApi.dashboard();
      setDashboard(data);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not load vendor dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    vendorApi.dashboard().then(({ data }) => {
      if (active) setDashboard(data);
    }).catch((requestError) => {
      if (active) setError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not load vendor dashboard data.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="flex min-h-64 items-center justify-center gap-2 text-slate-500"><LoaderCircle className="animate-spin" size={20} />Loading your dashboard…</div>;
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><div className="flex items-center gap-2"><CircleAlert size={18} />{error}</div><button onClick={load} className="mt-3 inline-flex items-center gap-2 font-bold underline"><RotateCw size={14} />Retry</button></div>;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-[#172033] p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-300">Vendor workspace</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Welcome back, {user?.name || 'Vendor'}!</h1>
          <p className="mt-2 text-sm text-slate-300">Manage your vehicles, bookings, and business performance from one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/vendor/vehicles/add" className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#E85D00]"><Plus size={17} />Add new vehicle</Link>
          <Link to="/vendor/bookings/requests" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"><ReceiptText size={17} />View bookings</Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(([label, key, Icon, to, tone]) => (
          <Link key={key} to={to} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span>
            <p className="mt-4 text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{Number(dashboard?.[key]) || 0}</p>
          </Link>
        ))}
        <Link to="/vendor/earnings" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#B54700]"><IndianRupee size={20} /></span>
          <p className="mt-4 text-sm text-slate-500">Gross paid booking amount</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{currency(dashboard?.gross_paid_amount)}</p>
          <p className="mt-1 text-xs text-slate-400">Collected payments, before commission or payout adjustments</p>
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <BarChart title="Monthly earnings · successful payments" items={dashboard?.monthlyEarnings} valueKey="amount" formatValue={currency} />
        <BarChart title="Monthly bookings" items={dashboard?.monthlyBookings} valueKey="count" />
      </div>

      <RecentTable title="Recent booking requests" link="/vendor/bookings/requests"
        columns={[['id', 'Booking'], ['vehicle_name', 'Vehicle'], ['customer_name', 'Customer'], ['pickup_date', 'Pickup'], ['amount', 'Amount'], ['status', 'Status']]}
        rows={dashboard?.recentBookings} empty="New booking requests for your vehicles will appear here." />
      <RecentTable title="Recent vehicles" link="/vendor/vehicles"
        columns={[['title', 'Vehicle'], ['category', 'Category'], ['daily_rate', 'Price / day'], ['approval_status', 'Approval'], ['availability_status', 'Availability']]}
        rows={dashboard?.recentVehicles} empty="Add a vehicle to start building your fleet.">
        <Link to="/vendor/vehicles/add" className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-orange-200 bg-orange-50 p-6 text-sm font-semibold text-[#B54700] hover:bg-orange-100"><Plus size={17} />Add your first vehicle</Link>
      </RecentTable>
      <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm leading-6 text-orange-900">
        <Bell size={18} className="mt-0.5 shrink-0" />
        <p>Listing approval is managed by SmartRide administrators. Pending vehicles remain unavailable for customer booking until approved.</p>
      </div>
    </div>
  );
}
