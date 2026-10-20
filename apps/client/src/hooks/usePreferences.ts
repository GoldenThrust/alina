import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPreferences, savePreferences } from "../data/preferences";
import { usePreferenceStore } from "../stores";
import { isAbort } from "../utils/signal";

const SAVE_DELAY_MS = 600;

// Only the editable fields, so id/userId never count as a change
const serialize = (p: Preference | null) =>
  p ? JSON.stringify([p.favoriteBrands, p.favoriteIngredients, p.avoidedIngredients, p.budget]) : "";

export function usePreferences() {
  const preferences = usePreferenceStore((s) => s.preferences);
  const [status, setStatus] = useState<Status>(preferences ? "ready" : "loading");

  /** Snapshot the server last confirmed. Anything different is an unsaved edit. */
  const saved = useRef(serialize(preferences));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const loaded = await fetchPreferences({ signal });
      saved.current = serialize(loaded); // set first so the save effect sees no change
      usePreferenceStore.getState().setPreferences(loaded);
      setStatus("ready");
    } catch (err) {
      if (isAbort(err)) return;
      setStatus("loadError");
    }
  }, []);

  // Load once. Coming back to the page reuses what the store already has.
  useEffect(() => {
    if (usePreferenceStore.getState().preferences) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

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
      if (latest && serialize(latest) !== saved.current) void savePreferences(latest).catch(() => {});
    },
    [],
  );

  const retryLoad = useCallback(() => void load(), [load]);
  const retrySave = useCallback(() => {
    const current = usePreferenceStore.getState().preferences;
    if (current) usePreferenceStore.getState().setPreferences({ ...current }); // new reference re-triggers the save effect
  }, []);

  return { preferences, status, retryLoad, retrySave };
}