import { create } from "zustand";

type ListKey = "favoriteBrands" | "favoriteIngredients" | "avoidedIngredients";

interface PreferenceState {
  preferences: Preference | null;

  setPreferences: (preferences: Preference) => void;
  setBudget: (budget: number | null) => void;
  /** Adds the value if missing, removes it if present. Case-insensitive. */
  toggle: (key: ListKey, value: string) => void;
  clear: () => void;
}

export const usePreferenceStore = create<PreferenceState>()((set) => ({
  preferences: null,

  setPreferences: (preferences) => set({ preferences }),
  setBudget: (budget) =>
    set((s) => (s.preferences ? { preferences: { ...s.preferences, budget } } : s)),
  toggle: (key, value) =>
    set((s) => {
      if (!s.preferences) return s;
      const list = s.preferences[key];
      const exists = list.some((v) => v.toLowerCase() === value.toLowerCase());
      const next = exists
        ? list.filter((v) => v.toLowerCase() !== value.toLowerCase())
        : [...list, value];
      return { preferences: { ...s.preferences, [key]: next } };
    }),
  clear: () => set({ preferences: null }),
}));

export const selectAvoidedIngredients = (s: PreferenceState) =>
  s.preferences?.avoidedIngredients ?? [];
export const selectBudget = (s: PreferenceState) => s.preferences?.budget ?? null;
