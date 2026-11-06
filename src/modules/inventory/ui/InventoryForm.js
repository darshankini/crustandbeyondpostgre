import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Field, Modal, btn, inputCls } from '../../shared/ui';
import { unitOf } from '../../shared/utils';
import { addInventory, updateInventory } from '../services/inventoryService';
import { validateInventory } from '../validation/inventoryValidation';

// Add / edit a stock row by hand (opening stock or a stock-take correction).
// row = the editInventory response when editing, null when adding. Validated on Save only.
export default function InventoryForm({ row, rawProducts, onSaved, onClose }) {
  const rawRef = useRef(null);
  const qtyRef = useRef(null);
  const unitRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const values = {
      raw_product_id: rawRef.current.value,
      product_qty: qtyRef.current.value.trim(),
      product_unit: unitRef.current.value,
    };

    const errs = validateInventory(values, rawProducts);
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error('Please fix the highlighted fields');

    setSaving(true);
    try {
      if (row) await updateInventory(row.id, values);
      else await addInventory(values);
      toast.success(row ? 'Stock updated' : 'Stock added');
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
      title={row ? `Edit stock: ${row.product_name}` : 'Add stock'}
      subtitle="Inventory"
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          <button type="submit" form="inventory-form" disabled={saving} className={btn.primary}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="inventory-form" onSubmit={submit} noValidate className="space-y-3">
        <Field label="Raw product" error={errors.raw_product_id}>
          <select
            ref={rawRef}
            defaultValue={row?.raw_product_id ?? ''}
            onChange={(e) => { unitRef.current.value = unitOf(rawProducts, e.target.value); }}
            className={inputCls(errors.raw_product_id)}
          >
            <option value="">Select…</option>
            {rawProducts.map((r) => <option key={r.id} value={r.id}>{r.product_name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity (gram / ml)" error={errors.product_qty}>
            <input
              ref={qtyRef}
              defaultValue={row?.product_qty ?? ''}
              type="number"
              inputMode="numeric"
              placeholder="e.g. 30000"
              className={inputCls(errors.product_qty)}
            />
          </Field>
          <Field label="Unit" error={errors.product_unit}>
            <input
              ref={unitRef}
              defaultValue={unitOf(rawProducts, row?.raw_product_id) || row?.product_unit || ''}
              readOnly
              tabIndex={-1}
              placeholder="—"
              title="Set by the raw product"
              className={inputCls(errors.product_unit) + ' bg-gray-50 text-gray-600'}
            />
          </Field>
        </div>
        <p className="text-xs text-gray-500">
          Purchases and bills adjust stock automatically; use this for opening stock or stock-take corrections.
          The unit comes from the raw product.
        </p>
      </form>
    </Modal>
  );
}
