// Database access for purchase / purchase_items. Every function takes an optional `conn`
// (a client from db.transaction) and falls back to the shared pool.
const { pool } = require('../db');

async function list(conn = pool) {
  const { rows } = await conn.query(
    `SELECT p.id, p.invoice_no, p.invoice_date, p.total, p.created_at,
            COUNT(pi.id)::int AS item_count
     FROM purchase p
     LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
     GROUP BY p.id
     ORDER BY p.invoice_date DESC NULLS LAST, p.id DESC`
  );
  return rows;
}

// lock = true takes a row lock so concurrent edits of one purchase can't double-adjust stock.
async function findById(id, { lock = false } = {}, conn = pool) {
  const { rows } = await conn.query(
    `SELECT id, invoice_no, invoice_date, total, created_at FROM purchase WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
    [id]
  );
  return rows[0] || null;
}

async function items(purchaseId, conn = pool) {
  const { rows } = await conn.query(
    `SELECT pi.id, pi.raw_product_id, rp.product_name, pi.product_qty, pi.product_unit,
            pi.subtotal, pi.expiry_date
     FROM purchase_items pi
     JOIN raw_products rp ON rp.id = pi.raw_product_id
     WHERE pi.purchase_id = $1
     ORDER BY pi.id`,
    [purchaseId]
  );
  return rows;
}

async function create({ invoice_no, invoice_date, total }, conn = pool) {
  const { rows } = await conn.query(
    'INSERT INTO purchase (invoice_no, invoice_date, total) VALUES ($1, $2, $3) RETURNING id',
    [invoice_no, invoice_date, total]
  );
  return rows[0];
}

async function update(id, { invoice_no, invoice_date, total }, conn = pool) {
  await conn.query(
    'UPDATE purchase SET invoice_no = $1, invoice_date = $2, total = $3 WHERE id = $4',
    [invoice_no, invoice_date, total, id]
  );
}

async function insertItems(purchaseId, lines, conn = pool) {
  await conn.query(
    `INSERT INTO purchase_items
       (purchase_id, raw_product_id, product_qty, product_unit, subtotal, expiry_date)
     SELECT $1::int, * FROM unnest($2::int[], $3::int[], $4::stock_unit[], $5::int[], $6::date[])`,
    [
      purchaseId,
      lines.map((l) => l.raw_product_id),
      lines.map((l) => l.product_qty),
      lines.map((l) => l.product_unit),
      lines.map((l) => l.subtotal),
      lines.map((l) => l.expiry_date),
    ]
  );
}

async function deleteItems(purchaseId, conn = pool) {
  await conn.query('DELETE FROM purchase_items WHERE purchase_id = $1', [purchaseId]);
}

async function remove(id, conn = pool) {
  await conn.query('DELETE FROM purchase WHERE id = $1', [id]);
}

module.exports = { list, findById, items, create, update, insertItems, deleteItems, remove };
