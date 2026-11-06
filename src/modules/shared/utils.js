// Helpers shared by the inventory module (purchase / recipe / inventory / raw products).

export const UNITS = ['gram', 'ml'];

// Below this many grams / ml an item counts as running out (the server emails the admin).
export const LOW_STOCK = 1000;

// Unit ('gram' | 'ml') of a raw product by id, '' if not found.
export const unitOf = (rawProducts, id) =>
  rawProducts.find((r) => String(r.id) === String(id))?.product_unit || '';

// Stock is stored in gram / ml; show big amounts as kg / L (30000 gram -> "30 kg").
export function formatQty(qty, unit) {
  const n = Number(qty);
  const [small, big] = unit === 'ml' ? ['ml', 'L'] : ['g', 'kg'];
  if (Math.abs(n) >= 1000) return `${Number((n / 1000).toFixed(3))} ${big}`;
  return `${n} ${small}`;
}

// 'YYYY-MM-DD' -> 'DD-MM-YYYY'
export const formatDay = (d) => (d ? d.split('-').reverse().join('-') : '—');

// Today as 'YYYY-MM-DD' in local time (for date inputs).
export function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Whole number written as digits only (rejects '1.5', '1e3', '').
export const isInt = (v) => /^-?\d+$/.test(String(v ?? '').trim()) && Math.abs(Number(v)) <= 2147483647;

// 'YYYY-MM-DD' that is a real calendar day (rejects 2026-02-30).
export function isValidDate(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// Checks item lines read from a form: [{ raw_product_id, product_qty, product_unit, ... }].
// Errors use the same keys as the API ('items[0].product_qty'), so server and client
// messages show up in the same place. extra(line, index, errors) adds module-specific checks.
export function validateItems(items, rawProducts, errors, extra = () => {}) {
  if (!items.length) {
    errors.items = 'Add at least one raw product';
    return;
  }
  const seen = new Set();
  items.forEach((l, i) => {
    const key = (f) => `items[${i}].${f}`;
    const unit = unitOf(rawProducts, l.raw_product_id);
    if (!l.raw_product_id) errors[key('raw_product_id')] = 'Select a raw product';
    else if (!unit) errors[key('raw_product_id')] = 'Raw product does not exist';
    else if (seen.has(l.raw_product_id)) errors[key('raw_product_id')] = 'Raw product is listed twice';
    seen.add(l.raw_product_id);

    if (!isInt(l.product_qty) || Number(l.product_qty) <= 0) errors[key('product_qty')] = 'Whole number above 0';
    // The unit is mapped from the raw product; a mismatch means the list changed under the form.
    if (unit && l.product_unit !== unit) errors[key('product_unit')] = `Must be ${unit}`;
    extra(l, i, errors);
  });
}

// Payload line for the API from a form line.
export const toItemPayload = (l) => ({
  raw_product_id: Number(l.raw_product_id),
  product_qty: Number(l.product_qty),
  product_unit: l.product_unit,
});
