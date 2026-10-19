import { useAuthStore } from "./auth.store";
import { useChatStore } from "./chat.store";
import { useDeviceStore } from "./device.store";
import { useOrderStore } from "./order.store";
import { usePreferenceStore } from "./preference.store";
import { useProductStore } from "./product.store";
import { useRecommendationStore } from "./recommendation.store";
import { useRoutineStore } from "./routine.store";
import { useScanStore } from "./scan.store";
import { useSubscriptionStore } from "./subscription.store";

export * from "../utils/dates";
export * from "../utils/entities.store";
export * from "./auth.store";
export * from "./scan.store";
export * from "./routine.store";
export * from "./product.store";
export * from "./recommendation.store";
export * from "./chat.store";
export * from "./preference.store";
export * from "./subscription.store";
export * from "./order.store";
export * from "./device.store";

/** Clears every user-owned store. Products are shared catalogue data, so they stay. */
export function resetUserData() {
  useScanStore.getState().clear();
  useRoutineStore.getState().clear();
  useRecommendationStore.getState().clear();
  useChatStore.getState().clear();
  usePreferenceStore.getState().clear();
  useSubscriptionStore.getState().clear();
  useOrderStore.getState().clear();
  useDeviceStore.getState().clear();
  useProductStore.getState().clear();
}

/** Sign out and wipe everything belonging to the previous user. */
export function signOutAndReset() {
  useAuthStore.getState().signOut();
  resetUserData();
}
