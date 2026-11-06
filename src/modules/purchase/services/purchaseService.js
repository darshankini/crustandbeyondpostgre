import { purchaseApi } from '../api/purchaseApi';
import { toItemPayload } from '../../shared/utils';
import { sumSubtotals } from '../utils/purchaseUtils';

// Builds the API payload from validated form values.
function toPayload(values) {
  return {
    invoice_no: values.invoice_no || null,
    invoice_date: values.invoice_date,
    total: sumSubtotals(values.items),
    items: values.items.map((l) => ({
      ...toItemPayload(l),
      subtotal: Number(l.subtotal),
      expiry_date: l.expiry_date || null,
    })),
  };
}

export const listPurchases = () => purchaseApi.list();
export const editPurchase = (purchaseId) => purchaseApi.edit(purchaseId);
export const addPurchase = (values) => purchaseApi.add(toPayload(values));
export const updatePurchase = (purchaseId, values) =>
  purchaseApi.update({ purchase_id: purchaseId, ...toPayload(values) });
export const deletePurchase = (purchaseId) => purchaseApi.remove(purchaseId);
