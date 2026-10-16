import { getUserId, handle } from "../../lib/crud";
import * as S from "./subscriptions.service"


/* ---------- Subscription (read + cancel) ---------- */
export const subscriptionController = {
  list: handle("Failed to fetch subscriptions", (req: any) =>
    S.subscriptionService.list(getUserId(req), req.query),
  ),
  get: handle("Failed to fetch subscription", (req: any) =>
    S.subscriptionService.get(getUserId(req), req.params.id),
  ),
  cancel: handle("Failed to cancel subscription", (req: any) =>
    S.subscriptionService.cancel(getUserId(req), req.params.id),
  ),
};
