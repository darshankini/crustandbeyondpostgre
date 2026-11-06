import { recipeApi } from '../api/recipeApi';
import { toItemPayload } from '../../shared/utils';

// Builds the API payload from validated form values.
const toPayload = (values) => ({
  product_id: Number(values.product_id),
  items: values.items.map(toItemPayload),
});

export const listRecipes = () => recipeApi.list();
export const listProducts = () => recipeApi.products();
export const editRecipe = (recipeId) => recipeApi.edit(recipeId);
export const addRecipe = (values) => recipeApi.add(toPayload(values));
export const updateRecipe = (recipeId, values) => recipeApi.update({ recipe_id: recipeId, ...toPayload(values) });
export const deleteRecipe = (recipeId) => recipeApi.remove(recipeId);
