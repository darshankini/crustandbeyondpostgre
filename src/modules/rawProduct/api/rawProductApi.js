import { api } from '../../../api';

// Raw product endpoints (server/routes/rawProduct.routes.js).
// add / update send multipart FormData so the image goes with the form.
export const rawProductApi = {
  list: () => api.get('/raw-products'),
  // editRawProduct
  edit: (rawProductId) => api.get(`/raw-products/${rawProductId}`),
  // FormData { product_name, product_image? }
  add: (formData) => api.upload('/raw-products', formData),
  // FormData { raw_product_id, product_name, product_image?, remove_image? }
  update: (formData) => api.upload('/raw-products/update', formData),
  remove: (rawProductId) => api.del(`/raw-products/${rawProductId}`),
};
