// Swiggy adapter.
//
// Like Zomato, Swiggy's POS integration API is partner-only: the webhook payload, signature
// header and status endpoint come with the docs Swiggy shares once the outlet is approved.
// Everything platform-specific lives in this file, so matching their spec means editing only
// parse(), verify() and pushStatus() below. The field names here are placeholders that follow
// the usual aggregator shape and accept a few common spellings.
//
// Env:
//   SWIGGY_WEBHOOK_SECRET  shared secret for the webhook signature (required in production)
//   SWIGGY_API_BASE        base URL of Swiggy's partner API   } leave unset to keep the POS offline:
//   SWIGGY_API_KEY         API key issued for the outlet      } status changes are saved locally only
//   SWIGGY_OUTLET_ID       our restaurant id on Swiggy
const { num, verifyHmac, postJson } = require('./common');

const SIGNATURE_HEADER = 'x-swiggy-signature';

// Swiggy event name -> normalised event. Unknown events are treated as status updates.
const EVENTS = {
  'order.placed': 'order',
  order_placed: 'order',
  new_order: 'order',
  'order.cancelled': 'cancel',
  order_cancelled: 'cancel',
};

// Swiggy status -> our status (for delivery executive updates they push to us).
const STATUSES = {
  de_assigned: 'rider_assigned',
  de_arrived: 'rider_assigned',
  rider_assigned: 'rider_assigned',
  picked_up: 'picked_up',
  pickedup: 'picked_up',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

function verify(req) {
  return verifyHmac(req, process.env.SWIGGY_WEBHOOK_SECRET, SIGNATURE_HEADER);
}

function parse(body) {
  const o = body.order || body.data || body;
  const externalId = o.order_id ?? o.id ?? body.order_id;
  if (externalId == null || externalId === '') throw new Error('order_id missing');

  const eventName = String(body.event || body.event_type || body.type || 'order.placed').toLowerCase();
  const event = EVENTS[eventName] || 'status';
  const bill = o.bill || o.charges || {};
  const customer = o.customer || {};
  const rider = o.delivery_executive || o.rider || null;

  const items = (o.items || o.order_items || []).map((i) => {
    const addons = (i.addons || i.variants || i.add_ons || []).map((a) => ({
      name: String(a.name || a.title || ''),
      price: num(a.price),
    }));
    const qty = Math.max(1, parseInt(i.quantity ?? i.qty ?? 1, 10) || 1);
    // price is the item alone; add-ons / variants are added on top, like POS sub-items.
    const price = num(num(i.price ?? i.unit_price) + addons.reduce((s, a) => s + a.price, 0));
    return {
      external_item_id: i.item_id != null ? String(i.item_id) : i.id != null ? String(i.id) : null,
      name: String(i.name || i.title || 'Item'),
      price,
      qty,
      addons,
      instructions: i.instructions || i.notes || null,
    };
  });

  const subtotal = bill.item_total != null ? num(bill.item_total)
    : o.subtotal != null ? num(o.subtotal)
    : num(items.reduce((s, i) => s + i.price * i.qty, 0));
  const packaging = num(bill.packing_charges ?? bill.packaging ?? o.packaging_charge);
  const delivery = num(bill.delivery_charges ?? bill.delivery ?? o.delivery_charge);
  const taxes = num(bill.gst ?? bill.taxes ?? o.taxes);
  const discount = num(bill.restaurant_discount ?? bill.discount ?? o.discount);
  const total = bill.total ?? o.order_total;

  return {
    event,
    external_order_id: String(externalId),
    outlet_id: body.restaurant_id ?? o.restaurant_id ?? body.outlet_id ?? null,
    status: STATUSES[String(o.status || body.status || '').toLowerCase()] || null,
    reason: o.cancel_reason || o.cancellation_reason || body.reason || null,
    order_type: String(o.order_type || 'delivery').toLowerCase(),
    customer: { name: customer.name || null, phone: customer.phone || customer.mobile || null },
    delivery_address: o.delivery_address || customer.address || null,
    instructions: o.instructions || o.cooking_instructions || null,
    items,
    subtotal,
    packaging_charge: packaging,
    delivery_charge: delivery,
    taxes,
    discount,
    total: total != null ? num(total) : num(subtotal + packaging + delivery + taxes - discount),
    payment_mode: String(o.payment_mode || o.payment_type || 'prepaid').toLowerCase(),
    rider: rider && (rider.name || rider.phone) ? { name: rider.name || null, phone: rider.phone || null } : null,
    placed_at: o.created_at || o.order_time || null,
  };
}

// Tell Swiggy about a status change made at the POS: 'accepted' (with prep_time),
// 'rejected' (with reason) or 'ready'. Returns { skipped: true } while not configured.
async function pushStatus(externalOrderId, status, { prepTime, reason } = {}) {
  const base = process.env.SWIGGY_API_BASE;
  return postJson(base && `${base.replace(/\/$/, '')}/orders/${encodeURIComponent(externalOrderId)}/status`,
    process.env.SWIGGY_API_KEY, {
      restaurant_id: process.env.SWIGGY_OUTLET_ID,
      status,
      prep_time: prepTime,
      reason,
    });
}

// A webhook body in Swiggy's format, for the local "simulate order" button.
function samplePayload(products) {
  const picks = products.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(3, products.length));
  const names = ['Ananya R.', 'Karan J.', 'Meera N.', 'Siddharth T.', 'Pooja V.'];
  return {
    event: 'order.placed',
    restaurant_id: process.env.SWIGGY_OUTLET_ID || 'LOCAL-TEST',
    order: {
      order_id: `STEST-${Date.now().toString().slice(-8)}`,
      order_type: 'delivery',
      created_at: new Date().toISOString(),
      customer: { name: names[Math.floor(Math.random() * names.length)], phone: '+91-XXXXXX5678' },
      delivery_address: 'House 4, Test Layout, Station Road',
      instructions: Math.random() < 0.5 ? 'Send cutlery' : null,
      items: picks.map((p) => ({
        item_id: `S${p.id}`,
        name: p.name,
        price: Number(p.price),
        quantity: 1 + Math.floor(Math.random() * 2),
        addons: [],
      })),
      bill: { packing_charges: 15, delivery_charges: 0, gst: 0, restaurant_discount: 0 },
      payment_mode: 'prepaid',
    },
  };
}

module.exports = { label: 'Swiggy', SIGNATURE_HEADER, verify, parse, pushStatus, samplePayload };
