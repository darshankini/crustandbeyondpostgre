import { inventoryApi } from '../api/inventoryApi';

// Builds the API payload from validated form values.
const toPayload = (values) => ({
  raw_product_id: Number(values.raw_product_id),
  product_qty: Number(values.product_qty),
  product_unit: values.product_unit,
});

export const listInventory = () => inventoryApi.list();
export const editInventory = (inventoryId) => inventoryApi.edit(inventoryId);
export const addInventory = (values) => inventoryApi.add(toPayload(values));
export const updateInventory = (inventoryId, values) =>
  inventoryApi.update({ inventory_id: inventoryId, ...toPayload(values) });
export const deleteInventory = (inventoryId) => inventoryApi.remove(inventoryId);
