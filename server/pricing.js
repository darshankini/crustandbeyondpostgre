// Products are priced per unit and sold by quantity.
// Sub-items (bread, sauce, toppings...) add to the unit price, so they're charged once per unit.
const subitemsTotal = (subitems) =>
  (Array.isArray(subitems) ? subitems : []).reduce((s, x) => s + Number(x.price || 0), 0);

// Full line amount: (unit price + sub-items) x qty, rounded to the paisa (matches the client).
const itemTotal = (item) =>
  Math.round((Number(item.price) + subitemsTotal(item.subitems)) * Number(item.qty) * 100) / 100;

const round2 = (n) => Math.round(n * 100) / 100;

// Normalise a discount to { type: 'flat' | 'percent' | null, value }. Anything invalid -> no discount.
const cleanDiscount = (type, value) => {
  const v = Number(value);
  if ((type !== 'flat' && type !== 'percent') || !Number.isFinite(v) || v <= 0) return { type: null, value: 0 };
  return { type, value: round2(type === 'percent' ? Math.min(v, 100) : v) };
};

// Rupees taken off `total`: a flat amount or a percentage, rounded to the nearest whole rupee and
// never more than the total (matches the client).
const discountAmount = (total, type, value) => {
  const d = cleanDiscount(type, value);
  if (!d.type) return 0;
  const off = d.type === 'percent' ? (total * d.value) / 100 : d.value;
  return Math.min(Math.round(off), total);
};

module.exports = { subitemsTotal, itemTotal, cleanDiscount, discountAmount };
