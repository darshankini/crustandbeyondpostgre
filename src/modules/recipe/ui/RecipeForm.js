import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useItemRows } from '../../shared/hooks';
import { Field, Modal, btn, inputCls } from '../../shared/ui';
import ItemRowsEditor from '../../shared/ItemRowsEditor';
import { addRecipe, updateRecipe } from '../services/recipeService';
import { validateRecipe } from '../validation/recipeValidation';
import { ITEM_FIELDS } from '../utils/recipeUtils';

// Add / edit recipe dialog. recipe = the editRecipe response when editing, null when adding.
// products = products that may be picked. Inputs are read through refs and validated on Save.
export default function RecipeForm({ recipe, products, rawProducts, onSaved, onClose }) {
  const productRef = useRef(null);
  const items = useItemRows(recipe?.items);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const values = { product_id: productRef.current.value, items: items.read(ITEM_FIELDS) };

    const errs = validateRecipe(values, products, rawProducts);
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error('Please fix the highlighted fields');

    setSaving(true);
    try {
      if (recipe) await updateRecipe(recipe.id, values);
      else await addRecipe(values);
      toast.success(recipe ? 'Recipe updated' : 'Recipe added');
      onSaved();
    } catch (err) {
      setErrors(err.errors || {});
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={recipe ? `Edit recipe: ${recipe.product_name}` : 'Add recipe'}
      subtitle="Recipe"
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          <button type="submit" form="recipe-form" disabled={saving} className={btn.primary}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="recipe-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Product" error={errors.product_id}>
          <select ref={productRef} defaultValue={recipe?.product_id ?? ''} className={inputCls(errors.product_id)}>
            <option value="">Select a product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <p className="text-sm text-gray-500">
          Raw products used to make <strong>one</strong> unit. Each bill takes these quantities × qty sold out of stock.
        </p>
        <ItemRowsEditor items={items} rawProducts={rawProducts} errors={errors} qtyLabel="Qty per unit" />
      </form>
    </Modal>
  );
}
