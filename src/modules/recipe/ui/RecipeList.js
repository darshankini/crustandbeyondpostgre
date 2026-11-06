import { useState } from 'react';
import toast from 'react-hot-toast';
import { usePagination } from '../../shared/hooks';
import { EmptyRow, Pagination, Panel, btn } from '../../shared/ui';
import { useRawProducts } from '../../rawProduct/hooks/useRawProducts';
import { useProducts, useRecipes } from '../hooks/useRecipes';
import { deleteRecipe, editRecipe } from '../services/recipeService';
import { availableProducts } from '../utils/recipeUtils';
import RecipeForm from './RecipeForm';
import RecipePreview from './RecipePreview';

// Recipe list (table view) with preview, add, edit and delete.
export default function RecipeList() {
  const { rows, loading, reload } = useRecipes();
  const products = useProducts();
  const rawProducts = useRawProducts();
  const pager = usePagination(rows);
  const [preview, setPreview] = useState(null); // editRecipe response
  const [form, setForm] = useState(null);       // { recipe: null | editRecipe response }

  const fetchRecipe = async (id) => {
    try {
      return await editRecipe(id);
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  };

  const openPreview = async (id) => {
    const r = await fetchRecipe(id);
    if (r) setPreview(r);
  };

  const openEdit = async (id) => {
    const r = await fetchRecipe(id);
    if (r) setForm({ recipe: r });
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete the recipe for ${r.product_name}? Its sales will stop reducing stock.`)) return;
    try {
      await deleteRecipe(r.id);
      toast.success('Recipe deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Panel
      title="Recipes"
      action={<button onClick={() => setForm({ recipe: null })} className={btn.primary}>+ Add recipe</button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-gray-500">
            <tr>
              <th className="px-3 py-2 text-center">#</th>
              <th className="px-3 py-2 text-center">Recipe Id</th>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-center">Raw items</th>
              <th className="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!pager.pageRows.length && <EmptyRow cols={5} loading={loading} text="No recipes yet" />}
            {pager.pageRows.map((r, i) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-center text-gray-500">{pager.offset + i + 1}</td>
                <td className="px-3 py-2 text-center">{r.id}</td>
                <td className="px-3 py-2 font-medium">{r.product_name}</td>
                <td className="px-3 py-2 text-center">{r.item_count}</td>
                <td className="space-x-2 whitespace-nowrap px-3 py-2 text-center">
                  <button onClick={() => openPreview(r.id)} className={btn.preview}>Preview</button>
                  <button onClick={() => openEdit(r.id)} className={btn.edit}>Edit</button>
                  <button onClick={() => remove(r)} className={btn.delete}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination p={pager} />

      {preview && <RecipePreview recipe={preview} onClose={() => setPreview(null)} />}
      {form && (
        <RecipeForm
          recipe={form.recipe}
          products={availableProducts(products.rows, rows, form.recipe?.product_id)}
          rawProducts={rawProducts.rows}
          onSaved={() => { setForm(null); reload(); }}
          onClose={() => setForm(null)}
        />
      )}
    </Panel>
  );
}
