import { isInt, isValidDate, validateItems } from '../../shared/utils';

// values: { invoice_no, invoice_date, items: [{ raw_product_id, product_qty, product_unit, subtotal, expiry_date }] }
// Returns { field: message }; empty when valid.
export function validatePurchase(values, rawProducts) {
  const errors = {};

  if (values.invoice_no.length > 255) errors.invoice_no = 'At most 255 characters';
  if (!isValidDate(values.invoice_date)) errors.invoice_date = 'Enter a valid date';

  validateItems(values.items, rawProducts, errors, (l, i) => {
    if (!isInt(l.subtotal) || Number(l.subtotal) < 0) errors[`items[${i}].subtotal`] = 'Whole number, 0 or more';
    if (l.expiry_date && !isValidDate(l.expiry_date)) errors[`items[${i}].expiry_date`] = 'Enter a valid date';
  });

  return errors;
}
