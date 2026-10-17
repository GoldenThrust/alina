import { del, get, put } from "../../lib/api";

/* =====================================================================
 * Preferences  —  /preferences  (single resource per user)
 * ===================================================================== */
 
export const getPreferences = () => get<Preference>("/preferences");
export const upsertPreferences = (body: UpsertPreferenceBody) =>
  put<Preference>("/preferences", body);
export const deletePreferences = () => del("/preferences");
 