const path = require('path');
const { UNITS, isPositiveInt, isBlank, idParam } = require('./common');

const MAX_IMAGE_BYTES = 150 * 1024; // 150 KB
const IMAGE_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

// Checks the file content matches its extension, so a renamed .exe can't pass as .png.
function contentMatches(ext, buf) {
  if (ext === '.jpg' || ext === '.jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === '.png') return buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (ext === '.webp') return buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  if (ext === '.svg') return /<svg[\s>]/i.test(buf.slice(0, 2048).toString('utf8'));
  return false;
}

// multipart/form-data: { raw_product_id (update only), product_name, product_unit (gram|ml, default gram),
//                        product_image? (file),
//                        remove_image? ('1' on update to clear the current image) }
function rawProductBody(req, { withId }) {
  const b = req.body || {};
  const errors = {};

  if (withId && !isPositiveInt(b.raw_product_id)) errors.raw_product_id = 'raw_product_id must be a positive whole number';

  const name = isBlank(b.product_name) ? '' : String(b.product_name).trim();
  if (!name) errors.product_name = 'product name is required';
  else if (name.length > 255) errors.product_name = 'product name must be at most 255 characters';

  const unit = isBlank(b.product_unit) ? 'gram' : b.product_unit;
  if (!UNITS.includes(unit)) errors.product_unit = 'unit must be gram or ml';

  const file = req.file || null;
  let ext = null;
  if (file) {
    ext = path.extname(file.originalname || '').toLowerCase();
    if (!IMAGE_TYPES[ext] || IMAGE_TYPES[ext] !== file.mimetype) {
      errors.product_image = 'image must be jpg, jpeg, png, svg or webp';
    } else if (file.size > MAX_IMAGE_BYTES) {
      errors.product_image = 'image must be 150 KB or smaller';
    } else if (!contentMatches(ext, file.buffer)) {
      errors.product_image = 'image file is not a valid ' + ext.slice(1);
    }
  }

  return {
    errors,
    value: {
      ...(withId && { id: Number(b.raw_product_id) }),
      product_name: name,
      product_unit: unit,
      image: file && { buffer: file.buffer, ext },
      remove_image: b.remove_image === '1' || b.remove_image === 'true',
    },
  };
}

module.exports = {
  MAX_IMAGE_BYTES,
  add: (req) => rawProductBody(req, { withId: false }),
  update: (req) => rawProductBody(req, { withId: true }),
  idParam,
};
