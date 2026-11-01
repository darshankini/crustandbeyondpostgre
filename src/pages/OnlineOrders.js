import { useEffect, useState, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { money, formattedDate } from '../components/Layout';
import KotTicket from '../components/KotTicket';
import { status as printerStatus, printBytes } from '../printer/printer';
import { buildKot } from '../printer/escpos';
import { PLATFORMS } from '../aggregators';

const PREP_TIMES = [10, 15, 20, 30, 45];
const REJECT_REASONS = ['Item out of stock', 'Kitchen too busy', 'Outlet closing', 'Cannot deliver to address'];
const STATUS_LABEL = {
  placed: 'New', accepted: 'Preparing', ready: 'Ready', picked_up: 'Picked up',
  delivered: 'Delivered', rejected: 'Rejected', cancelled: 'Cancelled',
};
const STATUS_CLS = {
  placed: 'bg-red-100 text-red-700', accepted: 'bg-amber-100 text-amber-700', ready: 'bg-green-100 text-green-700',
  picked_up: 'bg-blue-100 text-blue-700', delivered: 'bg-gray-100 text-gray-700',
  rejected: 'bg-gray-200 text-gray-600', cancelled: 'bg-gray-200 text-gray-600',
};
const POLL_MS = 15000;

const minutesAgo = (t) => Math.max(0, Math.round((Date.now() - new Date(t)) / 60000));

// KOT lines in the shape KotTicket / buildKot expect (add-ons and notes as "+" lines).
const kotItems = (order) =>
  order.items.map((i) => ({
    key: i.id,
    qty: i.qty,
    name: i.name,
    subitems: [
      ...(i.addons || []).map((a, n) => ({ id: `a${n}`, name: a.name })),
      ...(i.instructions ? [{ id: 'note', name: `Note: ${i.instructions}` }] : []),
    ],
  }));

function OrderCard({ order, platform, busyId, onStatus, onKot }) {
  const busy = busyId === order.id;
  const [prepTime, setPrepTime] = useState(20);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const age = minutesAgo(order.status === 'placed' ? order.placed_at : order.accepted_at || order.placed_at);
  // Promised time passed and still in the kitchen.
  const late = order.status === 'accepted' && order.prep_time && age > order.prep_time;

  const btn = 'px-3 py-1.5 rounded-md text-sm font-semibold disabled:opacity-50';

  return (
    <div className={'bg-white rounded-lg shadow p-3 space-y-2 border-l-4 ' + (late ? 'border-red-500' : 'border-transparent')}
      style={order.status === 'placed' ? { borderLeftColor: platform.color } : undefined}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold">#{order.external_order_id}</div>
          <div className="text-xs text-gray-500">
            {order.customer_name || 'Customer'} · {order.order_type} · {order.payment_mode === 'cod' ? 'Cash on delivery' : 'Prepaid'}
          </div>
        </div>
        <div className={'text-xs font-semibold whitespace-nowrap ' + (late ? 'text-red-600' : 'text-gray-500')}>
          {age} min{order.status === 'accepted' && order.prep_time ? ` / ${order.prep_time}` : ''}
        </div>
      </div>

      <ul className="text-sm divide-y">
        {order.items.map((i) => (
          <li key={i.id} className="py-1">
            <div className="flex justify-between gap-2">
              <span><strong>{i.qty} ×</strong> {i.name}{!i.product_id && <span title="Not matched to a POS product" className="text-amber-600"> *</span>}</span>
              <span className="text-gray-500">{money(i.amount)}</span>
            </div>
            {(i.addons || []).map((a, n) => <div key={n} className="text-xs text-gray-500 pl-4">+ {a.name}</div>)}
            {i.instructions && <div className="text-xs text-amber-700 pl-4">Note: {i.instructions}</div>}
          </li>
        ))}
      </ul>

      {order.instructions && (
        <div className="text-xs bg-amber-50 text-amber-800 rounded p-2">📝 {order.instructions}</div>
      )}
      {order.rider_name && (
        <div className="text-xs text-gray-600">🛵 {order.rider_name}{order.rider_phone ? ` · ${order.rider_phone}` : ''}</div>
      )}

      <div className="flex justify-between text-sm font-semibold border-t pt-2">
        <span>Total</span>
        <span>{money(order.total)}</span>
      </div>

      {order.status === 'placed' && !rejecting && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={prepTime} onChange={(e) => setPrepTime(Number(e.target.value))}
            className="rounded-md border px-2 py-1.5 text-sm" aria-label="Preparation time">
            {PREP_TIMES.map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
          <button disabled={busy} onClick={() => onStatus(order, 'accepted', { prep_time: prepTime })}
            className={btn + ' bg-green-600 text-white hover:bg-green-700 flex-1'}>
            Accept
          </button>
          <button disabled={busy} onClick={() => setRejecting(true)}
            className={btn + ' bg-gray-100 text-gray-700 hover:bg-gray-200'}>
            Reject
          </button>
        </div>
      )}
      {order.status === 'placed' && rejecting && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm flex-1" aria-label="Reject reason">
            {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button disabled={busy} onClick={() => onStatus(order, 'rejected', { reason })}
            className={btn + ' bg-red-600 text-white hover:bg-red-700'}>
            Confirm reject
          </button>
          <button disabled={busy} onClick={() => setRejecting(false)} className={btn + ' text-gray-500'}>
            Back
          </button>
        </div>
      )}
      {order.status === 'accepted' && (
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => onStatus(order, 'ready')}
            className={btn + ' bg-brand text-white hover:bg-brand-dark flex-1'}>
            Mark ready
          </button>
          <button onClick={() => onKot(order)} className={btn + ' bg-gray-100 text-gray-700 hover:bg-gray-200'}>
            KOT
          </button>
        </div>
      )}
      {order.status === 'ready' && (
        <button disabled={busy} onClick={() => onStatus(order, 'picked_up')}
          className={btn + ' w-full bg-blue-600 text-white hover:bg-blue-700'}>
          Handed to rider
        </button>
      )}
    </div>
  );
}

function Column({ title, orders, empty, ...cardProps }) {
  return (
    <div className="flex flex-col min-h-0">
      <h2 className="font-semibold mb-2">
        {title} <span className="text-gray-400 font-normal">({orders.length})</span>
      </h2>
      <div className="space-y-3">
        {orders.length ? orders.map((o) => <OrderCard key={o.id} order={o} {...cardProps} />)
          : <p className="text-sm text-gray-400">{empty}</p>}
      </div>
    </div>
  );
}

// One aggregator's orders: New / Preparing / Ready columns, plus a list of finished ones.
export default function OnlineOrders() {
  const { platform: key } = useParams();
  const platform = PLATFORMS[key];
  const [view, setView] = useState('active');
  const [orders, setOrders] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [kot, setKot] = useState(null); // browser print fallback

  const load = useCallback(() => {
    if (!platform) return;
    api.get(`/aggregators/${key}/orders?view=${view}`)
      .then(setOrders)
      .catch((e) => console.error(e));
  }, [key, view, platform]);

  useEffect(() => {
    setOrders(null);
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // KOT straight to the thermal printer, else the browser print dialog.
  const printKot = useCallback(async (order) => {
    const job = { label: `${platform.label} #${order.external_order_id}`, items: kotItems(order) };
    if (printerStatus().connected) {
      try {
        await printBytes(buildKot(job));
        return;
      } catch (e) {
        toast.error('Printer failed (' + e.message + '). Opening print dialog instead.');
      }
    }
    setKot(job);
    setTimeout(() => window.print(), 50);
  }, [platform]);

  const changeStatus = useCallback(async (order, status, extra = {}) => {
    setBusyId(order.id);
    try {
      const updated = await api.post(`/aggregators/orders/${order.id}/status`, { status, ...extra });
      setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      if (updated.platform_synced === false) {
        toast(`${platform.label} API not configured — saved in POS only`, { icon: 'ℹ️' });
      }
      if (status === 'accepted') {
        toast.success(`Accepted #${order.external_order_id} (POS order #${updated.order_id})`);
        printKot(updated);
      }
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }, [platform, printKot, load]);

  const simulate = async () => {
    try {
      await api.post(`/aggregators/${key}/simulate`);
      toast.success('Test order received');
      setView('active');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!platform) return <Navigate to="/" replace />;

  const by = (s) => (orders || []).filter((o) => o.status === s);
  const cardProps = { platform, busyId, onStatus: changeStatus, onKot: printKot };
  const tab = (v, label) => (
    <button onClick={() => setView(v)}
      className={'px-3 py-1.5 rounded-md text-sm font-medium ' + (view === v ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:bg-white/60')}>
      {label}
    </button>
  );

  return (
    <div className="h-full overflow-y-auto bg-gray-100 p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold" style={{ color: platform.color }}>{platform.label} orders</h1>
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
          {tab('active', 'Active')}
          {tab('done', 'Completed')}
        </div>
        {process.env.NODE_ENV !== 'production' && (
          <button onClick={simulate} className="ml-auto px-3 py-1.5 rounded-md text-sm border border-dashed border-gray-400 text-gray-600 hover:bg-white">
            + Simulate test order
          </button>
        )}
      </div>

      {orders === null ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : view === 'active' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <Column title="New" orders={by('placed')} empty="No new orders." {...cardProps} />
          <Column title="Preparing" orders={by('accepted')} empty="Nothing in the kitchen." {...cardProps} />
          <Column title="Ready for pickup" orders={by('ready')} empty="Nothing waiting for a rider." {...cardProps} />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="p-2">Order</th><th className="p-2">Placed</th><th className="p-2">Customer</th>
                <th className="p-2">Items</th><th className="p-2 text-right">Total</th><th className="p-2">Status</th>
                <th className="p-2">POS #</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-2 font-medium">{o.external_order_id}</td>
                  <td className="p-2 whitespace-nowrap">{formattedDate(o.placed_at)}</td>
                  <td className="p-2">{o.customer_name || '—'}</td>
                  <td className="p-2">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</td>
                  <td className="p-2 text-right">{money(o.total)}</td>
                  <td className="p-2">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-semibold ' + STATUS_CLS[o.status]}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                    {o.reject_reason && <div className="text-xs text-gray-400">{o.reject_reason}</div>}
                  </td>
                  <td className="p-2">{o.order_id || '—'}</td>
                </tr>
              ))}
              {!orders.length && (
                <tr><td colSpan={7} className="p-4 text-center text-gray-400">No completed orders in the last 2 days.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {kot && <KotTicket label={kot.label} items={kot.items} />}
    </div>
  );
}
