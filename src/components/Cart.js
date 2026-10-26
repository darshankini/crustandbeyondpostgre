import { useState, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { api } from '../api';
import { money } from './Layout';
import CartItem from './CartItem';
import Receipt from './Receipt';
import KotTicket from './KotTicket';
import CustomerModal from './CustomerModal';
import toast from 'react-hot-toast';
import { status as printerStatus, printBytes } from '../printer/printer';
import { buildReceipt, buildKot } from '../printer/escpos';

export default function Cart({ onClose, onEditOptions }) {
  const {
    items, inc, dec, setQty, remove, clear, total, count,
    sessions, activeId, addSession, selectSession, clearSessions, clearCurrentSession
  } = useCart();
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null); // { order, items, total } awaiting customer modal
  // What the browser print dialog shows: { type: 'bill', order, items, customer } or { type: 'kot', label, items }.
  const [printData, setPrintData] = useState(null);
  const cartLabel = sessions.find((s) => s.id === activeId)?.label;

  // Print a Kitchen Order Ticket for the current cart. Doesn't check out or clear the cart,
  // so it can be sent to the kitchen before the customer pays.
  const printKot = useCallback(async () => {
    if (!items.length) return;
    const job = { label: cartLabel, items: items.slice() };
    if (printerStatus().connected) {
      try {
        await printBytes(buildKot(job));
        toast.success('KOT sent to printer');
        return;
      } catch (e) {
        toast.error('Printer failed (' + e.message + '). Opening print dialog instead.');
      }
    }
    setPrintData({ type: 'kot', ...job });
    setTimeout(() => window.print(), 50);
  }, [items, cartLabel]);

  // Clearing every cart is destructive, so confirm when there's anything to lose.
  const handleClearSessions = useCallback(() => {
    const hasStuff = sessions.length > 1 || sessions.some((s) => s.count > 0);
    if (hasStuff && !window.confirm('Clear all carts? This removes every cart session.')) return;
    clearSessions();
  }, [sessions, clearSessions]);

  const handleClearCurrentSession = useCallback((id) => {
    const hasStuff = sessions.some((s) => s.id === id && s.count > 0);
    if(hasStuff &&!window.confirm('Are you sure you want to clear the current cart?')) return;
    clearCurrentSession(id);
  },[sessions,clearCurrentSession])

  // Step 1: create + save the order, then open the customer modal (order is saved either way).
  const checkout = useCallback(async () => {
    if (!items.length || busy) return;
    setBusy(true);
    try {
      const order = await api.post('/orders', {
        items: items.map(({ id, name, price, qty, subitems }) => ({ id, name, price, qty, subitems: subitems || [] })),
      });
      setPending({ order, items: items.slice(), total });
    } catch (e) {
      alert('Checkout failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }, [items, busy, total]);

  // Print the customer bill for the pending order (optionally with customer details), then clear the cart.
  // Goes straight to the connected thermal printer; otherwise (or if that fails) the browser print dialog.
  const finishAndPrint = useCallback(
    async (customer) => {
      const { order, items: snapshot } = pending;
      setPrintData({ type: 'bill', order, items: snapshot, customer });
      setPending(null);
      if (printerStatus().connected) {
        try {
          await printBytes(buildReceipt({ order, items: snapshot, customer }));
          clear();
          return;
        } catch (e) {
          toast.error('Printer failed (' + e.message + '). Opening print dialog instead.');
        }
      }
      setTimeout(() => {
        window.print();
        clear();
      }, 50);
    },
    [pending, clear]
  );



  // Step 2a: customer skipped — just print.
  const skipCustomer = useCallback(() => finishAndPrint(null), [finishAndPrint]);

  // Step 2b: customer gave details — save them against the order, then print.
  const saveCustomer = useCallback(
    async (customer) => {
      setSaving(true);
      try {
        await api.post(`/orders/${pending.order.id}/customer`, customer);
      } catch (e) {
        // Order is already saved; warn but still print the receipt.
        alert('Could not save customer details: ' + e.message);
      } finally {
        setSaving(false);
      }
      finishAndPrint(customer);
    },
    [pending, finishAndPrint]
  );

  return (
    <section className="w-full h-full flex flex-col bg-white border-l">
      {/* Cart sessions: horizontally scrollable tabs + add / clear-all controls */}
      <div className="shrink-0 flex items-center gap-1 border-b px-2 py-1.5">
        <div className="flex-1 min-w-0 flex gap-1 overflow-x-auto">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSession(s.id)}
              className={
                'shrink-0 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition ' +
                (s.id === activeId ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
              }
            >
              <div className='flex items-center'>
              {s.label}
              {s.count > 0 && (
                <span
                  className={
                    'ml-1.5 rounded-full px-1.5 text-xs tabular-nums ' +
                    (s.id === activeId ? 'bg-white/25' : 'bg-gray-300 text-gray-700')
                  }
                >
                  {s.count}
                </span>
              )}
              <span
                title="Clear current carts"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearCurrentSession(s.id);
                }}
                aria-label="Clear current carts"
                className={`ml-1.5 rounded-md `+ (s.id === activeId ? 'text-white-500 hover:bg-white-50' : 'text-red-500 hover:bg-red-50')}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </span>
              </div>

            </button>
          ))}
        </div>
        <button
          onClick={addSession}
          title="New cart"
          aria-label="New cart"
          className="shrink-0 h-8 w-8 grid place-items-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xl leading-none"
        >
          +
        </button>
        <button
          onClick={handleClearSessions}
          title="Clear all carts"
          aria-label="Clear all carts"
          className="shrink-0 h-8 w-8 grid place-items-center rounded-md text-red-500 hover:bg-red-50"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>

      <div className="h-12 shrink-0 px-4 flex items-center justify-between border-b">
        <h2 className="font-semibold">Current Order</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{count} item{count !== 1 ? 's' : ''}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden -mr-2 p-2 text-gray-500 hover:text-gray-800 text-xl leading-none"
              aria-label="Close cart"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Scrollable line items */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            Cart is empty — tap a product to add.
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((i) => (
              <CartItem key={i.key} item={i} onInc={inc} onDec={dec} onSetQty={setQty} onRemove={remove} onEditOptions={onEditOptions}/>
            ))}
          </ul>
        )}
      </div>

      {/* Totals + actions */}
      <div className="shrink-0 border-t p-4 space-y-3">
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-brand tabular-nums">{money(total)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={clear}
            disabled={!items.length}
            className="col-span-2 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium disabled:opacity-40"
          >
            Clear
          </button>
          <button
            onClick={printKot}
            disabled={!items.length}
            title="Print kitchen ticket (no prices). Doesn't check out."
            className="py-2.5 rounded-md border-2 border-brand text-brand hover:bg-brand/10 text-sm sm:text-base font-semibold disabled:opacity-40"
          >
            Print KOT
          </button>
          <button
            onClick={checkout}
            disabled={!items.length || busy}
            className="py-2.5 rounded-md bg-brand hover:bg-brand-dark text-white text-sm sm:text-base font-semibold leading-tight disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Checkout & Print Bill'}
          </button>
        </div>
      </div>

      {/* Post-checkout: ask for optional customer details before printing */}
      {pending && (
        <CustomerModal
          order={pending.order}
          total={pending.total}
          saving={saving}
          onSkip={skipCustomer}
          onSubmit={saveCustomer}
        />
      )}

      {/* Rendered off-screen; visible only during print */}
      {printData?.type === 'bill' && (
        <Receipt order={printData.order} items={printData.items} customer={printData.customer} />
      )}
      {printData?.type === 'kot' && <KotTicket label={printData.label} items={printData.items} />}
    </section>
  );
}
