import { api } from '../../../api';

// Inventory endpoints (server/routes/inventory.routes.js).
export const inventoryApi = {
  list: () => api.get('/inventory'),
  // editInventory
  edit: (inventoryId) => api.get(`/inventory/${inventoryId}`),
  // { raw_product_id, product_qty, product_unit }
  add: (payload) => api.post('/inventory', payload),
  // same as add plus inventory_id
  update: (payload) => api.post('/inventory/update', payload),
  remove: (inventoryId) => api.del(`/inventory/${inventoryId}`),
};
