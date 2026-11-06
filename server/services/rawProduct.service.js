// Raw products master. Images are written to server/uploads/raw_products only after the
// request passed validation, and replaced / deleted files are cleaned up.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const repo = require('../repositories/rawProduct.repository');
const { HttpError, rethrowDbError } = require('../utils/httpError');
const { UPLOAD_DIR } = require('../utils/uploads');

const IMAGE_DIR = path.join(UPLOAD_DIR, 'raw_products');
const URL_PATH = '/uploads/raw_products/';
const DUPLICATE = 'a raw product with this name already exists';
const IN_USE = 'this raw product is used in purchases or recipes; remove it there first';

// Saves the image and returns its absolute URL. baseUrl: e.g. https://api.example.com
async function saveImage(image, baseUrl) {
  try {
    await fs.promises.mkdir(IMAGE_DIR, { recursive: true });
    await fs.promises.access(IMAGE_DIR, fs.constants.W_OK);
  } catch {
    throw new HttpError(500, 'image upload folder is not writable');
  }
  const filename = `rp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${image.ext}`;
  await fs.promises.writeFile(path.join(IMAGE_DIR, filename), image.buffer);
  return `${baseUrl}${URL_PATH}${filename}`;
}

// Deletes an image this service saved; URLs pointing anywhere else are left alone.
async function deleteImage(url) {
  if (!url || !url.includes(URL_PATH)) return;
  const filename = path.basename(url);
  await fs.promises.unlink(path.join(IMAGE_DIR, filename)).catch(() => {});
}

const list = () => repo.list();

async function get(id) {
  const row = await repo.findById(id);
  if (!row) throw new HttpError(404, 'raw product not found');
  return row;
}

async function add({ product_name, product_unit, image }, baseUrl) {
  const product_image = image ? await saveImage(image, baseUrl) : null;
  try {
    return await repo.create({ product_name, product_unit, product_image });
  } catch (error) {
    await deleteImage(product_image);
    return rethrowDbError(error, { unique: DUPLICATE });
  }
}

async function update({ id, product_name, product_unit, image, remove_image }, baseUrl) {
  const current = await get(id);
  // Stock, purchases and recipes are all counted in this unit, so it can't change once used.
  if (product_unit !== current.product_unit && await repo.isUsed(id)) {
    throw new HttpError(409, `${current.product_name} is already used in stock, purchases or recipes, so its unit stays ${current.product_unit}`, {
      product_unit: `must stay ${current.product_unit}`,
    });
  }
  const newImage = image ? await saveImage(image, baseUrl) : null;
  const product_image = newImage || (remove_image ? null : current.product_image);
  try {
    const row = await repo.update(id, { product_name, product_unit, product_image });
    if (!row) throw new HttpError(404, 'raw product not found');
    if (product_image !== current.product_image) await deleteImage(current.product_image);
    return row;
  } catch (error) {
    await deleteImage(newImage);
    return rethrowDbError(error, { unique: DUPLICATE });
  }
}

async function remove(id) {
  try {
    const row = await repo.remove(id);
    if (!row) throw new HttpError(404, 'raw product not found');
    await deleteImage(row.product_image);
  } catch (error) {
    rethrowDbError(error, { foreignKey: IN_USE });
  }
}

module.exports = { list, get, add, update, remove };
