import { del, get, post, put } from "../../api/auth";

/* =====================================================================
 * Recommendations  —  /recommendations
 * ===================================================================== */
 
export const listRecommendations = (params?: ListRecommendationsParams) =>
  get<Paginated<Recommendation>>("/recommendations", params);
export const getRecommendation = (id: ID) => get<Recommendation>(`/recommendations/${id}`);
export const createRecommendation = (body: CreateRecommendationBody) =>
  post<Recommendation>("/recommendations", body);
export const updateRecommendation = (id: ID, body: UpdateRecommendationBody) =>
  put<Recommendation>(`/recommendations/${id}`, body);
export const deleteRecommendation = (id: ID) => del(`/recommendations/${id}`);
 