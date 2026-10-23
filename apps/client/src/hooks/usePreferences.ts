import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferenceStore } from "../stores";
import { savePreferences } from "../services/api/profile";

const SAVE_DELAY_MS = 600;

// Only the editable fields, so id/userId never count as a change
const serialize = (p: Preference | null) =>
  p
    ? JSON.stringify([
        p.favoriteBrands,
        p.favoriteIngredients,
        p.avoidedIngredients,
        p.budget,
      ])
    : "";

export function usePreferences() {
  const preferences = usePreferenceStore((s) => s.preferences);
  const [status, setStatus] = useState<Status>(
    preferences ? "ready" : "loading",
  );

  /** Snapshot the server last confirmed. Anything different is an unsaved edit. */
  const saved = useRef(serialize(preferences));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounced auto-save whenever the user edits something
  useEffect(() => {
    if (!preferences) return;
    const snapshot = serialize(preferences);
    if (snapshot === saved.current) return;

    timer.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await savePreferences(preferences);
        saved.current = snapshot;
        setStatus("ready");
      } catch {
        setStatus("saveError");
      }
    }, SAVE_DELAY_MS);

    return () => clearTimeout(timer.current);
  }, [preferences]);

  // Don't lose an edit made just before navigating away
  useEffect(
    () => () => {
      const latest = usePreferenceStore.getState().preferences;
      if (latest && serialize(latest) !== saved.current)
        void savePreferences(latest).catch(() => {});
    },
    [],
  );

  const retrySave = useCallback(() => {
    const current = usePreferenceStore.getState().preferences;
    if (current) usePreferenceStore.getState().setPreferences({ ...current }); // new reference re-triggers the save effect
  }, []);

  return { preferences, status, retrySave };
}
