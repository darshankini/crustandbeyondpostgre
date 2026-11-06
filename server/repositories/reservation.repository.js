// Database access for KOT stock reservations (stock_reservations + stock_reservation_lines).
// These functions only move reservation rows; the inventory side (taking stock out / putting
// it back) is done by the services through inventory.service.applyChanges.
const { pool } = require('../db');

// How long a KOT holds stock if the cart is never checked out or cleared.
const TTL_MINUTES = Number(process.env.RESERVATION_TTL_MINUTES) || 180;

// Removes a reservation and returns what it held: { products, lines: [{ raw_product_id, qty, unit }] }
// (empty when there is none). Row-locks the reservation first, so two requests for the same
// cart (e.g. a reprinted KOT and a checkout) can't both release it.
// onlyExpired: skip it unless it has expired (the sweep re-checks under the lock).
async function take(key, { onlyExpired = false } = {}, conn = pool) {
  const { rows: [head] } = await conn.query(
    `SELECT products FROM stock_reservations
     WHERE reservation_key = $1${onlyExpired ? ' AND expires_at < now()' : ''}
     FOR UPDATE`,
    [key]
  );
  if (!head) return { products: [], lines: [] };
  const { rows: lines } = await conn.query(
    'SELECT raw_product_id, qty, unit FROM stock_reservation_lines WHERE reservation_key = $1',
    [key]
  );
  await conn.query('DELETE FROM stock_reservations WHERE reservation_key = $1', [key]); // lines cascade
  return { products: head.products, lines };
}

// Stores a reservation (call take() first; this replaces any row left for the key).
// products: [{ id, qty }], lines: [{ raw_product_id, qty, unit }] with qty > 0.
async function save(key, products, lines, conn = pool) {
  const { rows: [head] } = await conn.query(
    `INSERT INTO stock_reservations (reservation_key, products, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))
     ON CONFLICT (reservation_key)
     DO UPDATE SET products = EXCLUDED.products, expires_at = EXCLUDED.expires_at, created_at = now()
     RETURNING reservation_key, products, created_at, expires_at`,
    [key, JSON.stringify(products), TTL_MINUTES]
  );
  await conn.query('DELETE FROM stock_reservation_lines WHERE reservation_key = $1', [key]);
  if (lines.length) {
    await conn.query(
      `INSERT INTO stock_reservation_lines (reservation_key, raw_product_id, qty, unit)
       SELECT $1, * FROM unnest($2::int[], $3::int[], $4::stock_unit[])`,
      [key, lines.map((l) => l.raw_product_id), lines.map((l) => l.qty), lines.map((l) => l.unit)]
    );
  }
  return head;
}

// Active reservations: [{ reservation_key, products, created_at, expires_at }].
async function list(conn = pool) {
  const { rows } = await conn.query(
    `SELECT reservation_key, products, created_at, expires_at
     FROM stock_reservations WHERE expires_at >= now() ORDER BY created_at`
  );
  return rows;
}

async function expiredKeys(conn = pool) {
  const { rows } = await conn.query(
    'SELECT reservation_key FROM stock_reservations WHERE expires_at < now()'
  );
  return rows.map((r) => r.reservation_key);
}

module.exports = { TTL_MINUTES, take, save, list, expiredKeys };
