import { useAuth } from '../context/AuthContext';

export default function DriverDashboard() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-[#14223A] p-8 text-white shadow-xl sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-200">Driver workspace</p>
        <h1 className="mt-2 text-3xl font-black">Welcome, {user?.name || 'Driver'}.</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-300">
          Your driver application has been approved. New trips, pickup and drop-off details, and earnings will appear here when assigned.
        </p>
      </section>
    </div>
  );
}
