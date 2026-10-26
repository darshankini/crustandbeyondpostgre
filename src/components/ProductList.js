import { useMemo } from 'react';
import { useCart } from '../context/CartContext';
import ProductCard from './ProductCard';

// Responsive product grid (the scrollable 2/3 area).
export default function ProductList({ products, loading, search, onAdd }) {

  const {items,inc,dec} = useCart();
  const qtyByKey = useMemo(() => {
    const m = {};
    for(const i of items) m[i.key] = i.qty
    return m;
  },[items])


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
        <ProductCard key={p.id} product={p} onAdd={onAdd}  onInc={inc} onDec={dec} qty={qtyByKey[String(p.id)] || 0}/>
      ))}
    </div>
  );
}
