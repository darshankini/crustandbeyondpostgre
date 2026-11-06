import { memo } from 'react';
import { money } from './Layout';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="52%" font-size="40" text-anchor="middle" fill="#9ca3af">🍴</text></svg>'
  );

// One product tile. memo'd so the grid doesn't re-render tiles that didn't change.
// left = units still free to add (Infinity when stock isn't tracked for this product).
// held = units this cart's printed KOT already reserved (counted as available to this cart).
function ProductCard({ product, qty, left, held = 0, onAdd, onDec, onInc }) {
  // Products with sub-items always open the picker; the cart merges lines with the same choices.
  const hasOptions = product.subitem_groups?.length > 0;
  const key = String(product.id);
  const available = product.stock_available == null ? null : product.stock_available + held;
  const soldOut = available === 0;
  const fewLeft = available > 0 && available <= 5;
  return (
    <div
      className={
        'group relative flex flex-col rounded-lg border bg-white overflow-hidden text-left transition ' +
        (soldOut ? 'opacity-60' : 'hover:shadow-md hover:border-brand')
      }
    >
      {(soldOut || fewLeft) && (
        <span
          className={
            'absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow ' +
            (soldOut ? 'bg-red-600' : 'bg-amber-500')
          }
        >
          {soldOut ? 'Out of stock' : `Only ${available} left`}
        </span>
      )}
      <img
        src={product.image || FALLBACK}
        alt={product.name}
        loading="lazy"
        onError={(e) => { e.currentTarget.src = FALLBACK; }}
        className={'h-24 w-full object-cover bg-gray-100' + (soldOut ? ' grayscale' : '')}
      />
      <div className="p-2">
        <div className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</div>
        <div className="mt-1 text-brand font-semibold whitespace-nowrap">
          {money(product.price)}
        </div>
        <div className="mt-1.5 h-9 flex items-center">
          {soldOut && !qty ? (
            <button disabled className="w-full h-9 text-sm text-gray-500 bg-gray-200 rounded-full font-semibold px-3 cursor-not-allowed">Out of stock</button>
          ) : hasOptions ? (
            <button onClick={() => onAdd(product)} className="w-full h-9 text-xs text-white bg-brand rounded-full font-semibold px-3 hover:bg-brand-dark">+ Choose options</button>
          ) : qty > 0 ? (
            <div className="w-full flex items-center justify-between text-white">
              <button onClick={() => onDec(key)} className="h-9 w-9 rounded bg-brand hover:bg-brand-dark leading-none">−</button>
              <span className="text-center text-sm tabular-nums text-black whitespace-nowrap">{qty}</span>
              {/* Still clickable at the limit so the cashier gets the "only N left" message. */}
              <button onClick={() => onInc(key)} className={'h-9 w-9 rounded leading-none ' + (left > 0 ? 'bg-brand hover:bg-brand-dark' : 'bg-gray-300')}>+</button>
            </div>
          ) : (
            <button onClick={() => onAdd(product)} className="w-full h-9 text-sm text-white bg-brand rounded-full font-semibold px-3 hover:bg-brand-dark">+ Add</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
