import { z } from "zod";
import { PaginationQuery } from "../../lib/schemas";

export const RecommendationType = z.enum(["PRODUCT", "ROUTINE", "HABIT"]);

/* ---------- Recommendation ---------- */
export const CreateRecommendationBody = z.object({
  type: RecommendationType,
  explanation: z.string().min(1),
  scanId: z.uuid().optional(),
  productId: z.uuid().optional(),
  routineId: z.uuid().optional(),
});
export const UpdateRecommendationBody = z.object({ accepted: z.boolean() });
export const ListRecommendationsQuery = PaginationQuery.extend({
  type: RecommendationType.optional(),
  accepted: z.stringbool().optional(),
});
