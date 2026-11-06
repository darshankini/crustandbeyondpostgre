import { isInt, unitOf } from '../../shared/utils';

// values: { raw_product_id, product_qty, product_unit }. Returns { field: message }; empty when valid.
// product_unit is mapped from the raw product, so it only has to match it.
export function validateInventory(values, rawProducts) {
  const errors = {};
  const unit = unitOf(rawProducts, values.raw_product_id);

  if (!values.raw_product_id) errors.raw_product_id = 'Select a raw product';
  else if (!unit) errors.raw_product_id = 'Raw product does not exist';
  else if (values.product_unit !== unit) errors.product_unit = `Must be ${unit}`;

  if (!isInt(values.product_qty) || Number(values.product_qty) < 0) errors.product_qty = 'Whole number, 0 or more';

  return errors;
}
