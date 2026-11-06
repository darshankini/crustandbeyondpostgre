// Database access for recipe / recipe_items. Every function takes an optional `conn`
// (a client from db.transaction) and falls back to the shared pool.
const { pool } = require('../db');

async function list(conn = pool) {
  const { rows } = await conn.query(
    `SELECT r.id, r.product_id, p.name AS product_name, r.created_at,
            COUNT(ri.id)::int AS item_count
     FROM recipe r
     JOIN products p ON p.id = r.product_id
     LEFT JOIN recipe_items ri ON ri.recipe_id = r.id
     GROUP BY r.id, p.name
     ORDER BY p.name`
  );
  return rows;
}

async function findById(id, conn = pool) {
  const { rows } = await conn.query(
    `SELECT r.id, r.product_id, p.name AS product_name, r.created_at
     FROM recipe r JOIN products p ON p.id = r.product_id
     WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

// Lines are returned with the same field names the API accepts (product_qty / product_unit).
async function items(recipeId, conn = pool) {
  const { rows } = await conn.query(
    `SELECT ri.id, ri.raw_product_id, rp.product_name,
            ri.qty AS product_qty, ri.unit AS product_unit
     FROM recipe_items ri
     JOIN raw_products rp ON rp.id = ri.raw_product_id
     WHERE ri.recipe_id = $1
     ORDER BY ri.id`,
    [recipeId]
  );
  return rows;
}

async function create(productId, conn = pool) {
  const { rows } = await conn.query(
    'INSERT INTO recipe (product_id) VALUES ($1) RETURNING id',
    [productId]
  );
  return rows[0];
}

async function update(id, productId, conn = pool) {
  const { rows } = await conn.query(
    'UPDATE recipe SET product_id = $1 WHERE id = $2 RETURNING id',
    [productId, id]
  );
  return rows[0] || null;
}

async function insertItems(recipeId, lines, conn = pool) {
  await conn.query(
    `INSERT INTO recipe_items (recipe_id, raw_product_id, qty, unit)
     SELECT $1::int, * FROM unnest($2::int[], $3::int[], $4::stock_unit[])`,
    [
      recipeId,
      lines.map((l) => l.raw_product_id),
      lines.map((l) => l.product_qty),
      lines.map((l) => l.product_unit),
    ]
  );
}

async function deleteItems(recipeId, conn = pool) {
  await conn.query('DELETE FROM recipe_items WHERE recipe_id = $1', [recipeId]);
}

async function remove(id, conn = pool) {
  const { rows } = await conn.query('DELETE FROM recipe WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

module.exports = { list, findById, items, create, update, insertItems, deleteItems, remove };
