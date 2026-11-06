import { rawProductApi } from '../api/rawProductApi';

// Builds the multipart body from validated form values.
function toFormData(values) {
  const fd = new FormData();
  fd.append('product_name', values.product_name);
  fd.append('product_unit', values.product_unit);
  if (values.product_image) fd.append('product_image', values.product_image);
  if (values.remove_image) fd.append('remove_image', '1');
  return fd;
}

export const listRawProducts = () => rawProductApi.list();
export const editRawProduct = (rawProductId) => rawProductApi.edit(rawProductId);
export const addRawProduct = (values) => rawProductApi.add(toFormData(values));
export function updateRawProduct(rawProductId, values) {
  const fd = toFormData(values);
  fd.append('raw_product_id', rawProductId);
  return rawProductApi.update(fd);
}
export const deleteRawProduct = (rawProductId) => rawProductApi.remove(rawProductId);
