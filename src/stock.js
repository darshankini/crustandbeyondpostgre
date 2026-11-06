import { useSyncExternalStore } from 'react';
import { api } from './api';

// Stock availability on the POS screen.
// Products with a recipe carry `stock_available` (how many can still be made); null = not tracked.
// Printing a KOT reserves the cart's stock on the server (it leaves `stock_available` for every
// counter) until the cart is checked out or cleared. The server holds the real locks; these
// helpers keep the screen honest.

const EVENT = 'inventory:changed';

// Tell the POS to refetch products + reservations (after a KOT, checkout, cancel or clear).
export const notifyStockChanged = () => window.dispatchEvent(new Event(EVENT));

// Run cb whenever stock changed at this counter.
export function onStockChanged(cb) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

// Units of a product still free to add to this cart; Infinity when stock isn't tracked.
// reserved = units of it this cart's KOT already holds (they're out of stock_available but ours).
export const unitsLeft = (product, inCart, reserved = 0) =>
  product.stock_available == null ? Infinity : Math.max(0, product.stock_available + reserved - inCart);

// Message to show when one more unit can't be added.
export const limitMessage = (product, reserved = 0) => {
  const max = product.stock_available + reserved;
  return max > 0 ? `Only ${max} ${product.name} available` : `${product.name} is out of stock`;
};

// Units of `productId` in cart items (all its lines, whatever the sub-items).
export const qtyInCart = (items, productId) =>
  items.reduce((n, i) => (i.id === productId ? n + i.qty : n), 0);

// ---------------------------------------------------------------------------
// Shared store: latest stock per product and what each cart's KOT holds.
// The POS writes it on every refresh; the product grid and the cart read it.

let state = { products: new Map(), reserved: new Map() };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

// products: GET /products rows (search results only update the products they list).
export function setProductStock(products) {
  const next = new Map(state.products);
  for (const p of products) next.set(p.id, { id: p.id, name: p.name, stock_available: p.stock_available ?? null });
  state = { ...state, products: next };
  emit();
}

// reservations: GET /reservations rows -> cart id -> Map(product id -> qty held).
export function setReservations(reservations) {
  const next = new Map();
  for (const r of reservations) next.set(r.reservation_key, new Map((r.products || []).map((p) => [p.id, p.qty])));
  state = { ...state, reserved: next };
  emit();
}

const NONE = new Map();
export const useProductStock = () => useSyncExternalStore(subscribe, () => state.products);
// Map(product id -> units held) for one cart's KOT.
export const useReserved = (cartId) => useSyncExternalStore(subscribe, () => state.reserved.get(cartId) || NONE);

// ---------------------------------------------------------------------------
// Server calls

// KOT: (re)reserve stock for the whole cart. Returns null when reserved, else why not
// (e.g. "Not enough stock: Dough (needs 300 g, 200 g in stock)").
export async function reserveForKot(cartId, items) {
  try {
    await api.post('/reservations', { reservation_key: cartId, items: items.map(({ id, qty }) => ({ id, qty })) });
    return null;
  } catch (e) {
    return e.message;
  } finally {
    notifyStockChanged();
  }
}

// Cart cleared: give its KOT stock back. Harmless when the cart has none.
export async function releaseReservation(cartId) {
  try {
    await api.del(`/reservations/${encodeURIComponent(cartId)}`);
  } catch (e) {
    console.error('release reservation failed', e);
  } finally {
    notifyStockChanged();
  }
}
