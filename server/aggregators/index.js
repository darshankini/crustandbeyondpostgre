// Food aggregator adapters (Zomato, Swiggy).
// Each adapter turns the platform's webhook payload into one normalised order shape and
// sends our status changes back, so routes/aggregator.routes.js never sees platform formats.
//
// Normalised event (what parse() returns):
// {
//   event: 'order' | 'cancel' | 'status',
//   external_order_id, outlet_id,
//   status?,                 // 'status' events: 'picked_up' | 'delivered' | 'rider_assigned' ...
//   reason?,                 // 'cancel' events
//   order_type, customer: { name, phone }, delivery_address, instructions,
//   items: [{ external_item_id, name, price, qty, addons: [{ name, price }], instructions }],
//   subtotal, packaging_charge, delivery_charge, taxes, discount, total, payment_mode,
//   rider: { name, phone } | null,
//   placed_at,
// }
const adapters = {
  zomato: require('./zomato'),
  swiggy: require('./swiggy'),
};

module.exports = { adapters };
