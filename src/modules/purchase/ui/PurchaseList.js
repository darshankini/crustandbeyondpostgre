import { useState } from 'react';
import toast from 'react-hot-toast';
import { money } from '../../../components/Layout';
import { usePagination } from '../../shared/hooks';
import { EmptyRow, Pagination, Panel, btn } from '../../shared/ui';
import { formatDay } from '../../shared/utils';
import { useRawProducts } from '../../rawProduct/hooks/useRawProducts';
import { usePurchases } from '../hooks/usePurchases';
import { deletePurchase, editPurchase } from '../services/purchaseService';
import PurchaseForm from './PurchaseForm';
import PurchasePreview from './PurchasePreview';

// Purchase list (table view) with preview, add, edit and delete.
export default function PurchaseList() {
  const { rows, loading, reload } = usePurchases();
  const rawProducts = useRawProducts();
  const pager = usePagination(rows);
  const [preview, setPreview] = useState(null); // editPurchase response
  const [form, setForm] = useState(null);       // { purchase: null | editPurchase response }

  const fetchPurchase = async (id) => {
    try {
      return await editPurchase(id);
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  };

  const openPreview = async (id) => {
    const p = await fetchPurchase(id);
    if (p) setPreview(p);
  };

  const openEdit = async (id) => {
    const p = await fetchPurchase(id);
    if (p) setForm({ purchase: p });
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete purchase #${p.id}? Its quantities will be taken out of stock.`)) return;
    try {
      await deletePurchase(p.id);
      toast.success('Purchase deleted, stock reduced');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onSaved = () => {
    setForm(null);
    reload();
    rawProducts.reload();
  };

  return (
    <Panel
      title="Purchases"
      action={<button onClick={() => setForm({ purchase: null })} className={btn.primary}>+ Add purchase</button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-gray-500">
            <tr>
              <th className="px-3 py-2 text-center">#</th>
              <th className="px-3 py-2 text-center">Purchase Id</th>
              <th className="px-3 py-2 text-center">Invoice No</th>
              <th className="px-3 py-2 text-center">Purchase Date</th>
              <th className="px-3 py-2 text-center">Items</th>
              <th className="px-3 py-2 text-center">Total</th>
              <th className="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!pager.pageRows.length && <EmptyRow cols={7} loading={loading} text="No purchases yet" />}
            {pager.pageRows.map((p, i) => (
              <tr key={p.id}>
                <td className="px-3 py-2 text-center text-gray-500">{pager.offset + i + 1}</td>
                <td className="px-3 py-2 text-center">{p.id}</td>
                <td className="px-3 py-2 text-center">{p.invoice_no || '—'}</td>
                <td className="px-3 py-2 text-center tabular-nums">{formatDay(p.invoice_date)}</td>
                <td className="px-3 py-2 text-center">{p.item_count}</td>
                <td className="px-3 py-2 text-center font-medium tabular-nums">{money(p.total)}</td>
                <td className="space-x-2 whitespace-nowrap px-3 py-2 text-center">
                  <button onClick={() => openPreview(p.id)} className={btn.preview}>Preview</button>
                  <button onClick={() => openEdit(p.id)} className={btn.edit}>Edit</button>
                  <button onClick={() => remove(p)} className={btn.delete}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination p={pager} />

      {preview && <PurchasePreview purchase={preview} onClose={() => setPreview(null)} />}
      {form && (
        <PurchaseForm
          purchase={form.purchase}
          rawProducts={rawProducts.rows}
          onSaved={onSaved}
          onClose={() => setForm(null)}
        />
      )}
    </Panel>
  );
}
