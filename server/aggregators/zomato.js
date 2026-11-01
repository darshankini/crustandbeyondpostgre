// Zomato adapter.
//
// Zomato's POS integration API is partner-only: the exact webhook payload, signature header
// and status endpoint come with the integration docs Zomato shares once the outlet is approved.
// Everything platform-specific lives in this file, so matching their spec means editing only
// parse(), verify() and pushStatus() below. The field names here are placeholders that follow
// the usual aggregator shape and accept a few common spellings.
//
// Env:
//   ZOMATO_WEBHOOK_SECRET  shared secret for the webhook signature (required in production)
//   ZOMATO_API_BASE        base URL of Zomato's partner API   } leave unset to keep the POS offline:
//   ZOMATO_API_KEY         API key issued for the outlet      } status changes are saved locally only
//   ZOMATO_OUTLET_ID       our outlet id on Zomato
const { num, verifyHmac, postJson } = require('./common');

const SIGNATURE_HEADER = 'x-zomato-signature';

// Zomato event name -> normalised event. Unknown events are treated as status updates.
const EVENTS = {
  'order.placed': 'order',
  new_order: 'order',
  'order.cancelled': 'cancel',
  order_cancelled: 'cancel',
};

// Zomato status -> our status (for rider / delivery updates they push to us).
const STATUSES = {
  rider_assigned: 'rider_assigned',
  rider_arrived: 'rider_assigned',
  picked_up: 'picked_up',
  dispatched: 'picked_up',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

function verify(req) {
  return verifyHmac(req, process.env.ZOMATO_WEBHOOK_SECRET, SIGNATURE_HEADER);
}

function parse(body) {
  const o = body.order || body.data || body;
  const externalId = o.order_id ?? o.id ?? body.order_id;
  if (externalId == null || externalId === '') throw new Error('order_id missing');

  const eventName = String(body.event || body.type || 'order.placed').toLowerCase();
  const event = EVENTS[eventName] || 'status';
  const charges = o.charges || {};
  const customer = o.customer || {};
  const rider = o.rider || o.delivery_partner || null;

  const items = (o.items || o.order_items || []).map((i) => {
    const addons = (i.addons || i.add_ons || i.modifiers || []).map((a) => ({
      name: String(a.name || a.title || ''),
      price: num(a.price),
    }));
    const qty = Math.max(1, parseInt(i.quantity ?? i.qty ?? 1, 10) || 1);
    // unit_price is the item alone; add-ons are added on top, like POS sub-items.
    const price = num(num(i.unit_price ?? i.price) + addons.reduce((s, a) => s + a.price, 0));
    return {
      external_item_id: i.item_id != null ? String(i.item_id) : i.id != null ? String(i.id) : null,
      name: String(i.name || i.title || 'Item'),
      price,
      qty,
      addons,
      instructions: i.instructions || i.notes || null,
    };
  });

  const subtotal = o.subtotal != null ? num(o.subtotal) : num(items.reduce((s, i) => s + i.price * i.qty, 0));
  const packaging = num(charges.packaging ?? o.packaging_charge);
  const delivery = num(charges.delivery ?? o.delivery_charge);
  const taxes = num(o.taxes ?? o.tax);
  const discount = num(o.discount ?? o.merchant_discount);

  return {
    event,
    external_order_id: String(externalId),
    outlet_id: body.outlet_id ?? o.outlet_id ?? null,
    status: STATUSES[String(o.status || body.status || '').toLowerCase()] || null,
    reason: o.cancel_reason || body.reason || null,
    order_type: String(o.order_type || 'delivery').toLowerCase(),
    customer: { name: customer.name || null, phone: customer.phone || customer.mobile || null },
    delivery_address: o.delivery_address || customer.address || null,
    instructions: o.instructions || o.special_instructions || null,
    items,
    subtotal,
    packaging_charge: packaging,
    delivery_charge: delivery,
    taxes,
    discount,
    total: o.order_total != null ? num(o.order_total) : num(subtotal + packaging + delivery + taxes - discount),
    payment_mode: String(o.payment_mode || o.payment_method || 'prepaid').toLowerCase(),
    rider: rider && (rider.name || rider.phone) ? { name: rider.name || null, phone: rider.phone || null } : null,
    placed_at: o.created_at || o.placed_at || null,
  };
}

// Tell Zomato about a status change made at the POS: 'accepted' (with prep_time),
// 'rejected' (with reason) or 'ready'. Returns { skipped: true } while not configured.
async function pushStatus(externalOrderId, status, { prepTime, reason } = {}) {
  const base = process.env.ZOMATO_API_BASE;
  return postJson(base && `${base.replace(/\/$/, '')}/orders/${encodeURIComponent(externalOrderId)}/status`,
    process.env.ZOMATO_API_KEY, {
      outlet_id: process.env.ZOMATO_OUTLET_ID,
      status,
      prep_time: prepTime,
      reason,
    });
}

// A webhook body in Zomato's format, for the local "simulate order" button.
function samplePayload(products) {
  const picks = products.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(3, products.length));
  const names = ['Aarav S.', 'Priya K.', 'Rohan M.', 'Sneha D.', 'Vikram P.'];
  return {
    event: 'order.placed',
    outlet_id: process.env.ZOMATO_OUTLET_ID || 'LOCAL-TEST',
    order: {
      order_id: `ZTEST-${Date.now().toString().slice(-8)}`,
      order_type: 'delivery',
      created_at: new Date().toISOString(),
      customer: { name: names[Math.floor(Math.random() * names.length)], phone: '+91-XXXXXX1234' },
      delivery_address: 'Flat 12, Test Residency, MG Road',
      instructions: Math.random() < 0.5 ? 'Less spicy please' : null,
      items: picks.map((p) => ({
        item_id: `Z${p.id}`,
        name: p.name,
        unit_price: Number(p.price),
        quantity: 1 + Math.floor(Math.random() * 2),
        addons: [],
      })),
      charges: { packaging: 20, delivery: 0 },
      taxes: 0,
      discount: 0,
      payment_mode: 'prepaid',
    },
  };
}

module.exports = { label: 'Zomato', SIGNATURE_HEADER, verify, parse, pushStatus, samplePayload };
