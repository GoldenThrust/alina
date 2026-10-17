import path from "path";
import { assertOwned, createOwnedService } from "../../lib/crud";
import APIError from "../../errors/APIError";
import { ORM } from "../../prisma/db";

const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");


/* ===================== Subscription =====================
 * Read + cancel only. Creating/upgrading a plan must come from your payment
 * webhook, otherwise any client could POST { plan: "PREMIUM" } for free. */
const subscriptionBase = createOwnedService({
  label: "Subscription",
  model: ORM.Subscription,
  createFields: [],
  updateFields: [],
  filterFields: ["status", "plan"],
});

export const subscriptionService = {
  list: subscriptionBase.list,
  get: subscriptionBase.get,
  async cancel(userId: string, id: string) {
    const sub = await assertOwned(ORM.Subscription, id, userId, "Subscription");
    if (sub.status !== "ACTIVE") {
      throw new APIError("Only active subscriptions can be cancelled", 409);
    }
    return ORM.Subscription().where({ id, userId }).update({ status: "CANCELLED" });
  },
};
