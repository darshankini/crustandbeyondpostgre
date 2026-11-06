// Fields of one purchase line as read from the form.
export const ITEM_FIELDS = ['raw_product_id', 'product_qty', 'product_unit', 'subtotal', 'expiry_date'];

// Invoice total from the lines' subtotals (blank / invalid subtotals count as 0).
export const sumSubtotals = (items) =>
  items.reduce((s, l) => s + (/^\d+$/.test(l.subtotal) ? Number(l.subtotal) : 0), 0);
