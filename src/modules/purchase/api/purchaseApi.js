import { api } from '../../../api';

// Purchase endpoints (server/routes/purchase.routes.js).
export const purchaseApi = {
  list: () => api.get('/purchases'),
  // editPurchase: one purchase with its items
  edit: (purchaseId) => api.get(`/purchases/${purchaseId}`),
  // { invoice_no, invoice_date, total, items: [{ raw_product_id, product_qty, product_unit, subtotal, expiry_date? }] }
  add: (payload) => api.post('/purchases', payload),
  // same as add plus purchase_id
  update: (payload) => api.post('/purchases/update', payload),
  remove: (purchaseId) => api.del(`/purchases/${purchaseId}`),
};
