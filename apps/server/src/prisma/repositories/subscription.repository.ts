import { BaseRepository } from "./base.repository";
import type {
  NewSubscription,
  Subscription,
  SubscriptionPlan,
} from "./types";

export class SubscriptionRepository extends BaseRepository<
  Subscription,
  NewSubscription
> {
  protected readonly model = "Subscription";

  listForUser(userId: string) {
    return this.findMany({ userId }, { orderBy: { field: "startedAt" } });
  }

  /** The user's ACTIVE subscription that has not expired, newest first. */
  async current(userId: string): Promise<Subscription | null> {
    const now = new Date();
    const active = await this.findMany({ userId, status: "ACTIVE" });
    return (
      active
        .filter((s) => !s.expiresAt || new Date(s.expiresAt) > now)
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )[0] ?? null
    );
  }

  async currentPlan(userId: string): Promise<SubscriptionPlan> {
    return (await this.current(userId))?.plan ?? "FREE";
  }

  start(
    userId: string,
    plan: SubscriptionPlan,
    expiresAt: Date | null = null,
  ) {
    return this.create({
      userId,
      plan,
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt,
    });
  }

  cancel(id: string) {
    return this.update(id, { status: "CANCELLED" });
  }

  expire(id: string) {
    return this.update(id, { status: "EXPIRED" });
  }
}
