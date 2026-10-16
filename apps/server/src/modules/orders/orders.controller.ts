import { getUserId, handle } from "../../lib/crud";
import * as S from "./orders.service";


/* ---------- Order ---------- */
export const orderController = {
  list: handle("Failed to fetch orders", (req: any) =>
    S.orderService.list(getUserId(req), req.query),
  ),
  get: handle("Failed to fetch order", (req: any) =>
    S.orderService.get(getUserId(req), req.params.id),
  ),
  create: handle(
    "Failed to create order",
    (req: any) => S.orderService.create(getUserId(req), req.body),
    201,
  ),
  update: handle("Failed to update order", (req: any) =>
    S.orderService.update(getUserId(req), req.params.id, req.body),
  ),
  remove: handle("Failed to delete order", (req: any) =>
    S.orderService.remove(getUserId(req), req.params.id),
  ),
};
