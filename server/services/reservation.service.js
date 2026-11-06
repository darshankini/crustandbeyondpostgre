// KOT stock reservations. Printing a KOT reserves the cart's raw products: the stock leaves
// inventory at once (other counters see it as gone) and stays held for that cart until
// - checkout uses it (inventory.service.deductForOrder), or
// - the cart is cleared (release), or
// - it is left alone for reservation.repository.TTL_MINUTES (releaseExpired).
// Every change runs in one transaction under the same row locks as bills, so two counters
// can never reserve or sell the same last unit.
const { transaction } = require('../db');
const repo = require('../repositories/reservation.repository');
const inventoryRepo = require('../repositories/inventory.repository');
const inventory = require('./inventory.service');

// Active reservations. Also releases expired ones (at most once a minute per process): every
// POS polls this list, so expiry works even where server.js's timer doesn't run (Vercel).
let lastSweep = 0;
async function list() {
  if (Date.now() - lastSweep > 60 * 1000) {
    lastSweep = Date.now();
    await releaseExpired().catch((e) => console.error('Reservation sweep failed:', e.message));
  }
  return repo.list();
}

// (Re)reserve stock for the whole cart. A reprinted KOT replaces the cart's earlier reservation:
// the old one is released and the new one taken in one step, so the cart only needs stock for
// what it added. Throws 409 (and keeps the old reservation) if stock can't cover the cart.
// items: [{ id (product id), qty }]
function reserve(key, items) {
  return transaction(async (conn) => {
    const held = await repo.take(key, {}, conn);
    const sales = inventory.toSales(items);
    const needs = await inventoryRepo.recipeNeeds(sales, conn);
    await inventory.applyChanges([...inventory.plus(held.lines), ...inventory.minus(needs)], conn);
    if (!needs.length) return { reservation_key: key, products: [], expires_at: null }; // nothing tracked
    const products = inventory.mergeLines(sales.map((s) => ({ id: s.product_id, qty: s.qty })), 'id');
    return repo.save(key, products, needs, conn);
  });
}

// Cart cleared: put its reserved stock back. Safe to call when there is nothing reserved.
function release(key, { onlyExpired = false } = {}) {
  return transaction(async (conn) => {
    const held = await repo.take(key, { onlyExpired }, conn);
    await inventory.applyChanges(inventory.plus(held.lines), conn);
    return held.lines.length > 0;
  });
}

// Releases reservations nobody checked out or cleared in time. Each in its own transaction,
// re-checking expiry under the lock in case the cart printed a fresh KOT meanwhile.
async function releaseExpired() {
  let released = 0;
  for (const key of await repo.expiredKeys()) {
    try {
      if (await release(key, { onlyExpired: true })) released += 1;
    } catch (error) {
      console.error(`Releasing expired reservation ${key} failed:`, error.message);
    }
  }
  return released;
}

module.exports = { list, reserve, release, releaseExpired };
