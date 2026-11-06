// Shared checks for the inventory module validators.
const db = require('../db');

const UNITS = ['gram', 'ml'];
const INT_MAX = 2147483647; // Postgres INT

// Whole number written as digits only (rejects 1.5, '1e3', true, '').
const isInt = (v) => (typeof v === 'number' || typeof v === 'string') && /^-?\d+$/.test(String(v).trim())
  && Math.abs(Number(v)) <= INT_MAX;
const isPositiveInt = (v) => isInt(v) && Number(v) > 0;
const isNonNegativeInt = (v) => isInt(v) && Number(v) >= 0;

// 'YYYY-MM-DD' that is a real calendar day (rejects 2026-02-30).
function isValidDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// Ids from `ids` that are not in raw_products.
async function missingRawProductIds(ids) {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const { rows } = await db.pool.query('SELECT id FROM raw_products WHERE id = ANY($1::int[])', [unique]);
  const found = new Set(rows.map((r) => r.id));
  return unique.filter((id) => !found.has(id));
}

// Checks an `items` array of { raw_product_id, product_qty, product_unit, ... } lines.
// Adds messages to `errors` keyed like 'items[0].product_qty'; returns the cleaned lines.
// extra(line, index, errors) validates/cleans the fields specific to one module.
async function validateItems(items, errors, extra = () => ({})) {
  if (!Array.isArray(items) || !items.length) {
    errors.items = 'add at least one raw product';
    return [];
  }
  if (items.length > 100) {
    errors.items = 'at most 100 raw products allowed';
    return [];
  }

  const seen = new Set();
  const clean = items.map((line, i) => {
    const l = line || {};
    const key = (f) => `items[${i}].${f}`;
    // Optional: the service fills in / checks it against the raw product's unit.
    const unit = isBlank(l.product_unit) ? null : l.product_unit;

    if (!isPositiveInt(l.raw_product_id)) errors[key('raw_product_id')] = 'select a raw product';
    else if (seen.has(Number(l.raw_product_id))) errors[key('raw_product_id')] = 'raw product is listed twice';
    else seen.add(Number(l.raw_product_id));

    if (!isPositiveInt(l.product_qty)) errors[key('product_qty')] = 'quantity must be a whole number above 0';
    if (unit !== null && !UNITS.includes(unit)) errors[key('product_unit')] = 'unit must be gram or ml';

    return {
      raw_product_id: Number(l.raw_product_id),
      product_qty: Number(l.product_qty),
      product_unit: unit,
      ...extra(l, i, errors),
    };
  });

  const ids = clean.map((l) => l.raw_product_id).filter((id) => isPositiveInt(id));
  const missing = new Set(await missingRawProductIds(ids));
  clean.forEach((l, i) => {
    if (missing.has(l.raw_product_id)) errors[`items[${i}].raw_product_id`] = 'raw product does not exist';
  });

  return clean;
}

// Express middleware factory: schema(req) -> { errors, value } (may be async).
// On errors responds 400 { error: <first message>, errors }; otherwise stores value on req.valid.
function validate(schema) {
  return async (req, res, next) => {
    const { errors, value } = await schema(req);
    const keys = Object.keys(errors);
    if (keys.length) {
      return res.status(400).json({ error: `${keys[0]}: ${errors[keys[0]]}`, errors });
    }
    req.valid = value;
    next();
  };
}

// Schema for routes that only take a positive :id.
function idParam(req) {
  const errors = {};
  if (!isPositiveInt(req.params.id)) errors.id = 'id must be a positive whole number';
  return { errors, value: { id: Number(req.params.id) } };
}

module.exports = {
  UNITS,
  isInt,
  isPositiveInt,
  isNonNegativeInt,
  isValidDate,
  isBlank,
  missingRawProductIds,
  validateItems,
  validate,
  idParam,
};
