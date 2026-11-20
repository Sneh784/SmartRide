import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, CircleAlert, LoaderCircle, Search } from 'lucide-react';
import { adminApi } from '../../api/adminApi';

function Status({ value }) {
  const status = String(value || 'UNKNOWN').toUpperCase();
  const style = status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700'
    : status === 'REJECTED' || status === 'SUSPENDED' ? 'bg-red-50 text-red-700'
      : 'bg-amber-50 text-amber-800';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{status}</span>;
}

function RejectionDialog({ name, onCancel, onConfirm, busy }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <form onSubmit={(event) => { event.preventDefault(); onConfirm(reason); }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Reject {name}&apos;s application?</h2>
        <p className="mt-1 text-sm text-slate-500">A reason is required and will be recorded in the admin audit log.</p>
        <textarea
          required
          minLength={3}
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#FF6B00]"
          placeholder="Explain why this application is rejected"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button>
          <button disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            {busy ? 'Rejecting…' : 'Confirm rejection'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function DriverApplications() {
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [rejecting, setRejecting] = useState(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.driverApplications({ status, search });
      setApplications(data || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not load driver applications.');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    let active = true;
    adminApi.driverApplications({ status, search })
      .then(({ data }) => {
        if (active) {
          setApplications(data || []);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not load driver applications.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [search, status]);

  const setApplicationStatus = async (application, nextStatus, reason) => {
    setActionLoading(true);
    setActionError('');
    try {
      await adminApi.setUserStatus('DRIVER', application.id, { status: nextStatus, reason });
      setRejecting(null);
      await loadApplications();
    } catch (requestError) {
      setActionError(requestError?.response?.data?.message || requestError?.response?.data?.detail || 'Could not update the driver application.');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadDocument = async (application, type) => {
    setActionError('');
    try {
      const { data } = await adminApi.driverDocument(application.id, type);
      const extension = data.type === 'application/pdf' ? 'pdf' : data.type === 'image/png' ? 'png' : 'jpg';
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `driver-${application.id}-${type.toLowerCase()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setActionError(requestError?.response?.data?.message || 'Could not download the selected document.');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#D95400]">SmartRide administration</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">Driver applications</h1>
          <p className="mt-2 text-sm text-slate-500">Verify driving credentials before granting drivers access to the platform.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search size={17} className="text-slate-400" aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or license" className="w-full min-w-48 text-sm outline-none" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="PENDING">Pending</option>
            <option value="">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {(error || actionError) && (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <CircleAlert size={17} aria-hidden="true" />
          {error || actionError}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="animate-spin" size={19} aria-hidden="true" />Loading driver applications…
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No driver applications match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Applicant', 'Contact', 'Location', 'License', 'Experience', 'Vehicle categories', 'Documents', 'Status', 'Review'].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-bold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((application) => {
                const currentStatus = String(application.status || '').toUpperCase();
                return (
                  <tr key={application.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{application.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{application.application_number}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <p>{application.email}</p>
                      <p className="mt-1">{application.phone}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{application.city}, {application.state}</td>
                    <td className="px-4 py-4 text-slate-700">
                      <p>{application.license_number}</p>
                      <p className="mt-1 text-xs text-slate-500">Expires {application.license_expiry_date}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{application.experience_years} years</td>
                    <td className="max-w-56 whitespace-normal px-4 py-4 text-slate-700">{application.vehicle_categories}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-2">
                        {application.profile_photo_original_name && (
                          <button onClick={() => downloadDocument(application, 'PHOTO')} className="inline-flex items-center gap-1 text-xs font-bold text-[#B54700] hover:underline">
                            <ArrowDownToLine size={14} aria-hidden="true" />Profile photo
                          </button>
                        )}
                        <button onClick={() => downloadDocument(application, 'LICENSE')} className="inline-flex items-center gap-1 text-xs font-bold text-[#B54700] hover:underline">
                          <ArrowDownToLine size={14} aria-hidden="true" />Driving license
                        </button>
                        <button onClick={() => downloadDocument(application, 'IDENTITY')} className="inline-flex items-center gap-1 text-xs font-bold text-[#B54700] hover:underline">
                          <ArrowDownToLine size={14} aria-hidden="true" />Identity proof
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4"><Status value={application.status} /></td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-36 flex-wrap gap-2">
                        {(currentStatus === 'PENDING' || currentStatus === 'REJECTED' || currentStatus === 'SUSPENDED') && (
                          <button disabled={actionLoading} onClick={() => setApplicationStatus(application, 'APPROVED')} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 disabled:opacity-60">
                            {currentStatus === 'PENDING' ? 'Approve' : 'Reactivate'}
                          </button>
                        )}
                        {currentStatus === 'PENDING' && (
                          <button disabled={actionLoading} onClick={() => setRejecting(application)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 disabled:opacity-60">
                            Reject
                          </button>
                        )}
                        {currentStatus === 'APPROVED' && (
                          <button disabled={actionLoading} onClick={() => setApplicationStatus(application, 'SUSPENDED')} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-60">
                            Suspend
                          </button>
                        )}
                      </div>
                      {application.approval_reason && <p className="mt-2 max-w-48 text-xs text-slate-500">{application.approval_reason}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rejecting && (
        <RejectionDialog
          name={rejecting.name}
          busy={actionLoading}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => setApplicationStatus(rejecting, 'REJECTED', reason)}
        />
      )}
    </div>
  );
}
