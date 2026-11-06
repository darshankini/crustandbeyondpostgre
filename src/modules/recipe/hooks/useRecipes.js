import { useList } from '../../shared/hooks';
import { listProducts, listRecipes } from '../services/recipeService';

export const useRecipes = () => useList(listRecipes);
export const useProducts = () => useList(listProducts);
