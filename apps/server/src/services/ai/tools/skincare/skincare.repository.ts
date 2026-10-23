import { db } from "../../../../prisma/db";

export type RoutinePeriod =
  "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | "HABIT";

export type ProductCategory =
  | "CLEANSER"
  | "TONER"
  | "SERUM"
  | "MOISTURIZER"
  | "SUNSCREEN"
  | "TREATMENT"
  | "OTHER";

// db.orm.public;
export type RecommendationType =
  "PRODUCT" | "ROUTINE" | "HABIT" | "ROUTINE_STEP";
export type Sender = "USER" | "ALINA";

export interface StepInput {
  period: RoutinePeriod;
  title: string;
  instruction: string;
}

export interface PreferenceView {
  skinType: string | null;
  skinTone: string | null;
  favoriteBrands: string[];
  favoriteIngredients: string[];
  avoidedIngredients: string[];
  budget: number | null;
}

const orm = () => db.orm.public;

export class SkincareRepository {
  /* ------------------------- scans ------------------------- */

  async scans(
    userId: string,
    opts: { limit: number; withAnalysis?: boolean },
  ): Promise<any[]> {
    let query = orm().SkinScan.where({ userId, status: "COMPLETED" });
    if (opts.withAnalysis) query = query.include("analysis");
    return query
      .orderBy((s: any) => s.createdAt.desc())
      .limit(opts.limit)
      .all();
  }

  async findScan(userId: string, scanId: string): Promise<any | null> {
    return (await orm().SkinScan.where({ id: scanId, userId }).first()) ?? null;
  }

  async updateScan(scanId: string, data: Record<string, unknown>) {
    return orm().SkinScan.where({ id: scanId }).update(data);
  }

  /* ------------------------- routines ------------------------- */

  async routines(
    userId: string,
    opts: { acceptedOnly: boolean },
  ): Promise<any[]> {
    if (opts.acceptedOnly) {
      return orm()
        .Routine.where({ userId })
        .where((r) => r.recommendation.some({ accepted: true }))
        .include("steps", (steps: any) =>
          steps.orderBy((s: any) => s.position.asc()),
        )
        .orderBy((r: any) => r.createdAt.desc())
        .all();
    }
    return orm()
      .Routine.where({ userId })
      .include("steps", (steps: any) =>
        steps.orderBy((s: any) => s.position.asc()),
      )
      .orderBy((r: any) => r.createdAt.desc())
      .all();
  }

  async routineById(id: string): Promise<any | null> {
    return (
      (await orm()
        .Routine.where({ id })
        .include("steps", (steps: any) =>
          steps.orderBy((s: any) => s.position.asc()),
        )
        .first()) ?? null
    );
  }

  async createRoutine(data: {
    userId: string;
    title: string;
    steps: StepInput[];
  }) {
    const routine = await orm().Routine.create({
      userId: data.userId,
      title: data.title,
    });

    const steps = [];
    for (const [index, step] of data.steps.entries()) {
      steps.push(
        await orm().RoutineStep.create({
          routineId: routine.id,
          period: step.period,
          title: step.title,
          instruction: step.instruction,

          position: index + 1,
        }),
      );
    }
    return { ...routine, steps };
  }

  async createRoutineStep(data: {
    routineId: string;
    period: RoutinePeriod;
    title: string;
    instruction: string;
  }) {
    const routine = await orm()
      .Routine.where({
        id: data.routineId,
      })
      .first();
    if (!routine) throw new Error("Routine not found");

    const stepCount = (
      await orm()
        .RoutineStep.where({ routineId: data.routineId })
        .aggregate((s) => ({ total: s.count() }))
    ).total;
    const step = await orm().RoutineStep.create({
      routineId: data.routineId,
      period: data.period,
      title: data.title,
      instruction: data.instruction,
      position: stepCount + 1,
    });

    return step;
  }

  async routineLogs(
    userId: string,
    opts: { routineId?: string; since: Date; limit: number },
  ): Promise<any[]> {
    let q = orm().RoutineLog.where({ userId });

    if (opts.routineId) {
      q = q.where((r) => r.routineStep.some({ routineId: opts.routineId }));
    }
    const logs: any[] = await q
      .orderBy((l: any) => l.completedAt.desc())
      .limit(opts.limit)
      .all();

    return logs.filter((l) => new Date(l.completedAt ?? null) >= opts.since);
  }

  /* ------------------------- recommendations & products ------------------------- */

  async recommendations(
    userId: string,
    opts: {
      type?: RecommendationType;
      accepted?: boolean;
      limit: number;
    },
  ): Promise<any[]> {
    const where: Record<string, unknown> = { userId };
    if (opts.type) where.type = opts.type;
    if (opts.accepted !== undefined) where.accepted = opts.accepted;

    const recs: any[] = await orm()
      .Recommendation.where(where)
      .orderBy((r: any) => r.createdAt.desc())
      .limit(opts.limit)
      .all();

    return Promise.all(
      recs.map(async (rec) => ({
        ...rec,
        product: rec.productId
          ? ((await orm().Product.where({ id: rec.productId }).first()) ?? null)
          : null,
        routine: rec.routineId ? await this.routineById(rec.routineId) : null,
      })),
    );
  }

  async findOrCreateProduct(data: {
    userId: string;
    name: string;
    brand: string;
    image?: string;
    category: ProductCategory;
    description: string;
    price?: number;
    affiliateUrl?: string;
  }) {
    const existing = await orm()
      .Product.where({ name: data.name, brand: data.brand })
      .first();
    if (existing) return existing;
    return orm().Product.create(data);
  }

  async createRecommendation(data: {
    userId: string;
    scanId?: string;
    type: RecommendationType;
    explanation: string;
    productId?: string;
    routineId?: string;
  }) {
    return orm().Recommendation.create({ ...data, accepted: false });
  }

  /* ------------------------- messages & interaction ------------------------- */

  /** Latest messages for the user, oldest first. Requires `userId` on Message. */
  async messages(userId: string, limit: number): Promise<any[]> {
    const rows: any[] = await orm()
      .Message.where({ userId })
      .orderBy((m: any) => m.createdAt.desc())
      .limit(limit)
      .all();
    return rows.reverse();
  }

  /** Requires `lastInteractionId String?` on the User model. */
  async lastInteractionId(userId: string): Promise<string | undefined> {
    const user = await orm().User.where({ id: userId }).first();
    return user?.lastInteractionId ?? undefined;
  }

  async saveInteractionId(userId: string, interactionId: string) {
    await orm()
      .User.where({ id: userId })
      .update({ lastInteractionId: interactionId });
  }

  /** Start fresh: the next request begins a new interaction chain. */
  async resetInteraction(userId: string) {
    await orm().User.where({ id: userId }).update({ lastInteractionId: null });
  }

  /* ------------------------- preferences ------------------------- */

  async preferences(userId: string): Promise<PreferenceView> {
    const [pref, user] = await Promise.all([
      orm().Preference.where({ userId }).first(),
      orm().User.where({ id: userId }).first(),
    ]);
    return {
      skinType: user?.skinType ?? null,
      skinTone: user?.skinTone ?? null,
      favoriteBrands: (pref?.favoriteBrands as string[]) ?? [],
      favoriteIngredients: (pref?.favoriteIngredients as string[]) ?? [],
      avoidedIngredients: (pref?.avoidedIngredients as string[]) ?? [],
      budget: pref?.budget ?? null,
    };
  }
}
