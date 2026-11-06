import { Modal, btn } from '../../shared/ui';
import { formatQty } from '../../shared/utils';

// Read-only recipe: raw products needed for one unit of the product.
export default function RecipePreview({ recipe, onClose }) {
  return (
    <Modal
      title={recipe.product_name}
      subtitle={`Recipe #${recipe.id} · per 1 unit`}
      onClose={onClose}
      footer={<button onClick={onClose} className={btn.primary}>Close</button>}
    >
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">#</th>
              <th className="px-4 py-3 text-left font-semibold">Raw item</th>
              <th className="px-4 py-3 text-right font-semibold">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {recipe.items.map((it, i) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{it.product_name}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {it.product_qty} {it.product_unit}
                  {it.product_qty >= 1000 && (
                    <span className="block text-xs text-gray-400">{formatQty(it.product_qty, it.product_unit)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
