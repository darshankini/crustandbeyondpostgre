import { money } from '../../../components/Layout';
import { Modal, btn } from '../../shared/ui';
import { formatDay, formatQty } from '../../shared/utils';

// Read-only purchase details: its raw product lines and total.
export default function PurchasePreview({ purchase, onClose }) {
  return (
    <Modal
      title={`Purchase #${purchase.id}`}
      subtitle={`Invoice ${purchase.invoice_no || '—'} · ${formatDay(purchase.invoice_date)}`}
      onClose={onClose}
      footer={<button onClick={onClose} className={btn.primary}>Close</button>}
    >
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">#</th>
              <th className="px-4 py-3 text-left font-semibold">Raw item</th>
              <th className="px-4 py-3 text-center font-semibold">Qty</th>
              <th className="px-4 py-3 text-center font-semibold">Expiry</th>
              <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {purchase.items.map((it, i) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{it.product_name}</td>
                <td className="px-4 py-3 text-center tabular-nums">
                  {it.product_qty} {it.product_unit}
                  <span className="block text-xs text-gray-400">{formatQty(it.product_qty, it.product_unit)}</span>
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{formatDay(it.expiry_date)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-600">Total</span>
        <span className="text-2xl font-bold text-gray-900">{money(purchase.total)}</span>
      </div>
    </Modal>
  );
}
