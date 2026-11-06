import { useState } from 'react';
import toast from 'react-hot-toast';
import { usePagination } from '../../shared/hooks';
import { EmptyRow, Pagination, Panel, btn } from '../../shared/ui';
import { formatQty } from '../../shared/utils';
import { useRawProducts } from '../../rawProduct/hooks/useRawProducts';
import { useInventory } from '../hooks/useInventory';
import { deleteInventory, editInventory } from '../services/inventoryService';
import { stockLevel, unstockedRawProducts } from '../utils/inventoryUtils';
import InventoryForm from './InventoryForm';

const LEVEL_CLS = {
  out: 'bg-red-100 text-red-700',
  low: 'bg-amber-100 text-amber-800',
  ok: 'bg-green-100 text-green-700',
};

// Inventory list (table view): current stock per raw product, with add / edit / delete.
export default function InventoryList() {
  const { rows, loading, reload } = useInventory();
  const rawProducts = useRawProducts();
  const pager = usePagination(rows);
  const [form, setForm] = useState(null); // { row: null | editInventory response }

  const openEdit = async (id) => {
    try {
      setForm({ row: await editInventory(id) });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete the stock row for ${r.product_name}?`)) return;
    try {
      await deleteInventory(r.id);
      toast.success('Stock row deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Panel
      title="Inventory"
      action={<button onClick={() => setForm({ row: null })} className={btn.primary}>+ Add stock</button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-gray-500">
            <tr>
              <th className="px-3 py-2 text-center">#</th>
              <th className="px-3 py-2 text-center">Image</th>
              <th className="px-3 py-2 text-left">Raw product</th>
              <th className="px-3 py-2 text-center">Quantity</th>
              <th className="px-3 py-2 text-center">Unit</th>
              <th className="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!pager.pageRows.length && <EmptyRow cols={6} loading={loading} text="No stock yet — add a purchase" />}
            {pager.pageRows.map((r, i) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-center text-gray-500">{pager.offset + i + 1}</td>
                <td className="px-3 py-2">
                  {r.product_image
                    ? <img src={r.product_image} alt="" className="mx-auto h-8 w-8 rounded object-cover" />
                    : <div className="mx-auto h-8 w-8 rounded bg-gray-100" />}
                </td>
                <td className="px-3 py-2 font-medium">{r.product_name}</td>
                <td className="px-3 py-2 text-center tabular-nums">
                  <span className={'rounded-full px-2 py-0.5 font-medium ' + LEVEL_CLS[stockLevel(r.product_qty)]}>
                    {formatQty(r.product_qty, r.product_unit)}
                  </span>
                  <span className="block text-xs text-gray-400">{r.product_qty}</span>
                  {r.reserved_qty > 0 && (
                    <span className="block text-xs text-blue-600" title="Already taken out of stock for printed KOTs, until checkout or the cart is cleared">
                      + {formatQty(r.reserved_qty, r.product_unit)} held for KOT
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">{r.product_unit}</td>
                <td className="space-x-2 whitespace-nowrap px-3 py-2 text-center">
                  <button onClick={() => openEdit(r.id)} className={btn.edit}>Edit</button>
                  <button onClick={() => remove(r)} className={btn.delete}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination p={pager} />

      {form && (
        <InventoryForm
          row={form.row}
          rawProducts={unstockedRawProducts(rawProducts.rows, rows, form.row?.raw_product_id)}
          onSaved={() => { setForm(null); reload(); }}
          onClose={() => setForm(null)}
        />
      )}
    </Panel>
  );
}
