import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { newestFirst } from "../utils/dates";
import {
  emptyEntities, patchOne, removeOne, selectAll, setAll, upsertMany, upsertOne,
} from "../utils/entities.store";

interface RecommendationState {
  recommendations: Entities<Recommendation>;

  setRecommendations: (items: Recommendation[]) => void;
  upsertRecommendations: (items: Recommendation[]) => void;
  upsertRecommendation: (item: Recommendation) => void;
  /** Optimistic accept; roll back by calling again with `false`. */
  setAccepted: (id: string, accepted: boolean) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useRecommendationStore = create<RecommendationState>()((set) => ({
  recommendations: emptyEntities(),

  setRecommendations: (items) => set({ recommendations: setAll(items) }),
  upsertRecommendations: (items) =>
    set((s) => ({ recommendations: upsertMany(s.recommendations, items) })),
  upsertRecommendation: (item) =>
    set((s) => ({ recommendations: upsertOne(s.recommendations, item) })),
  setAccepted: (id, accepted) =>
    set((s) => ({ recommendations: patchOne(s.recommendations, id, { accepted }) })),
  remove: (id) => set((s) => ({ recommendations: removeOne(s.recommendations, id) })),
  clear: () => set({ recommendations: emptyEntities() }),
}));

export const selectRecommendations = (s: RecommendationState) =>
  selectAll(s.recommendations).sort(newestFirst((r) => r.createdAt));

export const selectPendingRecommendations = (s: RecommendationState) =>
  selectRecommendations(s).filter((r) => !r.accepted);

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
