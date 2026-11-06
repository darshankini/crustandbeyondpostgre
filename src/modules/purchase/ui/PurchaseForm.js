import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { money } from '../../../components/Layout';
import { useItemRows } from '../../shared/hooks';
import { Field, FieldError, Modal, btn, inputCls } from '../../shared/ui';
import ItemRowsEditor from '../../shared/ItemRowsEditor';
import { today } from '../../shared/utils';
import { addPurchase, updatePurchase } from '../services/purchaseService';
import { validatePurchase } from '../validation/purchaseValidation';
import { ITEM_FIELDS, sumSubtotals } from '../utils/purchaseUtils';

// Add / edit purchase dialog. purchase = the editPurchase response when editing, null when adding.
// Inputs are read through refs and validated only when Save is pressed.
export default function PurchaseForm({ purchase, rawProducts, onSaved, onClose }) {
  const invoiceNoRef = useRef(null);
  const invoiceDateRef = useRef(null);
  const items = useItemRows(purchase?.items);
  const [errors, setErrors] = useState({});
  const [total, setTotal] = useState(purchase?.total ?? 0);
  const [saving, setSaving] = useState(false);

  // Running total for display only; it is recomputed from the lines on save.
  const recalcTotal = () => setTotal(sumSubtotals(items.read(['subtotal'])));
  useEffect(recalcTotal, [items.rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const values = {
      invoice_no: invoiceNoRef.current.value.trim(),
      invoice_date: invoiceDateRef.current.value,
      items: items.read(ITEM_FIELDS),
    };

    const errs = validatePurchase(values, rawProducts);
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error('Please fix the highlighted fields');

    setSaving(true);
    try {
      if (purchase) await updatePurchase(purchase.id, values);
      else await addPurchase(values);
      toast.success(purchase ? 'Purchase updated, stock adjusted' : 'Purchase added to stock');
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
      title={purchase ? `Edit purchase #${purchase.id}` : 'Add purchase'}
      subtitle="Purchase"
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
          <button type="submit" form="purchase-form" disabled={saving} className={btn.primary}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="purchase-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Invoice no (optional)" error={errors.invoice_no}>
            <input ref={invoiceNoRef} defaultValue={purchase?.invoice_no ?? ''} className={inputCls(errors.invoice_no)} />
          </Field>
          <Field label="Invoice date" error={errors.invoice_date}>
            <input
              ref={invoiceDateRef}
              type="date"
              defaultValue={purchase?.invoice_date ?? today()}
              className={inputCls(errors.invoice_date)}
            />
          </Field>
        </div>

        <ItemRowsEditor
          items={items}
          rawProducts={rawProducts}
          errors={errors}
          qtyLabel="Qty (gram / ml)"
          extraColumns={[
            {
              label: 'Subtotal (₹)',
              render: (row, err) => (
                <>
                  <input
                    ref={items.bind(row.key, 'subtotal')}
                    defaultValue={row.defaults.subtotal ?? ''}
                    type="number"
                    inputMode="numeric"
                    onInput={recalcTotal}
                    className={inputCls(err('subtotal'))}
                  />
                  <FieldError msg={err('subtotal')} />
                </>
              ),
            },
            {
              label: 'Expiry (optional)',
              render: (row, err) => (
                <>
                  <input
                    ref={items.bind(row.key, 'expiry_date')}
                    defaultValue={row.defaults.expiry_date ?? ''}
                    type="date"
                    className={inputCls(err('expiry_date'))}
                  />
                  <FieldError msg={err('expiry_date')} />
                </>
              ),
            },
          ]}
        />

        <div className="flex items-center justify-end gap-3 border-t pt-3">
          <span className="text-gray-600">Total</span>
          <span className="text-xl font-bold tabular-nums">{money(total)}</span>
        </div>
        <FieldError msg={errors.total} />
      </form>
    </Modal>
  );
}
