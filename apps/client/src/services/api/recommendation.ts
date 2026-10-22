
import { get, put } from "./api";
type RecommendationDTO = Omit<Recommendation, "createdAt"> & { createdAt: string };

type ListResponse = { items: RecommendationDTO[]; nextCursor: string | null };

export interface RecommendationPage {
  recommendations: Recommendation[];
  /** Pass back as `cursor` for the next page. null means there are no more pages. */
  nextCursor: string | null;
}

const toRecommendation = ({ ...dto }: RecommendationDTO): Recommendation => ({
  ...dto,
  createdAt: new Date(dto.createdAt),
});

export async function getProductRecommendations(
  options: { accepted?: boolean; cursor?: string | null; limit?: number; signal?: AbortSignal } = {},
): Promise<RecommendationPage> {
  const {  cursor, limit, signal } = options;

  const response = await get<ListResponse>("/recommendations", {
    type: "PRODUCT",
    ...(cursor ? { cursor } : {}),
    ...(limit ? { limit } : {}),
    accepted: Boolean(options.accepted ?? false), 
    signal,
  });

  return {
    recommendations: response.items.map(toRecommendation),
    nextCursor: response.nextCursor ?? null,
  };
}

export async function getRecommendations(
  options: { type?: RecommendationType; accepted?: boolean; cursor?: string | null; limit?: number; signal?: AbortSignal } = {},
): Promise<RecommendationPage> {
  const { type, cursor, limit, signal } = options;

  const response = await get<ListResponse>("/recommendations", {
    ...(cursor ? { cursor } : {}),
    ...(limit ? { limit } : {}),
    ...(type ? { type } : {}),
    accepted: Boolean(options.accepted ?? false), 
    signal,
  });

  return {
    recommendations: response.items.map(toRecommendation),
    nextCursor: response.nextCursor ?? null,
  };
}

/** Adds a recommendation's product to the user's routine. Returns the updated recommendation if the server sends one. */
export async function addRecommendationToRoutine(recommendationId: string): Promise<Recommendation | null> {
  const dto = await put<RecommendationDTO | null>(`/recommendations/${recommendationId}`, { accepted: true });
  return dto ? { ...dto, createdAt: new Date(dto.createdAt) } : null;
}