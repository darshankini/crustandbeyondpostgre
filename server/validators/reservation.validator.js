const { isPositiveInt } = require('./common');

// Reservation key = the POS cart id (e.g. 'cart_5ghxktz').
const KEY = /^[A-Za-z0-9_-]{1,64}$/;

// POST body: { reservation_key, items: [{ id (product id), qty }] }
function reserve(req) {
  const b = req.body || {};
  const errors = {};

  if (!KEY.test(b.reservation_key || '')) errors.reservation_key = 'reservation_key must be the cart id';

  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) errors.items = 'add at least one product';
  else if (items.length > 200) errors.items = 'at most 200 lines allowed';
  items.forEach((it, i) => {
    if (!isPositiveInt(it?.id)) errors[`items[${i}].id`] = 'product id must be a positive whole number';
    if (!isPositiveInt(it?.qty)) errors[`items[${i}].qty`] = 'qty must be a whole number above 0';
  });

  return {
    errors,
    value: { key: b.reservation_key, items: items.map((it) => ({ id: Number(it?.id), qty: Number(it?.qty) })) },
  };
}

// DELETE /:key
function keyParam(req) {
  const errors = {};
  if (!KEY.test(req.params.key || '')) errors.key = 'reservation key must be the cart id';
  return { errors, value: { key: req.params.key } };
}

module.exports = { KEY, reserve, keyParam };
