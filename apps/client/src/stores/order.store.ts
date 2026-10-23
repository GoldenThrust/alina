import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { newestFirst } from "../utils/dates";
import {
  emptyEntities, removeOne, selectAll, setAll, upsertOne
} from "../utils/entities";

interface OrderState {
  orders: Entities<Order>;

  setOrders: (orders: Order[]) => void;
  upsertOrder: (order: Order) => void;
  removeOrder: (orderId: string) => void;
  clear: () => void;
}

export const useOrderStore = create<OrderState>()((set) => ({
  orders: emptyEntities(),

  setOrders: (orders) => set({ orders: setAll(orders) }),
  upsertOrder: (order) => set((s) => ({ orders: upsertOne(s.orders, order) })),
  removeOrder: (orderId) => set((s) => ({ orders: removeOne(s.orders, orderId) })),
  clear: () => set({ orders: emptyEntities() }),
}));

export const selectOrders = (s: OrderState) =>
  selectAll(s.orders).sort(newestFirst((o) => o.createdAt));

export const selectTotalSpent = (s: OrderState) =>
  selectAll(s.orders).reduce((sum, o) => sum + o.total, 0);

export const selectOrderById = (id: string | null) => (s: OrderState) =>
  id ? (s.orders.byId[id] ?? null) : null;

export const useOrders = () => useOrderStore(useShallow(selectOrders));
