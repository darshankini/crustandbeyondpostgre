import { memo, useState, useEffect } from 'react';
import { money, itemTotal, unitTotal } from './Layout';

// One cart line: image, name, chosen sub-items, editable quantity with +/- stepper, line total, remove.
function CartItem({ item, onInc, onDec, onSetQty, onRemove, onEditOptions }) {
  // Local draft so the field can be cleared/retyped without the item disappearing.
  const [draft, setDraft] = useState(String(item.qty));
  useEffect(() => setDraft(String(item.qty)), [item.qty]);

  const onType = (e) => {
    const v = e.target.value.replace(/\D/g, '');
    setDraft(v);
    const q = Number(v);
    if (q > 0) onSetQty(item.key, q);
  };

  return (
    <li className="flex gap-2 py-2">
      <img
        src={item.image}
        alt=""
        className="h-10 w-10 rounded object-cover bg-gray-100 shrink-0"
      />
      <div className="min-w-0 flex-1 space-y-1.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-tight">{item.name}</div>
          <div className="text-xs text-gray-500">{money(unitTotal(item))} each</div>
          {item.subitems?.length > 0 && (
            <ul className="mt-0.5 text-xs text-gray-600">
              {item.subitems.map((s) => (
                <li key={s.id}>
                  + {s.name}{Number(s.price) > 0 && <span className="text-gray-400"> ({money(s.price)})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="text-right text-sm font-semibold tabular-nums whitespace-nowrap">{money(itemTotal(item))}</div>
        <button onClick={() => onRemove(item.key)} className="-m-1.5 p-1.5 text-gray-400 hover:text-red-500 leading-none" title="Remove" aria-label={`Remove ${item.name}`}>✕</button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button onClick={() => onDec(item.key)} className="h-8 w-8 rounded bg-gray-200 hover:bg-gray-300 leading-none" >−</button>
        <label className="flex items-center rounded border focus-within:border-brand px-1">
          <input
            value={draft}
            onChange={onType}
            onBlur={() => setDraft(String(item.qty))}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            aria-label={`Quantity of ${item.name}`}
            className="w-10 py-1 text-center text-sm tabular-nums outline-none"
          />
        </label>
        <button onClick={() => onInc(item.key)} className="h-8 w-8 rounded bg-gray-200 hover:bg-gray-300 leading-none">+</button>
        {item.subitems?.length > 0 && onEditOptions && (
          <button onClick={() => onEditOptions(item)} className="ml-auto px-1 py-1.5 text-xs font-medium text-brand hover:underline">
            Edit options
          </button>
        )}
      </div>
      </div>
    </li>
  );
}

export default memo(CartItem);
