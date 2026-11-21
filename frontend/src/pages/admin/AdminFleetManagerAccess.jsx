import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react';
import { adminApi } from '../../api/adminApi';

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF6B00]';
const value = (row, key) => row?.[key] ?? row?.[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];

export default function AdminFleetManagerAccess() {
  const [data, setData] = useState(null);
  const [managerId, setManagerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: result } = await adminApi.fleetManagerAccess();
      setData(result);
      setManagerId((current) => current || String(result.fleetManagers?.[0]?.id || ''));
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Could not load Fleet Manager access records.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    adminApi.fleetManagerAccess().then(({ data: result }) => {
      if (!active) return;
      setData(result);
      setManagerId(String(result.fleetManagers?.[0]?.id || ''));
    }).catch((requestError) => {
      if (active) setError(requestError?.response?.data?.detail || 'Could not load Fleet Manager access records.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const managers = data?.fleetManagers || [];
  const vehicles = data?.vehicles || [];
  const drivers = data?.drivers || [];
  const vehicleGrants = useMemo(() => (data?.vehicleGrants || []).filter((row) => String(value(row, 'fleet_manager_id')) === String(managerId)), [data, managerId]);
  const driverGrants = useMemo(() => (data?.driverGrants || []).filter((row) => String(value(row, 'fleet_manager_id')) === String(managerId)), [data, managerId]);
  const run = async (operation, success) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await operation();
      setMessage(success);
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Could not update Fleet Manager access.');
    } finally {
      setSaving(false);
    }
  };
  const grantVehicle = (event) => {
    event.preventDefault();
    if (!managerId || !vehicleId) return;
    run(() => adminApi.grantFleetVehicle(managerId, vehicleId), 'Vehicle access granted.');
    setVehicleId('');
  };
  const grantDriver = (event) => {
    event.preventDefault();
    if (!managerId || !driverId) return;
    run(() => adminApi.grantFleetDriver(managerId, driverId), 'Driver access granted.');
    setDriverId('');
  };
  return <>
    <header className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-[#D95400]">SmartRide administration</p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Fleet Manager access</h1>
      <p className="mt-2 text-sm text-slate-500">Grant access only to approved vehicles and active, approved drivers. Fleet Managers cannot access other vendor assets or modify approval and pricing.</p>
    </header>
    {(error || message) && <div role={error ? 'alert' : 'status'} className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-sm ${error ? 'border border-red-200 bg-red-50 text-red-700' : 'bg-emerald-50 font-semibold text-emerald-800'}`}>{error ? <CircleAlert size={17} /> : <ShieldCheck size={17} />}{error || message}</div>}
    {loading ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading access scope…</div> : <>
      {!managers.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No configured Fleet Manager account was found. Configure and restart the backend before granting scope.</div> : <>
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block max-w-xl text-sm font-semibold">Fleet Manager account<select value={managerId} onChange={(event) => setManagerId(event.target.value)} className={`${field} mt-1.5`}>{managers.map((manager) => <option key={value(manager, 'id')} value={value(manager, 'id')}>{value(manager, 'name')} · {value(manager, 'email')}{value(manager, 'active') ? '' : ' (inactive)'}</option>)}</select></label>
        </section>
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Grant approved vehicles</h2>
            <form onSubmit={grantVehicle} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select required value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} className={field}><option value="">Select an approved vehicle</option>{vehicles.map((vehicle) => <option key={value(vehicle, 'id')} value={value(vehicle, 'id')}>{value(vehicle, 'title')} · {value(vehicle, 'registration_number') || `#${value(vehicle, 'id')}`}</option>)}</select>
              <button disabled={saving || !managerId} className="rounded-xl bg-[#FF6B00] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Grant access</button>
            </form>
            <div className="mt-4 divide-y divide-slate-100">{vehicleGrants.length ? vehicleGrants.map((grant) => <div key={`${value(grant, 'fleet_manager_id')}-${value(grant, 'vehicle_id')}`} className="flex items-center justify-between gap-3 py-3"><span className="text-sm font-medium">{value(grant, 'vehicle_name')}</span><button disabled={saving} onClick={() => run(() => adminApi.revokeFleetVehicle(managerId, value(grant, 'vehicle_id')), 'Vehicle access revoked.')} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Revoke</button></div>) : <p className="py-4 text-sm text-slate-500">No vehicles granted.</p>}</div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Grant approved drivers</h2>
            <form onSubmit={grantDriver} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select required value={driverId} onChange={(event) => setDriverId(event.target.value)} className={field}><option value="">Select an active, approved driver</option>{drivers.map((driver) => <option key={value(driver, 'id')} value={value(driver, 'id')}>{value(driver, 'name')} · {value(driver, 'email')}</option>)}</select>
              <button disabled={saving || !managerId} className="rounded-xl bg-[#FF6B00] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Grant access</button>
            </form>
            <div className="mt-4 divide-y divide-slate-100">{driverGrants.length ? driverGrants.map((grant) => <div key={`${value(grant, 'fleet_manager_id')}-${value(grant, 'driver_id')}`} className="flex items-center justify-between gap-3 py-3"><span className="text-sm font-medium">{value(grant, 'driver_name')}</span><button disabled={saving} onClick={() => run(() => adminApi.revokeFleetDriver(managerId, value(grant, 'driver_id')), 'Driver access revoked.')} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Revoke</button></div>) : <p className="py-4 text-sm text-slate-500">No drivers granted.</p>}</div>
          </section>
        </div>
      </>}
    </>}
  </>;
}
