import { validateItems } from '../../shared/utils';

// values: { product_id, items: [{ raw_product_id, product_qty, product_unit }] }
// Returns { field: message }; empty when valid.
export function validateRecipe(values, products, rawProducts) {
  const errors = {};

  if (!values.product_id) errors.product_id = 'Select a product';
  else if (!products.some((p) => String(p.id) === values.product_id)) errors.product_id = 'Product does not exist';

  validateItems(values.items, rawProducts, errors);

  return errors;
}
