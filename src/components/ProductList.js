import { useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { limitMessage, unitsLeft, useReserved } from '../stock';
import ProductCard from './ProductCard';

// Responsive product grid (the scrollable 2/3 area).
export default function ProductList({ products, loading, search, onAdd }) {

  const {items,inc,dec,activeId} = useCart();
  const qtyByKey = useMemo(() => {
    const m = {};
    for(const i of items) m[i.key] = i.qty
    return m;
  },[items])
  // Units of each product in the cart across all its lines (different sub-item choices).
  const qtyByProduct = useMemo(() => {
    const m = {};
    for (const i of items) m[i.id] = (m[i.id] || 0) + i.qty;
    return m;
  }, [items]);
  // Units this cart's printed KOT already holds (out of stock_available, but ours to use).
  const reserved = useReserved(activeId);
  const leftFor = useCallback(
    (p) => unitsLeft(p, qtyByProduct[p.id] || 0, reserved.get(p.id) || 0),
    [qtyByProduct, reserved]
  );

  // Don't let the cart ask for more than stock can make; the server re-checks at KOT and checkout.
  const guard = useCallback((product, fn) => {
    if (leftFor(product) > 0) return fn();
    toast.error(limitMessage(product, reserved.get(product.id) || 0));
  }, [leftFor, reserved]);
  const byId = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products]);
  const addChecked = useCallback((p) => guard(p, () => onAdd(p)), [guard, onAdd]);
  const incChecked = useCallback((key) => guard(byId.get(key), () => inc(key)), [guard, byId, inc]);


  if (loading) return <div className="p-6 text-gray-500">Loading products…</div>;
  if (!products.length) {
    return (
      <div className="p-6 text-gray-500">
        {search ? <>No products match “{search}”.</> : 'No products in this category.'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 sm:gap-3 p-2 sm:p-3">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          onAdd={addChecked}
          onInc={incChecked}
          onDec={dec}
          qty={qtyByKey[String(p.id)] || 0}
          left={leftFor(p)}
          held={reserved.get(p.id) || 0}
        />
      ))}
    </div>
  );
}
