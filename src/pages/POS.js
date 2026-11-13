import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { money } from '../components/Layout';
import CategoryList from '../components/CategoryList';
import ProductList from '../components/ProductList';
import Cart from '../components/Cart';
import ErrorBoundary from '../components/ErrorBoundary';
import SubitemPicker from '../components/SubitemPicker';

export default function POS() {
  const { add, setSubitems: setLineSubitems, total, count } = useCart();
  const [cartOpen, setCartOpen] = useState(false); // mobile-only cart drawer
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [subitems, setSubitems] = useState([]);
  // Sub-item picker: { product } when adding, plus { editKey, initial } when editing a cart line.
  const [picking, setPicking] = useState(null);
  const [active, setActive] = useState('all');
  const [loading, setLoading] = useState(true);
  // Search term from the header (already debounced there before it reaches the URL).
  const [params] = useSearchParams();
  const search = (params.get('q') || '').trim();
  // Every product seen so far, by id. Editing a cart line's options needs the product's groups
  // even when the current search hides it.
  const knownProducts = useRef(new Map());

  // Load categories + sub-items once.
  useEffect(() => {
    Promise.all([api.get('/categories'), api.get('/subitems')])
      .then(([cats, subs]) => {
        setCategories(cats);
        setSubitems(subs);
      })
      .catch((e) => console.error(e));
  }, []);

  // Products: refetch when the search term changes. Ignore a response that arrives after a newer search.
  useEffect(() => {
    let alive = true;
    api
      .get('/products' + (search ? `?search=${encodeURIComponent(search)}` : ''))
      .then((prods) => {
        if (!alive) return;
        for (const p of prods) knownProducts.current.set(p.id, p);
        setProducts(prods);
      })
      .catch((e) => console.error(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [search]);

  // A search looks across all categories.
  useEffect(() => {
    if (search) setActive('all');
  }, [search]);


  // Filter client-side so switching category is instant (no refetch).
  const visible = useMemo(
    () => (active === 'all' ? products : products.filter((p) => p.category_id === active)),
    [products, active]
  );

  // Products that offer sub-items open the picker first; everything else goes straight in.
  const handleAdd = useCallback(
    (p) => (p.subitem_groups?.length ? setPicking({ product: p }) : add(p)),
    [add]
  );
  // Edit a cart line's choices: reopen the picker with its current sub-items selected.
  const editOptions = useCallback(
    (item) => {
      const product = knownProducts.current.get(item.id) || {
        // Product no longer listed: still allow editing within the groups the line already uses.
        id: item.id,
        name: item.name,
        subitem_groups: [...new Set((item.subitems || []).map((s) => s.group_name))],
      };
      setPicking({ product, editKey: item.key, initial: item.subitems || [] });
    },
    []
  );
  const confirmPick = useCallback(
    (chosen) => {
      if (picking.editKey) setLineSubitems(picking.editKey, chosen);
      else add({ ...picking.product, subitems: chosen });
      setPicking(null);
    },
    [add, setLineSubitems, picking]
  );

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Left: categories rail + product grid. Rail is a top strip on phones, a side column from tablet up. */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col md:flex-row lg:basis-2/3 lg:grow">
        <CategoryList categories={categories} active={active} onSelect={setActive} />
        {/* Bottom padding below lg keeps the last row clear of the floating cart button. */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto pb-20 lg:pb-0">
          <ErrorBoundary>
          <ProductList products={visible} loading={loading} search={search} onAdd={handleAdd} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Cart: static right column on desktop (lg+), slide-over drawer on phones and tablets. */}
      <div
        className={
          'bg-white z-40 transition-transform duration-200 ' +
          'fixed inset-y-0 right-0 w-[90%] max-w-sm md:max-w-md shadow-xl ' +
          'lg:static lg:z-auto lg:w-auto lg:max-w-md lg:basis-1/3 lg:min-w-[320px] lg:shadow-none lg:translate-x-0 ' +
          (cartOpen ? 'translate-x-0' : 'translate-x-full')
        }
      >
        <Cart onClose={() => setCartOpen(false)} onEditOptions={editOptions} />
      </div>

      {/* Backdrop when the cart drawer is open (phones + tablets) */}
      {cartOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setCartOpen(false)}
        />
      )}

      {picking && (
        <SubitemPicker
          product={picking.product}
          initial={picking.initial}
          subitems={subitems}
          onConfirm={confirmPick}
          onCancel={() => setPicking(null)}
        />
      )}

      {/* Floating button to open the cart drawer (phones + tablets) */}
      <button
        onClick={() => setCartOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-brand text-white px-5 py-3 shadow-lg font-semibold"
      >
        🛒 {count} · {money(total)}
      </button>
    </div>
  );
}
