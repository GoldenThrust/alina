import { create } from "zustand";
import { isFuture, newestFirst } from "../utils/dates";
import {
  emptyEntities, selectAll, setAll, upsertOne
} from "../utils/entities";

interface SubscriptionState {
  subscriptions: Entities<Subscription>;

  setSubscriptions: (subscriptions: Subscription[]) => void;
  upsertSubscription: (subscription: Subscription) => void;
  clear: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>()((set) => ({
  subscriptions: emptyEntities(),

  setSubscriptions: (subscriptions) => set({ subscriptions: setAll(subscriptions) }),
  upsertSubscription: (subscription) =>
    set((s) => ({ subscriptions: upsertOne(s.subscriptions, subscription) })),
  clear: () => set({ subscriptions: emptyEntities() }),
}));

/** Active and not past its expiry date. */
export const selectCurrentSubscription = (s: SubscriptionState): Subscription | null =>
  selectAll(s.subscriptions)
    .filter((x) => x.status === "ACTIVE" && (x.expiresAt === null || isFuture(x.expiresAt)))
    .sort(newestFirst((x) => x.startedAt))[0] ?? null;

export const selectPlan = (s: SubscriptionState): SubscriptionPlan =>
  selectCurrentSubscription(s)?.plan ?? "FREE";

export const selectIsPaid = (s: SubscriptionState) => selectPlan(s) !== "FREE";
export const selectIsPremium = (s: SubscriptionState) => selectPlan(s) === "PREMIUM";

/** Whole days until expiry; null for free or non-expiring plans. */
export function selectDaysRemaining(s: SubscriptionState): number | null {
  const current = selectCurrentSubscription(s);
  if (!current?.expiresAt) return null;
  const ms = current.expiresAt.getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 86_400_000));
}