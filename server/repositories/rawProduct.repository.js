// Database access for raw_products. Every function takes an optional `conn`
// (a client from db.transaction) and falls back to the shared pool.
const { pool } = require('../db');

const COLUMNS = 'id, product_name, product_unit, product_image, created_at';

async function list(conn = pool) {
  const { rows } = await conn.query(
    `SELECT rp.id, rp.product_name, rp.product_unit, rp.product_image, rp.created_at,
            i.product_qty
     FROM raw_products rp
     LEFT JOIN inventory i ON i.raw_product_id = rp.id
     ORDER BY rp.product_name`
  );
  return rows;
}

async function findById(id, conn = pool) {
  const { rows } = await conn.query(`SELECT ${COLUMNS} FROM raw_products WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create({ product_name, product_unit, product_image }, conn = pool) {
  const { rows } = await conn.query(
    `INSERT INTO raw_products (product_name, product_unit, product_image)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`,
    [product_name, product_unit, product_image]
  );
  return rows[0];
}

async function update(id, { product_name, product_unit, product_image }, conn = pool) {
  const { rows } = await conn.query(
    `UPDATE raw_products SET product_name = $1, product_unit = $2, product_image = $3
     WHERE id = $4
     RETURNING ${COLUMNS}`,
    [product_name, product_unit, product_image, id]
  );
  return rows[0] || null;
}

async function remove(id, conn = pool) {
  const { rows } = await conn.query(
    'DELETE FROM raw_products WHERE id = $1 RETURNING id, product_image',
    [id]
  );
  return rows[0] || null;
}

// True if stock, a purchase, a recipe or a bill refers to this raw product (its unit is then fixed).
async function isUsed(id, conn = pool) {
  const { rows } = await conn.query(
    `SELECT EXISTS (SELECT 1 FROM inventory       WHERE raw_product_id = $1)
         OR EXISTS (SELECT 1 FROM purchase_items  WHERE raw_product_id = $1)
         OR EXISTS (SELECT 1 FROM recipe_items       WHERE raw_product_id = $1)
         OR EXISTS (SELECT 1 FROM order_inventory WHERE raw_product_id = $1) AS used`,
    [id]
  );
  return rows[0].used;
}

module.exports = { list, findById, create, update, remove, isUsed };
