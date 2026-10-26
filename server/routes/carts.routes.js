const router = require('express').Router();
const db = require('../db');
const { itemTotal, cleanDiscount } = require('../pricing');

// Keep only the fields we store for a chosen sub-item.
const cleanSubitems = (list) =>
  (Array.isArray(list) ? list : []).map((x) => ({
    id: Number(x.id),
    group_name: String(x.group_name || ''),
    name: String(x.name || ''),
    price: Number(x.price) || 0,
  }));

// GET /api/carts
// Returns all open carts with display-ready items (name/image joined from products):
// [ { cart_id, discount_type, discount, items: [{ id, name, price, image, qty, subitems }] } ]
router.get('/', async (_req, res) => {
  const [carts] = await db.query('SELECT id, cart_id, discount_type, discount FROM cart ORDER BY id');
  if (!carts.length) return res.json([]);

  const ids = carts.map((c) => c.id);
  const [items] = await db.query(
    `SELECT ci.cart_id AS cref, ci.product_id AS id, p.name, ci.price, p.image, ci.qty, ci.subitems
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ANY($1::int[])
     ORDER BY ci.id`,
    [ids]
  );

  const byCart = {};
  for (const it of items) {
    (byCart[it.cref] = byCart[it.cref] || []).push({
      id: it.id,
      name: it.name,
      price: Number(it.price),
      image: it.image,
      qty: it.qty,
      subitems: it.subitems ? JSON.parse(it.subitems) : [],
    });
  }

  res.json(carts.map((c) => ({
    cart_id: c.cart_id,
    discount_type: c.discount_type,
    discount: Number(c.discount) || 0,
    items: byCart[c.id] || [],
  })));
});

// PUT /api/carts
// Full-state sync. Body: { carts: [{ cart_id, discount_type, discount, items: [{ id, price, qty, subitems }] }] }.
// Replaces every stored cart in one transaction so the DB always mirrors the client.
router.put('/', async (req, res) => {
  const carts = Array.isArray(req.body?.carts) ? req.body.carts : [];

  
  const conn = await db.pool.connect();
  try {
    await conn.query('BEGIN');
    await conn.query('DELETE FROM cart_items');
    await conn.query('DELETE FROM cart');

    for (const c of carts) {
      const list = Array.isArray(c.items) ? c.items : [];
      const total = list.reduce((s, i) => s + itemTotal({ ...i, subitems: cleanSubitems(i.subitems) }), 0);
      const itemCount = list.length;
      const d = cleanDiscount(c.discount_type, c.discount);

      const { rows: [r] } = await conn.query(
        'INSERT INTO cart (cart_id, cart_total, item_count, discount_type, discount) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [String(c.cart_id), total, itemCount, d.type, d.value]
      );
      const cid = r.id;


      for (const it of list) {
        const subs = cleanSubitems(it.subitems);
        await conn.query(
          'INSERT INTO cart_items (cart_id, product_id, price, qty, subitems) VALUES ($1, $2, $3, $4, $5)',
          [cid, Number(it.id), Number(it.price), Number(it.qty), subs.length ? JSON.stringify(subs) : null]
        );
      }
    }

    await conn.query('COMMIT');
    res.json({ ok: true, carts: carts.length });
  } catch (error) {
    await conn.query('ROLLBACK').catch(() => {});
    console.error('Cart sync failed:', error);
    res.status(500).json({ error: error.message || 'Failed to sync carts' });
  } finally {
    conn.release();
  }
});

module.exports = router;
