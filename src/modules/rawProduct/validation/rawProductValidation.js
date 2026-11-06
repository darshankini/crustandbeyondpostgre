import { IMAGE_EXTENSIONS, MAX_IMAGE_BYTES } from '../utils/rawProductUtils';
import { UNITS } from '../../shared/utils';

// values: { product_name, product_unit, product_image: File | null }. Returns { field: message }; empty when valid.
export function validateRawProduct(values) {
  const errors = {};

  if (!values.product_name) errors.product_name = 'Product name is required';
  else if (values.product_name.length > 255) errors.product_name = 'At most 255 characters';

  if (!UNITS.includes(values.product_unit)) errors.product_unit = 'Gram or ml';

  const file = values.product_image;
  if (file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) errors.product_image = 'Only jpg, jpeg, png, svg or webp';
    else if (file.size > MAX_IMAGE_BYTES) errors.product_image = `Max 150 KB (this one is ${Math.ceil(file.size / 1024)} KB)`;
  }

  return errors;
}
