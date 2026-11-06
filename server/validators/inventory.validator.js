const {
  UNITS, isInt, isPositiveInt, isBlank, missingRawProductIds, idParam,
} = require('./common');

// Body for add / update: { inventory_id (update only), raw_product_id, product_qty, product_unit }
// product_qty is in base units (gram / ml) and never below zero; the unit is the raw product's.
async function inventoryBody(req, { withId }) {
  const b = req.body || {};
  const errors = {};

  if (withId && !isPositiveInt(b.inventory_id)) errors.inventory_id = 'inventory_id must be a positive whole number';

  if (!isPositiveInt(b.raw_product_id)) errors.raw_product_id = 'select a raw product';
  else if ((await missingRawProductIds([Number(b.raw_product_id)])).length) errors.raw_product_id = 'raw product does not exist';

  if (!isInt(b.product_qty) || Number(b.product_qty) < 0) errors.product_qty = 'quantity must be a whole number of 0 or more';
  // Optional: taken from the raw product, which must match if one is sent.
  if (!isBlank(b.product_unit) && !UNITS.includes(b.product_unit)) errors.product_unit = 'unit must be gram or ml';

  return {
    errors,
    value: {
      ...(withId && { id: Number(b.inventory_id) }),
      raw_product_id: Number(b.raw_product_id),
      product_qty: Number(b.product_qty),
      product_unit: isBlank(b.product_unit) ? null : b.product_unit,
    },
  };
}

module.exports = {
  add: (req) => inventoryBody(req, { withId: false }),
  update: (req) => inventoryBody(req, { withId: true }),
  idParam,
};
