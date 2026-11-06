// Recipes: which raw products (and how much) go into one unit of a product.
// Bills use them to take stock out of inventory (see inventory.service deductForOrder).
const { transaction } = require('../db');
const repo = require('../repositories/recipe.repository');
const inventory = require('./inventory.service');
const { HttpError, rethrowDbError } = require('../utils/httpError');

const DUPLICATE = 'this product already has a recipe; edit that one instead';

const list = () => repo.list();

async function get(id, conn) {
  const recipe = await repo.findById(id, conn);
  if (!recipe) throw new HttpError(404, 'recipe not found');
  return { ...recipe, items: await repo.items(id, conn) };
}

async function add({ product_id, items }) {
  try {
    return await transaction(async (conn) => {
      const lines = await inventory.resolveUnits(items, conn);
      const { id } = await repo.create(product_id, conn);
      await repo.insertItems(id, lines, conn);
      return get(id, conn);
    });
  } catch (error) {
    return rethrowDbError(error, { unique: DUPLICATE });
  }
}

async function update({ id, product_id, items }) {
  try {
    return await transaction(async (conn) => {
      if (!(await repo.update(id, product_id, conn))) throw new HttpError(404, 'recipe not found');
      const lines = await inventory.resolveUnits(items, conn);
      await repo.deleteItems(id, conn);
      await repo.insertItems(id, lines, conn);
      return get(id, conn);
    });
  } catch (error) {
    return rethrowDbError(error, { unique: DUPLICATE });
  }
}

async function remove(id) {
  if (!(await repo.remove(id))) throw new HttpError(404, 'recipe not found');
}

module.exports = { list, get: (id) => get(id), add, update, remove };
