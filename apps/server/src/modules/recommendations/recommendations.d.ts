import type z from "zod";
import type { CreateRecommendationBody, UpdateRecommendationBody } from "./recommendations.schema";

export type CreateRecommendationBody = z.infer<typeof CreateRecommendationBody>;
export type UpdateRecommendationBody = z.infer<typeof UpdateRecommendationBody>;