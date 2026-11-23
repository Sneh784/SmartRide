import { useCallback, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { ToastContext } from '../../context/ToastContext';

const styles = {
  success: { Icon: CircleCheck, tone: 'border-emerald-200 bg-white text-emerald-800' },
  error: { Icon: CircleAlert, tone: 'border-red-200 bg-white text-red-800' },
  info: { Icon: Info, tone: 'border-blue-200 bg-white text-blue-800' },
};

function ToastItem({ toast, onDismiss }) {
  const { Icon, tone } = styles[toast.type] || styles.info;

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${tone}`}
    >
      <Icon size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm font-semibold leading-5">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification" className="rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const push = useCallback((message, type = 'info') => {
    if (!message) return;
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current.slice(-3), { id, message, type }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  const value = useMemo(() => ({
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
    info: (message) => push(message, 'info'),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div className="pointer-events-auto" key={toast.id}>
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
