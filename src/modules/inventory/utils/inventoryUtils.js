import { LOW_STOCK } from '../../shared/utils';

// 'out' (zero), 'low' (below 1 kg / 1 L, admin is emailed) or 'ok' — drives the row colour in the list.
export const stockLevel = (qty) => (qty <= 0 ? 'out' : qty < LOW_STOCK ? 'low' : 'ok');

// Raw products that can get a new inventory row: those without one, plus the one being edited.
export const unstockedRawProducts = (rawProducts, inventory, editingRawProductId) => {
  const stocked = new Set(inventory.map((i) => i.raw_product_id));
  return rawProducts.filter((r) => !stocked.has(r.id) || r.id === editingRawProductId);
};
