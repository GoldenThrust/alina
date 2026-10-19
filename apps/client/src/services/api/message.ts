import { del, get, post } from "../../api/auth";
/* =====================================================================
 * Messages  —  /messages  (immutable: no update)
 * ===================================================================== */

 
export const listMessages = (params?: PaginationParams) =>
  get<Paginated<Message>>("/messages", params);
export const getMessage = (id: ID) => get<Message>(`/messages/${id}`);
export const createMessage = (body: CreateMessageBody) => post<Message>("/messages", body);
export const deleteMessage = (id: ID) => del(`/messages/${id}`);
