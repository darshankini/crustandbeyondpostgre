import { FieldError, inputCls } from './ui';
import { unitOf } from './utils';

// Editable raw product lines (raw product / qty / unit + extraColumns) for purchase and recipe forms.
// Inputs are uncontrolled and bound through `items` (useItemRows); nothing is validated while typing.
// The unit is not chosen here: it is always the selected raw product's unit.
// extraColumns: [{ label, render(row, err) }] where err(field) is that row's error message.
export default function ItemRowsEditor({ items, rawProducts, errors, extraColumns = [], qtyLabel = 'Qty' }) {
  const onRawChange = (key) => (e) => {
    const unitEl = items.input(key, 'product_unit');
    if (unitEl) unitEl.value = unitOf(rawProducts, e.target.value);
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="px-2 py-2 font-semibold">Raw product</th>
              <th className="px-2 py-2 font-semibold">{qtyLabel}</th>
              <th className="px-2 py-2 font-semibold">Unit</th>
              {extraColumns.map((c) => <th key={c.label} className="px-2 py-2 font-semibold">{c.label}</th>)}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.rows.map((row, i) => {
              const err = (f) => errors[`items[${i}].${f}`];
              const d = row.defaults;
              return (
                <tr key={row.key} className="align-top">
                  <td className="min-w-[11rem] p-2">
                    <select
                      ref={items.bind(row.key, 'raw_product_id')}
                      defaultValue={d.raw_product_id ?? ''}
                      onChange={onRawChange(row.key)}
                      className={inputCls(err('raw_product_id'))}
                    >
                      <option value="">Select…</option>
                      {rawProducts.map((r) => <option key={r.id} value={r.id}>{r.product_name}</option>)}
                    </select>
                    <FieldError msg={err('raw_product_id')} />
                  </td>
                  <td className="min-w-[6rem] p-2">
                    <input
                      ref={items.bind(row.key, 'product_qty')}
                      defaultValue={d.product_qty ?? ''}
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 1000"
                      className={inputCls(err('product_qty'))}
                    />
                    <FieldError msg={err('product_qty')} />
                  </td>
                  <td className="min-w-[5rem] p-2">
                    <input
                      ref={items.bind(row.key, 'product_unit')}
                      defaultValue={unitOf(rawProducts, d.raw_product_id) || d.product_unit || ''}
                      readOnly
                      tabIndex={-1}
                      placeholder="—"
                      title="Set by the raw product"
                      className={inputCls(err('product_unit')) + ' bg-gray-50 text-gray-600'}
                    />
                    <FieldError msg={err('product_unit')} />
                  </td>
                  {extraColumns.map((c) => (
                    <td key={c.label} className="min-w-[7rem] p-2">{c.render(row, err)}</td>
                  ))}
                  <td className="p-2 pt-3">
                    <button
                      type="button"
                      onClick={() => items.remove(row.key)}
                      disabled={items.rows.length === 1}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                      title="Remove line"
                      aria-label="Remove line"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <FieldError msg={errors.items} />
      <button type="button" onClick={items.add} className="mt-2 text-sm font-medium text-brand hover:underline">
        + Add raw product
      </button>
    </div>
  );
}
