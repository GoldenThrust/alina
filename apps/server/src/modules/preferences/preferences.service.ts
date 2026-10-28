// import path from "path";
import APIError from "../../errors/APIError";
import { ORM } from "../../prisma/db";
import { pick } from "../../lib/crud";
import type { UpsertPreferenceBody } from "./preferences";

/* ===================== Preference (one per user) ===================== */
const PREFERENCE_FIELDS = [
  "favoriteBrands",
  "favoriteIngredients",
  "avoidedIngredients",
  "budget",
] as const;

export const preferenceService = {
  async get(userId: string) {
    const pref = await ORM.Preference().where({ userId }).first();
    if (!pref) throw new APIError("Preferences not found", 404);
    return pref;
  },
  async upsert(userId: string, payload: UpsertPreferenceBody) {
    const data = pick(payload, PREFERENCE_FIELDS);
    const existing = await ORM.Preference().where({ userId }).first();
    if (existing) return ORM.Preference().where({ userId }).update(data);
    return ORM.Preference().create({
      userId,
      favoriteBrands: payload.favoriteBrands ?? [],
      favoriteIngredients: payload.favoriteIngredients ?? [],
      avoidedIngredients: payload.avoidedIngredients ?? [],
      budget: payload.budget ?? null,
    });
  },
  async remove(userId: string) {
    await preferenceService.get(userId);
    await ORM.Preference().where({ userId }).delete();
    return { message: "Preferences deleted successfully" };
  },
};
