import { getUserId, handle } from "../../lib/crud";
import * as S from "./preferences.service";

/* ---------- Preference (singleton per user) ---------- */
export const preferenceController = {
  get: handle("Failed to fetch preferences", (req: any) =>
    S.preferenceService.get(getUserId(req)),
  ),
  upsert: handle("Failed to save preferences", (req: any) =>
    S.preferenceService.upsert(getUserId(req), req.body),
  ),
  remove: handle("Failed to delete preferences", (req: any) =>
    S.preferenceService.remove(getUserId(req)),
  ),
};