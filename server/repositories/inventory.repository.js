// Database access for inventory (current stock per raw product). Every function takes an
// optional `conn` (a client from db.transaction) and falls back to the shared pool.
const { pool } = require('../db');

const SELECT = `
  SELECT i.id, i.raw_product_id, rp.product_name, rp.product_image,
         i.product_qty, i.product_unit, i.created_at,
         -- held by printed KOTs (already taken out of product_qty)
         (SELECT COALESCE(SUM(l.qty), 0)::int FROM stock_reservation_lines l
           WHERE l.raw_product_id = i.raw_product_id) AS reserved_qty
  FROM inventory i
  JOIN raw_products rp ON rp.id = i.raw_product_id`;

async function list(conn = pool) {
  const { rows } = await conn.query(`${SELECT} ORDER BY rp.product_name`);
  return rows;
}

async function findById(id, conn = pool) {
  const { rows } = await conn.query(`${SELECT} WHERE i.id = $1`, [id]);
  return rows[0] || null;
}

async function create({ raw_product_id, product_qty, product_unit }, conn = pool) {
  const { rows } = await conn.query(
    `INSERT INTO inventory (raw_product_id, product_qty, product_unit)
     VALUES ($1, $2, $3) RETURNING id`,
    [raw_product_id, product_qty, product_unit]
  );
  return rows[0];
}

async function update(id, { raw_product_id, product_qty, product_unit }, conn = pool) {
  const { rows } = await conn.query(
    `UPDATE inventory SET raw_product_id = $1, product_qty = $2, product_unit = $3
     WHERE id = $4 RETURNING id`,
    [raw_product_id, product_qty, product_unit, id]
  );
  return rows[0] || null;
}

async function remove(id, conn = pool) {
  const { rows } = await conn.query('DELETE FROM inventory WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

// Name + unit of each raw product.
async function rawUnits(rawProductIds, conn = pool) {
  const { rows } = await conn.query(
    'SELECT id AS raw_product_id, product_name, product_unit FROM raw_products WHERE id = ANY($1::int[])',
    [rawProductIds]
  );
  return rows;
}

async function lockStock(rawProductIds, conn = pool) {
  await conn.query(
    'SELECT id FROM raw_products WHERE id = ANY($1::int[]) ORDER BY id FOR NO KEY UPDATE',
    [rawProductIds]
  );
  return readStock(rawProductIds, conn);
}

// Current stock of these raw products without locking (0 when there is no inventory row).
async function readStock(rawProductIds, conn = pool) {
  const { rows } = await conn.query(
    `SELECT rp.id AS raw_product_id, rp.product_name, rp.product_unit,
            COALESCE(i.product_qty, 0) AS product_qty
     FROM raw_products rp
     LEFT JOIN inventory i ON i.raw_product_id = rp.id
     WHERE rp.id = ANY($1::int[])
     ORDER BY rp.id`,
    [rawProductIds]
  );
  return rows;
}

async function adjust(lines, conn = pool) {
  if (!lines.length) return;
  await conn.query(
    `WITH d AS (
       SELECT * FROM unnest($1::int[], $2::int[], $3::stock_unit[]) AS t(raw_product_id, qty, unit)
     ), updated AS (
       UPDATE inventory i SET product_qty = i.product_qty + d.qty
       FROM d WHERE i.raw_product_id = d.raw_product_id
       RETURNING i.raw_product_id
     )
     INSERT INTO inventory (raw_product_id, product_qty, product_unit)
     SELECT d.raw_product_id, d.qty, d.unit FROM d
     WHERE d.raw_product_id NOT IN (SELECT raw_product_id FROM updated)`,
    [lines.map((l) => l.raw_product_id), lines.map((l) => l.qty), lines.map((l) => l.unit)]
  );
}

async function recipeNeeds(sales, conn = pool) {
  if (!sales.length) return [];
  const { rows } = await conn.query(
    `SELECT ri.raw_product_id, rp.product_unit AS unit, SUM(ri.qty * t.qty)::int AS qty
     FROM unnest($1::int[], $2::int[]) AS t(product_id, qty)
     JOIN recipe r        ON r.product_id = t.product_id
     JOIN recipe_items ri    ON ri.recipe_id = r.id
     JOIN raw_products rp ON rp.id = ri.raw_product_id
     GROUP BY ri.raw_product_id, rp.product_unit`,
    [sales.map((s) => s.product_id), sales.map((s) => s.qty)]
  );
  return rows;
}

// Records what a bill took out of stock: [{ raw_product_id, qty, unit }] (qty positive).
async function insertOrderStock(orderId, lines, conn = pool) {
  if (!lines.length) return;
  await conn.query(
    `INSERT INTO order_inventory (order_id, raw_product_id, qty, unit)
     SELECT $1::int, * FROM unnest($2::int[], $3::int[], $4::stock_unit[])`,
    [orderId, lines.map((l) => l.raw_product_id), lines.map((l) => l.qty), lines.map((l) => l.unit)]
  );
}

// Products and quantities on an order (to hand a cancelled order back to its cart's KOT reservation).
async function orderProducts(orderId, conn = pool) {
  const { rows } = await conn.query(
    `SELECT product_id AS id, SUM(qty)::int AS qty FROM order_items
     WHERE order_id = $1 AND product_id IS NOT NULL GROUP BY product_id`,
    [orderId]
  );
  return rows;
}

async function setOrderReservation(orderId, key, conn = pool) {
  await conn.query('UPDATE orders SET reservation_key = $1 WHERE id = $2', [key, orderId]);
}

async function orderStock(orderId, conn = pool) {
  const { rows } = await conn.query(
    'SELECT raw_product_id, qty, unit FROM order_inventory WHERE order_id = $1',
    [orderId]
  );
  return rows;
}

// Updates low-stock flags for these raw products: clears the flag where stock is back at or
// above `threshold`, sets it where stock fell below. Returns the rows that just became low.
async function flagLowStock(rawProductIds, threshold, conn = pool) {
  await conn.query(
    `UPDATE inventory SET low_stock_alerted = false
     WHERE raw_product_id = ANY($1::int[]) AND low_stock_alerted AND product_qty >= $2`,
    [rawProductIds, threshold]
  );
  const { rows } = await conn.query(
    `UPDATE inventory i SET low_stock_alerted = true
     FROM raw_products rp
     WHERE rp.id = i.raw_product_id
       AND i.raw_product_id = ANY($1::int[]) AND NOT i.low_stock_alerted AND i.product_qty < $2
     RETURNING i.raw_product_id, rp.product_name, i.product_qty, i.product_unit`,
    [rawProductIds, threshold]
  );
  return rows;
}

// Clears low-stock flags so the next stock change alerts again (used when an email failed).
async function clearLowStockFlags(rawProductIds, conn = pool) {
  await conn.query(
    'UPDATE inventory SET low_stock_alerted = false WHERE raw_product_id = ANY($1::int[])',
    [rawProductIds]
  );
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  rawUnits,
  lockStock,
  readStock,
  adjust,
  recipeNeeds,
  insertOrderStock,
  orderStock,
  orderProducts,
  setOrderReservation,
  flagLowStock,
  clearLowStockFlags,
};
