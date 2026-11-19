const metrics = [
  { label: 'Active bookings', value: '12' },
  { label: 'Total spent', value: '₹82,400' },
  { label: 'Saved vehicles', value: '8' },
  { label: 'Loyalty points', value: '1,480' },
];

export default function CustomerDashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Dashboard</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Customer dashboard</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
