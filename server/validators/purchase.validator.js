const {
  isPositiveInt, isNonNegativeInt, isValidDate, isBlank, validateItems, idParam,
} = require('./common');

// Body for add / update:
// { purchase_id (update only), invoice_no?, invoice_date, total,
//   items: [{ raw_product_id, product_qty, product_unit, subtotal, expiry_date? }] }
async function purchaseBody(req, { withId }) {
  const b = req.body || {};
  const errors = {};

  if (withId && !isPositiveInt(b.purchase_id)) errors.purchase_id = 'purchase_id must be a positive whole number';

  const invoiceNo = isBlank(b.invoice_no) ? null : String(b.invoice_no).trim();
  if (invoiceNo && invoiceNo.length > 255) errors.invoice_no = 'invoice no must be at most 255 characters';

  if (!isValidDate(b.invoice_date)) errors.invoice_date = 'invoice date must be a valid date (YYYY-MM-DD)';

  const items = await validateItems(b.items, errors, (l, i) => {
    if (!isNonNegativeInt(l.subtotal)) errors[`items[${i}].subtotal`] = 'subtotal must be a whole number of 0 or more';
    const expiry = isBlank(l.expiry_date) ? null : l.expiry_date;
    if (expiry !== null && !isValidDate(expiry)) errors[`items[${i}].expiry_date`] = 'expiry date must be a valid date';
    return { subtotal: Number(l.subtotal), expiry_date: expiry };
  });

  // The invoice total must add up; the server stores the sum it computes itself.
  const total = items.reduce((s, l) => s + (Number.isFinite(l.subtotal) ? l.subtotal : 0), 0);
  if (!isNonNegativeInt(b.total)) errors.total = 'total must be a whole number of 0 or more';
  else if (!errors.items && Number(b.total) !== total) errors.total = `total must equal the sum of subtotals (${total})`;

  return {
    errors,
    value: {
      ...(withId && { id: Number(b.purchase_id) }),
      invoice_no: invoiceNo,
      invoice_date: b.invoice_date,
      total,
      items,
    },
  };
}

module.exports = {
  add: (req) => purchaseBody(req, { withId: false }),
  update: (req) => purchaseBody(req, { withId: true }),
  idParam,
};
