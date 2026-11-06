import { useState } from 'react';
import toast from 'react-hot-toast';
import { formattedDate } from '../../../components/Layout';
import { usePagination } from '../../shared/hooks';
import { EmptyRow, Pagination, Panel, btn } from '../../shared/ui';
import { formatQty } from '../../shared/utils';
import { useRawProducts } from '../hooks/useRawProducts';
import { deleteRawProduct, editRawProduct } from '../services/rawProductService';
import RawProductForm from './RawProductForm';

// Raw products master list (table view) with add / edit / delete.
export default function RawProductList() {
  const { rows, loading, reload } = useRawProducts();
  const pager = usePagination(rows);
  const [form, setForm] = useState(null); // { rawProduct: null | editRawProduct response }

  const openEdit = async (id) => {
    try {
      setForm({ rawProduct: await editRawProduct(id) });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete ${r.product_name}? Its stock row is deleted too.`)) return;
    try {
      await deleteRawProduct(r.id);
      toast.success('Raw product deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Panel
      title="Raw products"
      action={<button onClick={() => setForm({ rawProduct: null })} className={btn.primary}>+ Add raw product</button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-gray-500">
            <tr>
              <th className="px-3 py-2 text-center">#</th>
              <th className="px-3 py-2 text-center">Image</th>
              <th className="px-3 py-2 text-left">Product name</th>
              <th className="px-3 py-2 text-center">Unit</th>
              <th className="px-3 py-2 text-center">In stock</th>
              <th className="px-3 py-2 text-center">Added</th>
              <th className="px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!pager.pageRows.length && <EmptyRow cols={7} loading={loading} text="No raw products yet" />}
            {pager.pageRows.map((r, i) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-center text-gray-500">{pager.offset + i + 1}</td>
                <td className="px-3 py-2">
                  {r.product_image
                    ? <img src={r.product_image} alt="" className="mx-auto h-8 w-8 rounded object-cover" />
                    : <div className="mx-auto h-8 w-8 rounded bg-gray-100" />}
                </td>
                <td className="px-3 py-2 font-medium">{r.product_name}</td>
                <td className="px-3 py-2 text-center">{r.product_unit}</td>
                <td className="px-3 py-2 text-center tabular-nums">
                  {r.product_qty == null ? '—' : formatQty(r.product_qty, r.product_unit)}
                </td>
                <td className="px-3 py-2 text-center text-gray-500">{formattedDate(r.created_at)}</td>
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
        <RawProductForm
          rawProduct={form.rawProduct}
          onSaved={() => { setForm(null); reload(); }}
          onClose={() => setForm(null)}
        />
      )}
    </Panel>
  );
}
