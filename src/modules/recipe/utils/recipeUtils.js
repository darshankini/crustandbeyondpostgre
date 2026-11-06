// Fields of one recipe line as read from the form.
export const ITEM_FIELDS = ['raw_product_id', 'product_qty', 'product_unit'];

// Products that can get a new recipe: those without one, plus the one being edited.
export const availableProducts = (products, recipes, editingProductId) => {
  const taken = new Set(recipes.map((r) => r.product_id));
  return products.filter((p) => !taken.has(p.id) || p.id === editingProductId);
};
