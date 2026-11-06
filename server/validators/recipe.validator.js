const db = require('../db');
const { isPositiveInt, validateItems, idParam } = require('./common');

// Body for add / update:
// { recipe_id (update only), product_id, items: [{ raw_product_id, product_qty, product_unit }] }
// product_qty is the amount of the raw product used for ONE unit of the product.
async function recipeBody(req, { withId }) {
  const b = req.body || {};
  const errors = {};

  if (withId && !isPositiveInt(b.recipe_id)) errors.recipe_id = 'recipe_id must be a positive whole number';

  if (!isPositiveInt(b.product_id)) {
    errors.product_id = 'select a product';
  } else {
    const { rows } = await db.pool.query('SELECT 1 FROM products WHERE id = $1', [Number(b.product_id)]);
    if (!rows.length) errors.product_id = 'product does not exist';
  }

  const items = await validateItems(b.items, errors);

  return {
    errors,
    value: {
      ...(withId && { id: Number(b.recipe_id) }),
      product_id: Number(b.product_id),
      items,
    },
  };
}

module.exports = {
  add: (req) => recipeBody(req, { withId: false }),
  update: (req) => recipeBody(req, { withId: true }),
  idParam,
};
