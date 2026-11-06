import { useSearchParams } from 'react-router-dom';
import PurchaseList from '../modules/purchase/ui/PurchaseList';
import InventoryList from '../modules/inventory/ui/InventoryList';
import RecipeList from '../modules/recipe/ui/RecipeList';
import RawProductList from '../modules/rawProduct/ui/RawProductList';

const TABS = [
  { id: 'purchases', label: 'Purchases', Component: PurchaseList },
  { id: 'stock', label: 'Inventory', Component: InventoryList },
  { id: 'recipes', label: 'Recipes', Component: RecipeList },
  { id: 'raw', label: 'Raw products', Component: RawProductList },
];

// Inventory module: purchases add stock, bills take it out through recipes.
// The open tab lives in ?tab= so a reload keeps it.
export default function Inventory() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('tab')) || TABS[0];

  return (
    <div className="h-full space-y-4 overflow-y-auto bg-gray-100 p-4 md:p-6">
      <h1 className="text-xl font-bold">Inventory</h1>
      <div className="flex gap-1 overflow-x-auto border-b border-gray-300">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ tab: t.id })}
            className={
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ' +
              (t.id === tab.id ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-800')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <tab.Component key={tab.id} />
    </div>
  );
}
