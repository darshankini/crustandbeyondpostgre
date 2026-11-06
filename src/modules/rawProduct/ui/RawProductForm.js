import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Field, Modal, btn, inputCls } from '../../shared/ui';
import { addRawProduct, updateRawProduct } from '../services/rawProductService';
import { validateRawProduct } from '../validation/rawProductValidation';
import { IMAGE_ACCEPT } from '../utils/rawProductUtils';
import { UNITS } from '../../shared/utils';

// Add / edit a raw product (name + optional image up to 150 KB). Validated on Save only.
export default function RawProductForm({ rawProduct, onSaved, onClose }) {
  const nameRef = useRef(null);
  const unitRef = useRef(null);
  const imageRef = useRef(null);
  const removeImageRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const values = {
      product_name: nameRef.current.value.trim(),
      product_unit: unitRef.current.value,
      product_image: imageRef.current.files[0] || null,
      remove_image: !!removeImageRef.current?.checked,
    };

    const errs = validateRawProduct(values);
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error('Please fix the highlighted fields');

    setSaving(true);
    try {
      if (rawProduct) await updateRawProduct(rawProduct.id, values);
      else await addRawProduct(values);
      toast.success(rawProduct ? 'Raw product updated' : 'Raw product added');
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
      title={rawProduct ? `Edit ${rawProduct.product_name}` : 'Add raw product'}
      subtitle="Raw product"
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          <button type="submit" form="raw-product-form" disabled={saving} className={btn.primary}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="raw-product-form" onSubmit={submit} noValidate className="space-y-3">
        <Field label="Product name" error={errors.product_name}>
          <input
            ref={nameRef}
            defaultValue={rawProduct?.product_name ?? ''}
            placeholder="e.g. Maida"
            className={inputCls(errors.product_name)}
          />
        </Field>
        <Field label="Unit (used for purchases, recipes and stock)" error={errors.product_unit}>
          <select ref={unitRef} defaultValue={rawProduct?.product_unit ?? 'gram'} className={inputCls(errors.product_unit)}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Image (optional · jpg, jpeg, png, svg, webp · max 150 KB)" error={errors.product_image}>
          <input
            ref={imageRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 hover:file:bg-gray-200"
          />
        </Field>
        {rawProduct?.product_image && (
          <div className="flex items-center gap-3">
            <img src={rawProduct.product_image} alt="" className="h-12 w-12 rounded object-cover" />
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input ref={removeImageRef} type="checkbox" className="accent-brand" />
              Remove current image
            </label>
          </div>
        )}
      </form>
    </Modal>
  );
}
