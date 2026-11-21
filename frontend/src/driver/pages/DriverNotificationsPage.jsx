import { Bell, Check, CheckCheck, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { driverApi } from '../api/driverApi';
import { apiError, dateTime } from '../services/driverFormatters';

export default function DriverNotificationsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    driverApi.notifications()
      .then(({ data: result }) => {
        if (active) setData({ items: Array.isArray(result?.items) ? result.items : [], unread: Number(result?.unread) || 0 });
      })
      .catch((requestError) => {
        if (active) setError(apiError(requestError, 'Could not load notifications.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadVersion]);

  const refresh = () => {
    setError('');
    setLoading(true);
    setReloadVersion((value) => value + 1);
  };

  const markRead = async (id) => {
    setSavingId(id);
    setError('');
    setMessage('');
    try {
      await driverApi.markNotificationRead(id);
      setMessage('Notification marked as read.');
      setLoading(true);
      setReloadVersion((value) => value + 1);
    } catch (requestError) {
      setError(apiError(requestError, 'Could not update this notification.'));
    } finally {
      setSavingId(null);
    }
  };

  const markAllRead = async () => {
    setSavingId('all');
    setError('');
    setMessage('');
    try {
      await driverApi.markAllNotificationsRead();
      setMessage('All notifications marked as read.');
      setLoading(true);
      setReloadVersion((value) => value + 1);
    } catch (requestError) {
      setError(apiError(requestError, 'Could not update notifications.'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-black text-slate-900">Notifications</h1><p className="mt-1 text-sm text-slate-500">Trip assignments and important updates for your driver account.</p></div>
        <div className="flex gap-2">
          <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button>
          <button onClick={markAllRead} disabled={loading || savingId === 'all' || !data?.unread} className="inline-flex items-center gap-2 rounded-xl bg-[#172033] px-3 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"><CheckCheck size={15} />Mark all read</button>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}
      {loading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div>
        : error ? null
        : data?.items?.length ? <section className="space-y-3">
          {data.items.map((item) => <article key={item.id} className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center ${item.is_read ? 'border-slate-200' : 'border-orange-200 bg-orange-50/40'}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.is_read ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-[#B54700]'}`}><Bell size={18} /></span>
              <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{item.title}</h2>{!item.is_read && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-[#B54700]">New</span>}</div><p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{dateTime(item.created_at)}</p></div>
            </div>
            {!item.is_read && <button onClick={() => markRead(item.id)} disabled={savingId === item.id} className="inline-flex items-center gap-1 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Check size={14} />Mark read</button>}
          </article>)}
        </section> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Bell className="mx-auto text-slate-400" size={30} /><h2 className="mt-3 font-bold text-slate-900">You’re all caught up</h2><p className="mt-1 text-sm text-slate-500">New trip assignments will appear here.</p>
        </div>}
    </>
  );
}
