import { memo, useState, useEffect } from 'react';
import { money, itemTotal, unitTotal } from './Layout';

// One cart line: image, name + chosen sub-items, inline +/- qty stepper, line total, remove.
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
        className="h-8 w-8 rounded object-cover bg-gray-100 shrink-0"
      />
      <div className="min-w-0 flex-1 flex items-start gap-1.5">
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
          {item.subitems?.length > 0 && onEditOptions && (
            <button onClick={() => onEditOptions(item)} className="mt-0.5 text-xs font-medium text-brand hover:underline">
              Edit options
            </button>
          )}
        </div>
        {/* Inline qty stepper */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button onClick={() => onDec(item.key)} className="h-7 w-6 rounded bg-gray-200 hover:bg-gray-300 leading-none" aria-label={`Decrease ${item.name}`}>−</button>
          <input
            value={draft}
            onChange={onType}
            onBlur={() => setDraft(String(item.qty))}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            aria-label={`Quantity of ${item.name}`}
            className="h-7 w-8 rounded border text-center text-sm tabular-nums outline-none focus:border-brand"
          />
          <button onClick={() => onInc(item.key)} className="h-7 w-6 rounded bg-gray-200 hover:bg-gray-300 leading-none" aria-label={`Increase ${item.name}`}>+</button>
        </div>
        <div className="shrink-0 pt-1 text-right text-sm font-semibold tabular-nums whitespace-nowrap">{money(itemTotal(item))}</div>
        <button onClick={() => onRemove(item.key)} className="shrink-0 pt-1 text-gray-400 hover:text-red-500 leading-none" title="Remove" aria-label={`Remove ${item.name}`}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
    </li>
  );
}

export default memo(CartItem);
