import { del, get, post, put } from "../../lib/api";

/* =====================================================================
 * Orders  —  /orders
 * ===================================================================== */
 
export const listOrders = (params?: PaginationParams) => get<Paginated<Order>>("/orders", params);
export const getOrder = (id: ID) => get<Order>(`/orders/${id}`);
export const createOrder = (body: CreateOrderBody) => post<Order>("/orders", body);
export const updateOrder = (id: ID, body: UpdateOrderBody) => put<Order>(`/orders/${id}`, body);
export const deleteOrder = (id: ID) => del(`/orders/${id}`);
 