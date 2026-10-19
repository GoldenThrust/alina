import { get, post } from "../../api/auth";

/* =====================================================================
 * Subscriptions  —  /subscriptions  (read + cancel)
 * ===================================================================== */
 
export const listSubscriptions = (params?: PaginationParams) =>
  get<Paginated<Subscription>>("/subscriptions", params);
export const getSubscription = (id: ID) => get<Subscription>(`/subscriptions/${id}`);
export const cancelSubscription = (id: ID) =>
  post<Subscription>(`/subscriptions/${id}/cancel`);
 