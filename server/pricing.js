// Products are priced per unit and sold by quantity.
// Sub-items (bread, sauce, toppings...) add to the unit price, so they're charged once per unit.
const subitemsTotal = (subitems) =>
  (Array.isArray(subitems) ? subitems : []).reduce((s, x) => s + Number(x.price || 0), 0);

// Full line amount: (unit price + sub-items) x qty, rounded to the paisa (matches the client).
const itemTotal = (item) =>
  Math.round((Number(item.price) + subitemsTotal(item.subitems)) * Number(item.qty) * 100) / 100;

module.exports = { subitemsTotal, itemTotal };
