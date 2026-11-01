const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../auth');
const { adapters } = require('../aggregators');

// Online orders from Zomato / Swiggy.
//   POST /api/aggregators/:platform/webhook   the platform pushes new orders / cancellations / rider updates
//   GET  /api/aggregators/summary             new-order counts per platform (header badge)
//   GET  /api/aggregators/:platform/orders    list for the platform's tab (?view=active|done|all)
//   POST /api/aggregators/orders/:id/status   accept / reject / ready / picked_up / delivered from the POS
//   POST /api/aggregators/:platform/simulate  create a test order locally (not in production)

// Status changes the POS may make, from -> allowed next statuses.
const POS_TRANSITIONS = {
  placed: ['accepted', 'rejected'],
  accepted: ['ready'],
  ready: ['picked_up'],
  picked_up: ['delivered'],
};
// Changes the platform is told about (the rest are tracked locally only).
const PUSHED = ['accepted', 'rejected', 'ready'];
const ACTIVE = ['placed', 'accepted', 'ready'];
const TIME_COLUMN = { accepted: 'accepted_at', ready: 'ready_at' };

function adapterFor(req, res) {
  const adapter = adapters[req.params.platform];
  if (!adapter) res.status(404).json({ error: 'unknown platform' });
  return adapter;
}

// Orders with their items, newest first.
async function loadOrders(where, params) {
  const [orders] = await db.query(
    `SELECT * FROM aggregator_orders WHERE ${where} ORDER BY placed_at DESC, id DESC LIMIT 100`,
    params
  );
  if (!orders.length) return [];
  const [items] = await db.query(
    'SELECT * FROM aggregator_order_items WHERE aggregator_order_id = ANY($1::int[]) ORDER BY id',
    [orders.map((o) => o.id)]
  );
  for (const o of orders) {
    delete o.raw_payload;
    o.items = items.filter((i) => i.aggregator_order_id === o.id);
  }
  return orders;
}

const logStatus = (conn, id, status, source, note = null) =>
  conn.query(
    'INSERT INTO aggregator_status_log (aggregator_order_id, status, source, note) VALUES ($1, $2, $3, $4)',
    [id, status, source, note]
  );

// Save a new order. The platform may retry a webhook, so a repeat of the same order id is a no-op.
async function saveOrder(conn, platform, o, payload) {
  const { rows: [row] } = await conn.query(
    `INSERT INTO aggregator_orders
     (platform, external_order_id, outlet_id, order_type, customer_name, customer_phone,
      delivery_address, instructions, subtotal, packaging_charge, delivery_charge, taxes,
      discount, total, payment_mode, rider_name, rider_phone, raw_payload, placed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
             COALESCE($19::timestamptz, now()))
     ON CONFLICT (platform, external_order_id) DO NOTHING
     RETURNING id`,
    [
      platform, o.external_order_id, o.outlet_id, o.order_type, o.customer.name, o.customer.phone,
      o.delivery_address, o.instructions, o.subtotal, o.packaging_charge, o.delivery_charge, o.taxes,
      o.discount, o.total, o.payment_mode, o.rider?.name || null, o.rider?.phone || null,
      payload, o.placed_at,
    ]
  );
  if (!row) return { duplicate: true };

  for (const i of o.items) {
    // Mapped platform item id first, otherwise a product with the same name.
    const { rows: [match] } = await conn.query(
      `SELECT product_id FROM aggregator_menu_map WHERE platform = $1 AND external_item_id = $2
       UNION ALL
       SELECT id FROM products WHERE lower(name) = lower($3)
       LIMIT 1`,
      [platform, i.external_item_id || '', i.name]
    );
    await conn.query(
      `INSERT INTO aggregator_order_items
       (aggregator_order_id, external_item_id, product_id, name, price, qty, amount, addons, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        row.id, i.external_item_id, match?.product_id || null, i.name, i.price, i.qty,
        Math.round(i.price * i.qty * 100) / 100, JSON.stringify(i.addons), i.instructions,
      ]
    );
  }
  await logStatus(conn, row.id, 'placed', 'platform');
  return { id: row.id };
}

// Cancellations and rider / delivery updates for an order we already have.
async function applyPlatformUpdate(conn, platform, o) {
  const { rows: [row] } = await conn.query(
    'SELECT id, status, order_id FROM aggregator_orders WHERE platform = $1 AND external_order_id = $2 FOR UPDATE',
    [platform, o.external_order_id]
  );
  if (!row) return { unknown: true };

  const status = o.event === 'cancel' ? 'cancelled' : o.status;
  // Rider assignment only fills in the rider; it doesn't move the kitchen status.
  const newStatus = status && status !== 'rider_assigned' && !['rejected', 'cancelled', 'delivered'].includes(row.status)
    ? status
    : row.status;

  await conn.query(
    `UPDATE aggregator_orders
     SET status = $2, rider_name = COALESCE($3, rider_name), rider_phone = COALESCE($4, rider_phone),
         reject_reason = COALESCE($5, reject_reason), updated_at = now()
     WHERE id = $1`,
    [row.id, newStatus, o.rider?.name || null, o.rider?.phone || null, o.event === 'cancel' ? o.reason : null]
  );
  // A cancelled order is no longer a sale: drop the POS order created on accept
  // (the aggregator record keeps the full history).
  if (newStatus === 'cancelled' && row.order_id) {
    await conn.query('DELETE FROM orders WHERE id = $1', [row.order_id]);
  }
  if (status) await logStatus(conn, row.id, status, 'platform', o.reason);
  return { id: row.id };
}

// Store a parsed platform event inside a transaction.
async function ingest(platform, parsed, payload) {
  const conn = await db.pool.connect();
  try {
    await conn.query('BEGIN');
    const result = parsed.event === 'order'
      ? await saveOrder(conn, platform, parsed, payload)
      : await applyPlatformUpdate(conn, platform, parsed);
    await conn.query('COMMIT');
    return result;
  } catch (e) {
    await conn.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}

// Accepting an order books it as a POS sale: orders + order_items (add-ons as sub-items)
// + a completed payment, with source = platform. Taxes and delivery stay on the platform's side.
async function createPosOrder(conn, agg) {
  const { rows: items } = await conn.query(
    'SELECT * FROM aggregator_order_items WHERE aggregator_order_id = $1 ORDER BY id',
    [agg.id]
  );
  const total = Math.round((Number(agg.subtotal) + Number(agg.packaging_charge)) * 100) / 100;
  const discount = Math.min(Number(agg.discount), total);
  const finalTotal = Math.round((total - discount) * 100) / 100;

  const { rows: [order] } = await conn.query(
    `INSERT INTO orders (total, discount_type, discount, discount_amount, final_total, item_count, source)
     VALUES ($1, $2, $3, $3, $4, $5, $6) RETURNING id`,
    [total, discount > 0 ? 'flat' : null, discount, finalTotal, items.length, agg.platform]
  );

  for (const i of items) {
    const addons = Array.isArray(i.addons) ? i.addons : [];
    const addonTotal = addons.reduce((s, a) => s + Number(a.price || 0), 0);
    const { rows: [line] } = await conn.query(
      `INSERT INTO order_items (order_id, product_id, name, price, qty, amount)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [order.id, i.product_id, i.name, Math.round((Number(i.price) - addonTotal) * 100) / 100, i.qty, i.amount]
    );
    if (addons.length) {
      await conn.query(
        `INSERT INTO order_item_subitems (order_item_id, subitem_id, group_name, name, price)
         SELECT $1::int, NULL, 'Add-on', * FROM unnest($2::text[], $3::numeric[])`,
        [line.id, addons.map((a) => a.name), addons.map((a) => Number(a.price) || 0)]
      );
    }
  }

  // Prepaid: settled online through the platform. COD: the rider collects cash.
  const cod = agg.payment_mode === 'cod';
  await conn.query(
    `INSERT INTO payment (order_id, amount, cash, online, status) VALUES ($1, $2, $3, $4, 'Completed')`,
    [order.id, finalTotal, cod ? finalTotal : 0, cod ? 0 : finalTotal]
  );
  return order.id;
}

// POST /api/aggregators/:platform/webhook — called by the platform, authenticated by its signature.
router.post('/:platform/webhook', async (req, res) => {
  const adapter = adapterFor(req, res);
  if (!adapter) return;
  if (!adapter.verify(req)) return res.status(401).json({ error: 'invalid signature' });

  let parsed;
  try {
    parsed = adapter.parse(req.body || {});
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const result = await ingest(req.params.platform, parsed, req.body);
  if (result.unknown) return res.status(404).json({ error: 'order not found' });
  res.json({ ok: true, ...result });
});

// GET /api/aggregators/summary — { zomato: { new: 2, active: 5 }, ... }
router.get('/summary', requireAuth, async (_req, res) => {
  const [rows] = await db.query(
    `SELECT platform,
            COUNT(*) FILTER (WHERE status = 'placed') AS new,
            COUNT(*) FILTER (WHERE status = ANY($1::text[])) AS active
     FROM aggregator_orders
     WHERE status = ANY($1::text[])
     GROUP BY platform`,
    [ACTIVE]
  );
  const summary = Object.fromEntries(Object.keys(adapters).map((p) => [p, { new: 0, active: 0 }]));
  for (const r of rows) summary[r.platform] = { new: r.new, active: r.active };
  res.json(summary);
});

// GET /api/aggregators/:platform/orders?view=active|done|all
// active: waiting on the kitchen; done: everything else from the last 2 days.
router.get('/:platform/orders', requireAuth, async (req, res) => {
  if (!adapterFor(req, res)) return;
  const view = req.query.view || 'active';
  const where = {
    active: 'platform = $1 AND status = ANY($2::text[])',
    done: `platform = $1 AND NOT (status = ANY($2::text[])) AND placed_at > now() - interval '2 days'`,
    all: 'platform = $1 AND $2::text[] IS NOT NULL',
  }[view];
  if (!where) return res.status(400).json({ error: 'view must be active, done or all' });
  res.json(await loadOrders(where, [req.params.platform, ACTIVE]));
});

// POST /api/aggregators/orders/:id/status
// { status: 'accepted', prep_time } | { status: 'rejected', reason } | { status: 'ready' | 'picked_up' | 'delivered' }
router.post('/orders/:id/status', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid order id' });

  const status = req.body?.status;
  const reason = (typeof req.body?.reason === 'string' && req.body.reason.trim()) || null;
  const prepTime = Number(req.body?.prep_time);
  if (status === 'rejected' && !reason) return res.status(400).json({ error: 'reason required' });
  if (status === 'accepted' && !(Number.isInteger(prepTime) && prepTime > 0 && prepTime <= 180)) {
    return res.status(400).json({ error: 'prep_time must be 1-180 minutes' });
  }

  const conn = await db.pool.connect();
  try {
    await conn.query('BEGIN');
    const { rows: [agg] } = await conn.query('SELECT * FROM aggregator_orders WHERE id = $1 FOR UPDATE', [id]);
    if (!agg) {
      await conn.query('ROLLBACK');
      return res.status(404).json({ error: 'order not found' });
    }
    if (!(POS_TRANSITIONS[agg.status] || []).includes(status)) {
      await conn.query('ROLLBACK');
      return res.status(409).json({ error: `cannot mark a ${agg.status} order as ${status}` });
    }

    const orderId = status === 'accepted' ? await createPosOrder(conn, agg) : agg.order_id;
    await conn.query(
      `UPDATE aggregator_orders
       SET status = $2, order_id = $3, prep_time = COALESCE($4, prep_time),
           reject_reason = COALESCE($5, reject_reason), updated_at = now()
           ${TIME_COLUMN[status] ? `, ${TIME_COLUMN[status]} = now()` : ''}
       WHERE id = $1`,
      [id, status, orderId, status === 'accepted' ? prepTime : null, reason]
    );
    await logStatus(conn, id, status, 'pos', reason);

    // Tell the platform last, so a failed call rolls the change back and staff can retry.
    let pushed = null;
    if (PUSHED.includes(status)) {
      try {
        pushed = await adapters[agg.platform].pushStatus(agg.external_order_id, status, { prepTime, reason });
      } catch (e) {
        await conn.query('ROLLBACK');
        return res.status(502).json({ error: `${adapters[agg.platform].label} did not accept the update: ${e.message}` });
      }
    }

    await conn.query('COMMIT');
    const [order] = await loadOrders('id = $1', [id]);
    res.json({ ...order, platform_synced: pushed ? !pushed.skipped : null });
  } catch (e) {
    await conn.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
});

// POST /api/aggregators/:platform/simulate — a sample order built from real products and run
// through the same parse + save path as a webhook. Off in production unless AGGREGATOR_SIMULATOR=1.
router.post('/:platform/simulate', requireAuth, async (req, res) => {
  const adapter = adapterFor(req, res);
  if (!adapter) return;
  if (process.env.NODE_ENV === 'production' && process.env.AGGREGATOR_SIMULATOR !== '1') {
    return res.status(403).json({ error: 'simulator disabled' });
  }
  const [products] = await db.query('SELECT id, name, price FROM products WHERE is_active = 1');
  if (!products.length) return res.status(400).json({ error: 'add some products first' });

  const payload = adapter.samplePayload(products);
  const result = await ingest(req.params.platform, adapter.parse(payload), payload);
  res.status(201).json(result);
});

module.exports = router;
