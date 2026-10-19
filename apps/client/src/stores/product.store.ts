import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { emptyEntities, selectAll, setAll, upsertMany } from "../utils/entities";
import { MOCK_PRODUCTS } from "../data/product";

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
  setDemoProducts: () => void;
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
  setDemoProducts: () => {
    useProductStore.getState().setProducts(MOCK_PRODUCTS);
  },
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

export const selectRecommendedProducts = (s: ProductState, recommendedIds: string[]) =>
  recommendedIds.map((id) => s.products.byId[id]).filter((p): p is Product => !!p);

export const useProducts = () => useProductStore(useShallow((s) => selectAll(s.products)));
export const useProductById = (id: string | null) =>
  useProductStore(useShallow(selectProductById(id)));
export const useRecommendedProducts = (recommendedIds: string[]) =>
  useProductStore(useShallow((s) => selectRecommendedProducts(s, recommendedIds)));

export const useFilteredProducts = () => useProductStore(useShallow(selectFilteredProducts));
export const useBrands = () => useProductStore(useShallow(selectBrands));
