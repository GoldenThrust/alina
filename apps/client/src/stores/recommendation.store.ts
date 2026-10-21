import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { newestFirst } from "../utils/dates";
import {
  emptyEntities,
  patchOne,
  removeOne,
  selectAll,
  setAll,
  upsertMany,
  upsertOne,
} from "../utils/entities";
import { MOCK_RECOMMENDATIONS } from "../data/recommendation";

interface RecommendationState {
  recommendations: Entities<Recommendation>;

  setRecommendations: (items: Recommendation[]) => void;
  upsertRecommendations: (items: Recommendation[]) => void;
  patchRecommendation: (id: string, patch: Partial<Recommendation>) => void;
  upsertRecommendation: (item: Recommendation) => void;
  /** Optimistic accept; roll back by calling again with `false`. */
  setAccepted: (id: string, accepted: boolean) => void;
  remove: (id: string) => void;
  clear: () => void;
  setDemoRecommendations: () => void;
}

export const useRecommendationStore = create<RecommendationState>()((set) => ({
  recommendations: emptyEntities(),

  setRecommendations: (items) => set({ recommendations: setAll(items) }),
  // recommendation store (and add them to its interface)
  upsertRecommendations: (items) =>
    set((s) => ({ recommendations: upsertMany(s.recommendations, items) })),

  patchRecommendation: (id, patch) =>
    set((s) => {
      const current = s.recommendations.byId[id];
      return current
        ? {
            recommendations: upsertOne(s.recommendations, {
              ...current,
              ...patch,
            }),
          }
        : s;
    }),

  upsertRecommendation: (item) =>
    set((s) => ({ recommendations: upsertOne(s.recommendations, item) })),
  setAccepted: (id, accepted) =>
    set((s) => ({
      recommendations: patchOne(s.recommendations, id, { accepted }),
    })),
  remove: (id) =>
    set((s) => ({ recommendations: removeOne(s.recommendations, id) })),
  clear: () => set({ recommendations: emptyEntities() }),
  setDemoRecommendations: () => {
    useRecommendationStore.getState().setRecommendations(MOCK_RECOMMENDATIONS);
  },
}));

export const selectRecommendations = (s: RecommendationState) =>
  selectAll(s.recommendations).sort(newestFirst((r) => r.createdAt));

export const selectPendingRecommendations = (s: RecommendationState) =>
  selectRecommendations(s).filter((r) => !r.accepted);

export const selectPendingRecommendationsOfType =
  (type: RecommendationType) => (s: RecommendationState) =>
    selectPendingRecommendations(s).filter((r) => r.type === type);

export const selectRecommendationsOfType =
  (type: RecommendationType) => (s: RecommendationState) =>
    selectRecommendations(s).filter((r) => r.type === type);

export const selectRecommendationsForScan =
  (scanId: string | null) => (s: RecommendationState) =>
    selectRecommendations(s).filter((r) => r.scanId === scanId);

export const useRecommendations = () =>
  useRecommendationStore(useShallow(selectRecommendations));
export const usePendingRecommendations = () =>
  useRecommendationStore(useShallow(selectPendingRecommendations));

export const usePendingRecommendationsOfType = (type: RecommendationType) =>
  useRecommendationStore(useShallow(selectPendingRecommendationsOfType(type)));

export const useRecommendationsForScan = (scanId: string | null) =>
  useRecommendationStore(useShallow(selectRecommendationsForScan(scanId)));

export const useRecommendationsOfType = (type: RecommendationType) =>
  useRecommendationStore(useShallow(selectRecommendationsOfType(type)));
