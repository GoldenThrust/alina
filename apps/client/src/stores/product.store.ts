import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { emptyEntities, selectAll, setAll, upsertMany, type Entities } from "../utils/entities.store";

interface ProductFilters {
  category: ProductCategory | null;
  brand: string | null;
  query: string;
}

interface ProductState {
  products: Entities<Product>;
  filters: ProductFilters;

  setProducts: (products: Product[]) => void;
  upsertProducts: (products: Product[]) => void;
  setFilters: (patch: Partial<ProductFilters>) => void;
  resetFilters: () => void;
  clear: () => void;
}

const NO_FILTERS: ProductFilters = { category: null, brand: null, query: "" };

export const useProductStore = create<ProductState>()((set) => ({
  products: emptyEntities(),
  filters: NO_FILTERS,

  setProducts: (products) => set({ products: setAll(products) }),
  upsertProducts: (products) => set((s) => ({ products: upsertMany(s.products, products) })),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: NO_FILTERS }),
  clear: () => set({ products: emptyEntities(), filters: NO_FILTERS }),
}));

export const selectFilteredProducts = (s: ProductState) => {
  const { category, brand, query } = s.filters;
  const q = query.trim().toLowerCase();
  return selectAll(s.products).filter(
    (p) =>
      (!category || p.category === category) &&
      (!brand || p.brand === brand) &&
      (!q || `${p.brand} ${p.name} ${p.description}`.toLowerCase().includes(q)),
  );
};

export const selectBrands = (s: ProductState) =>
  [...new Set(selectAll(s.products).map((p) => p.brand))].sort();

export const selectProductById = (id: string | null) => (s: ProductState) =>
  id ? (s.products.byId[id] ?? null) : null;

export const useFilteredProducts = () => useProductStore(useShallow(selectFilteredProducts));
export const useBrands = () => useProductStore(useShallow(selectBrands));
