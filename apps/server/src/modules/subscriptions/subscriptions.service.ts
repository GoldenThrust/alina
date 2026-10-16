import path from "path";

const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");


/* ===================== Subscription =====================
 * Read + cancel only. Creating/upgrading a plan must come from your payment
 * webhook, otherwise any client could POST { plan: "PREMIUM" } for free. */
const subscriptionBase = createOwnedService({
  label: "Subscription",
  model: M.Subscription,
  createFields: [],
  updateFields: [],
  filterFields: ["status", "plan"],
});

export const subscriptionService = {
  list: subscriptionBase.list,
  get: subscriptionBase.get,
  async cancel(userId: string, id: string) {
    const sub = await assertOwned(M.Subscription, id, userId, "Subscription");
    if (sub.status !== "ACTIVE") {
      throw new APIError("Only active subscriptions can be cancelled", 409);
    }
    return M.Subscription().where({ id, userId }).update({ status: "CANCELLED" });
  },
};
