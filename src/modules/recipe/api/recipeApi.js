import { api } from '../../../api';

// Recipe endpoints (server/routes/recipe.routes.js).
export const recipeApi = {
  list: () => api.get('/recipes'),
  // editRecipe: one recipe with its raw items
  edit: (recipeId) => api.get(`/recipes/${recipeId}`),
  // { product_id, items: [{ raw_product_id, product_qty, product_unit }] } — qty per ONE unit of the product
  add: (payload) => api.post('/recipes', payload),
  // same as add plus recipe_id
  update: (payload) => api.post('/recipes/update', payload),
  remove: (recipeId) => api.del(`/recipes/${recipeId}`),
  // sellable products to pick from
  products: () => api.get('/products'),
};
