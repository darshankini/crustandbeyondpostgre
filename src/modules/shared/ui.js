import { useEffect } from 'react';

export const inputCls = (error) =>
  'w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:border-brand ' +
  (error ? 'border-red-500 bg-red-50' : 'border-gray-300');

export const btn = {
  primary: 'rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50',
  secondary: 'rounded-md bg-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-300',
  preview: 'rounded-md bg-gray-700 p-1 px-2 text-xs text-white hover:bg-gray-600',
  edit: 'rounded-md bg-orange-600 p-1 px-2 text-xs text-white hover:bg-orange-500',
  delete: 'rounded-md bg-red-600 p-1 px-2 text-xs text-white hover:bg-red-500',
};

export function FieldError({ msg }) {
  return msg ? <p className="mt-0.5 text-xs text-red-600">{msg}</p> : null;
}

export function Field({ label, error, children, className = '' }) {
  return (
    <label className={'block text-sm ' + className}>
      <span className="mb-1 block text-gray-600">{label}</span>
      {children}
      <FieldError msg={error} />
    </label>
  );
}

// Centered dialog with a scrolling body; Escape or a click on the backdrop closes it.
export function Modal({ title, subtitle, onClose, children, footer, width = 'max-w-2xl' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`flex max-h-[calc(100vh-2rem)] w-full ${width} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}>
        <div className="flex shrink-0 items-center justify-between border-b bg-gray-50 px-6 py-4">
          <div>
            {subtitle && <p className="text-sm font-medium text-gray-500">{subtitle}</p>}
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex shrink-0 justify-end gap-2 border-t bg-gray-50 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// Card with a title, an optional action button and the list table.
export function Panel({ title, action, children }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// Table body placeholder row for loading / empty lists.
export function EmptyRow({ cols, loading, text }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-8 text-center text-gray-400">
        {loading ? 'Loading…' : text}
      </td>
    </tr>
  );
}

export function Pagination({ p }) {
  if (p.totalPages <= 1) return null;
  const cls = (active) =>
    'min-w-9 rounded-md px-3 py-1.5 text-sm ' + (active ? 'bg-gray-800 text-white' : 'border text-gray-600 hover:bg-gray-50');
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-700">{p.from}</span> -{' '}
        <span className="font-medium text-gray-700">{p.to}</span> of{' '}
        <span className="font-medium text-gray-700">{p.total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => p.goToPage(p.page - 1)} disabled={p.page === 1} className={cls(false) + ' disabled:opacity-40'}>←</button>
        {p.pages.map((n) => (
          <button key={n} onClick={() => p.goToPage(n)} className={cls(p.page === n)}>{n}</button>
        ))}
        <button onClick={() => p.goToPage(p.page + 1)} disabled={p.page === p.totalPages} className={cls(false) + ' disabled:opacity-40'}>→</button>
      </div>
    </div>
  );
}
