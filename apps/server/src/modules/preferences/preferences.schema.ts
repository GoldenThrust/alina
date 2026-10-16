import { z } from "zod";


/* ---------- Preference (one per user) ---------- */
export const UpsertPreferenceBody = z.object({
  favoriteBrands: z.array(z.string()).optional(),
  favoriteIngredients: z.array(z.string()).optional(),
  avoidedIngredients: z.array(z.string()).optional(),
  budget: z.number().int().nonnegative().optional(),
});
