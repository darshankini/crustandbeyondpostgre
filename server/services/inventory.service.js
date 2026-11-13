// Stock business rules: manual inventory CRUD plus the stock movements caused by
// purchases (+), purchase edits (+/-), purchase deletes (-), bills (- via recipes) and
// cancelled bills (+). Stock never goes below zero, and the admin is emailed when an
// item drops below LOW_STOCK_THRESHOLD (default 1000 gram / ml = 1 kg / 1 L).
const { transaction } = require('../db');
const repo = require('../repositories/inventory.repository');
const reservations = require('../repositories/reservation.repository');
const { sendToAdmin } = require('../utils/mailer');
const { HttpError, rethrowDbError } = require('../utils/httpError');

const LOW_STOCK = Number(process.env.LOW_STOCK_THRESHOLD) || 1000;
const DUPLICATE = 'this raw product already has an inventory row; edit that one instead';

// 30000 gram -> "30 kg", 800 ml -> "800 ml"
function formatQty(qty, unit) {
  const [small, big] = unit === 'ml' ? ['ml', 'L'] : ['g', 'kg'];
  return Math.abs(qty) >= 1000 ? `${Number((qty / 1000).toFixed(3))} ${big}` : `${qty} ${small}`;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ---------------------------------------------------------------------------
// Units: every purchase / recipe / stock line uses its raw product's unit.

// Fills in a missing product_unit from the raw product and rejects a different one.
// lines: [{ raw_product_id, product_unit|null, ... }] -> same lines with product_unit set.
async function resolveUnits(lines, conn) {
  const raw = new Map((await repo.rawUnits(lines.map((l) => l.raw_product_id), conn))
    .map((r) => [r.raw_product_id, r]));
  return lines.map((l, i) => {
    const r = raw.get(l.raw_product_id);
    if (!r) throw new HttpError(400, 'raw product does not exist', { [`items[${i}].raw_product_id`]: 'raw product does not exist' });
    if (l.product_unit && l.product_unit !== r.product_unit) {
      throw new HttpError(400, `${r.product_name} is measured in ${r.product_unit}, not ${l.product_unit}`, {
        [`items[${i}].product_unit`]: `must be ${r.product_unit}`,
      });
    }
    return { ...l, product_unit: r.product_unit };
  });
}

// ---------------------------------------------------------------------------
// Low-stock alerts

async function sendLowStockAlert(items) {
  const names = items.map((i) => i.product_name).join(', ');
  const lines = items.map((i) => `${i.product_name}: ${formatQty(i.product_qty, i.product_unit)} left`);
  const limit = `${formatQty(LOW_STOCK, 'gram')} / ${formatQty(LOW_STOCK, 'ml')}`;
  try {
    await sendToAdmin({
      subject: `Low stock: ${names} will get out of stock`,
      text: `Hello,\n\n${names} will get out of stock. Please order.\n\n${lines.map((l) => `- ${l}`).join('\n')}`
        + `\n\nThis alert is sent when an item drops below ${limit}.\n\nCrust & Beyond POS`,
      html: `<p>Hello,</p><p><strong>${escapeHtml(names)}</strong> will get out of stock. Please order.</p>`
        + `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
        + `<p style="color:#666">This alert is sent when an item drops below ${limit}.</p><p>Crust &amp; Beyond POS</p>`,
    });
  } catch (error) {
    // Let the next stock change for these items try again.
    console.error('Low-stock email failed:', error.message);
    await repo.clearLowStockFlags(items.map((i) => i.raw_product_id)).catch(() => {});
  }
}

// Flags raw products that just fell below the limit and emails the admin once the
// transaction commits (one email per item until it is topped up again).
async function checkLowStock(rawProductIds, conn) {
  if (!rawProductIds.length) return;
  const newlyLow = await repo.flagLowStock(rawProductIds, LOW_STOCK, conn);
  if (newlyLow.length) conn.afterCommit(() => sendLowStockAlert(newlyLow));
}

// ---------------------------------------------------------------------------
// Stock movements

const LOCK_WAIT = '5s';

// Row-locks the raw products for the rest of the transaction (see repo.lockStock) and returns
// their stock. If another cashier's bill holds them for longer than LOCK_WAIT, gives up with
// a 409 instead of leaving this cashier waiting.
async function lockStock(ids, conn) {
  await conn.query(`SET LOCAL lock_timeout = '${LOCK_WAIT}'`);
  try {
    return await repo.lockStock(ids, conn);
  } catch (error) {
    if (error.code === '55P03') throw new HttpError(409, 'These items are being billed at another counter. Please try again.');
    throw error;
  }
}

// Throws 409 naming every raw product whose stock (rows from lockStock) can't cover its
// change in `net` (Map raw_product_id -> signed qty).
function assertEnough(stock, net) {
  const short = stock.filter((s) => s.product_qty + net.get(s.raw_product_id) < 0);
  if (!short.length) return;
  const detail = short.map((s) => `${s.product_name} (needs ${formatQty(-net.get(s.raw_product_id), s.product_unit)}, `
    + `${formatQty(s.product_qty, s.product_unit)} in stock)`);
  throw new HttpError(409, `Not enough stock: ${detail.join(', ')}`);
}

// Products sold [{ id (product id), qty }] -> [{ product_id, qty }], skipping lines without a product.
const toSales = (items) => items
  .filter((i) => Number.isInteger(Number(i.id)) && Number(i.id) > 0)
  .map((i) => ({ product_id: Number(i.id), qty: Number(i.qty) }));

// Applies signed changes [{ raw_product_id, qty }] (several lines per raw product are summed).
// Throws 409 naming every raw product that would go below zero, and changes nothing then.
// Returns the applied lines [{ raw_product_id, qty, unit }]. Must run inside db.transaction.
async function applyChanges(changes, conn) {
  const net = new Map();
  for (const c of changes) net.set(c.raw_product_id, (net.get(c.raw_product_id) || 0) + c.qty);
  const ids = [...net.keys()].filter((id) => net.get(id) !== 0);
  if (!ids.length) return [];

  const stock = await lockStock(ids, conn);
  assertEnough(stock, net);

  const lines = stock.map((s) => ({ raw_product_id: s.raw_product_id, qty: net.get(s.raw_product_id), unit: s.product_unit }));
  await repo.adjust(lines, conn);
  await checkLowStock(ids, conn);
  return lines;
}

// sign = +1 adds purchase lines to stock, -1 takes them back out.
const purchaseChanges = (lines, sign) =>
  lines.map((l) => ({ raw_product_id: l.raw_product_id, qty: sign * l.product_qty }));

// Signed changes that put reservation / order lines [{ raw_product_id, qty }] back into stock (+)
// or take recipe needs out of it (-).
const plus = (lines) => lines.map((l) => ({ raw_product_id: l.raw_product_id, qty: l.qty }));
const minus = (lines) => lines.map((l) => ({ raw_product_id: l.raw_product_id, qty: -l.qty }));

// Bill saved: take each sold product's recipe quantities out of stock and remember them for a
// cancel. items: [{ id (product id), qty }]. Throws 409 if stock is short.
// reservationKey: the cart's KOT reservation is used up here — its stock goes back and the
// bill's needs come out in one locked step, so the stock the KOT held is never up for grabs.
async function deductForOrder(orderId, items, conn, reservationKey = null) {
  const held = reservationKey ? await reservations.take(reservationKey, {}, conn) : { lines: [] };
  const needs = await repo.recipeNeeds(toSales(items), conn);
  await applyChanges([...plus(held.lines), ...minus(needs)], conn);
  await repo.insertOrderStock(orderId, needs, conn);
  // Only an order that really used a KOT reservation hands its stock back to the cart on cancel.
  if (held.lines.length) await repo.setOrderReservation(orderId, reservationKey, conn);
}

async function restoreForOrder(orderId, conn, reservationKey = null) {
  const taken = await repo.orderStock(orderId, conn);
  if (!reservationKey) {
    await applyChanges(plus(taken), conn);
    return;
  }
  const held = await reservations.take(reservationKey, {}, conn); // normally empty: checkout used it
  const lines = mergeLines([...held.lines, ...taken]);
  const products = mergeLines([...held.products, ...(await repo.orderProducts(orderId, conn))], 'id');
  await reservations.save(reservationKey, products, lines, conn);
}

// Sums lines that share the same key field (raw_product_id for stock lines, id for products).
function mergeLines(lines, field = 'raw_product_id') {
  const byKey = new Map();
  for (const l of lines) {
    const prev = byKey.get(l[field]);
    byKey.set(l[field], prev ? { ...prev, qty: prev.qty + l.qty } : { ...l });
  }
  return [...byKey.values()];
}

// ---------------------------------------------------------------------------
// Manual inventory CRUD (opening stock, stock-take corrections)

const list = () => repo.list();

async function get(id) {
  const row = await repo.findById(id);
  if (!row) throw new HttpError(404, 'inventory not found');
  return row;
}

function save(data, id) {
  return transaction(async (conn) => {
    const [line] = await resolveUnits([data], conn);
    await lockStock([line.raw_product_id], conn);
    const row = id ? await repo.update(id, line, conn) : await repo.create(line, conn);
    if (!row) throw new HttpError(404, 'inventory not found');
    await checkLowStock([line.raw_product_id], conn);
    return repo.findById(row.id, conn);
  }).catch((error) => rethrowDbError(error, { unique: DUPLICATE }));
}

const add = (data) => save(data);
const update = ({ id, ...data }) => save(data, id);

async function remove(id) {
  if (!(await repo.remove(id))) throw new HttpError(404, 'inventory not found');
}

module.exports = {
  LOW_STOCK,
  list,
  get,
  add,
  update,
  remove,
  resolveUnits,
  applyChanges,
  purchaseChanges,
  toSales,
  plus,
  minus,
  mergeLines,
  deductForOrder,
  restoreForOrder,
};
