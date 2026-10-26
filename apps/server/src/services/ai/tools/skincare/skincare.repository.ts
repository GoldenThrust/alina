import { Temporal } from "@js-temporal/polyfill";
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

export interface TasteProfileView {
  favoriteBrands: string[];
  ageBand?:
    | "24_and_younger"
    | "25_to_29"
    | "30_to_34"
    | "35_to_44"
    | "45_to_54"
    | "55_and_older";
  gender?: "male" | "female";
  city?: string;
}

const orm = () => db.orm.public;

/* ------------------------- date serialization ------------------------- */

const DATE_KEYS = new Set(["createdAt", "completedAt"]);

/** True for any Temporal object (native or polyfill), which both set Symbol.toStringTag. */
const isTemporal = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  /^\[object Temporal\./.test(Object.prototype.toString.call(value));

/**
 * Converts a Temporal value, Date, epoch number or ISO string to a Temporal.Instant.
 * Going through the ISO string keeps this safe when the ORM's Temporal and the
 * polyfill are different implementations. Returns null if the value is unusable.
 */
const toInstant = (value: unknown): Temporal.Instant | null => {
  if (value === null || value === undefined) return null;
  try {
    if (value instanceof Date) {
      return Temporal.Instant.fromEpochMilliseconds(value.getTime());
    }
    if (typeof value === "number") {
      return Temporal.Instant.fromEpochMilliseconds(value);
    }
    return Temporal.Instant.from(String(value));
  } catch {
    return null;
  }
};

/**
 * The database returns Temporal.Instant. Convert it to a JS Date and then to an
 * ISO string: new Date(instant.epochMilliseconds).toISOString().
 * null/undefined and unusable values pass through.
 */
const toIso = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  const instant = toInstant(value);
  return instant ? new Date(instant.epochMilliseconds).toISOString() : value;
};

/**
 * Walks rows (including nested includes such as steps, product, routine,
 * routineStep, analysis) and converts every createdAt / completedAt to an
 * ISO string. Any other Temporal value is converted too, because it cannot
 * be copied with Object.entries. Call it on results only.
 */
function isoDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map(isoDates) as unknown as T;
  if (value instanceof Date) return value;
  if (isTemporal(value)) return toIso(value) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = DATE_KEYS.has(key) ? toIso(val) : isoDates(val);
    }
    return out as T;
  }
  return value;
}

export class SkincareRepository {
  /* ------------------------- scans ------------------------- */

  async scans(
    userId: string,
    opts: { limit: number; withAnalysis?: boolean },
  ): Promise<any[]> {
    let query = orm().SkinScan.where({ userId, status: "COMPLETED" });
    if (opts.withAnalysis) query = query.include("analysis");
    const rows = await query
      .orderBy((s: any) => s.createdAt.desc())
      .limit(opts.limit)
      .all();
    return isoDates(rows);
  }

  async findScan(userId: string, scanId: string): Promise<any | null> {
    const scan = await orm().SkinScan.where({ id: scanId, userId }).first();
    return scan ? isoDates(scan) : null;
  }

  async updateScan(scanId: string, data: Record<string, unknown>) {
    return await orm().SkinScan.where({ id: scanId }).update(data);
  }

  /* ------------------------- routines ------------------------- */

  async routines(
    userId: string,
    opts: { acceptedOnly: boolean },
  ): Promise<any[]> {
    if (opts.acceptedOnly) {
      const rows = await orm()
        .Routine.where({ userId })
        .where((r: any) => r.recommendation.some({ accepted: true }))
        .include("steps", (steps: any) =>
          steps.orderBy((s: any) => s.position.asc()),
        )
        .orderBy((r: any) => r.createdAt.desc())
        .all();
      return isoDates(rows);
    }
    const rows = await orm()
      .Routine.where({ userId })
      .include("steps", (steps: any) =>
        steps.orderBy((s: any) => s.position.asc()),
      )
      .orderBy((r: any) => r.createdAt.desc())
      .all();
    return isoDates(rows);
  }

  async routineById(id: string): Promise<any | null> {
    const routine = await orm()
      .Routine.where({ id })
      .include("steps", (steps: any) =>
        steps.orderBy((s: any) => s.position.asc()),
      )
      .first();
    return routine ? isoDates(routine) : null;
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
    return isoDates({ ...routine, steps });
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
        .aggregate((s: any) => ({ total: s.count() }))
    ).total;
    const step = await orm().RoutineStep.create({
      routineId: data.routineId,
      period: data.period,
      title: data.title,
      instruction: data.instruction,
      position: stepCount + 1,
    });

    return isoDates(step);
  }

  async routineLogs(
    userId: string,
    opts: { routineId?: string; since: Date; limit: number },
  ): Promise<any[]> {
    let q = orm().RoutineLog.where({ userId });

    if (opts.routineId) {
      q = q.where((r: any) =>
        r.routineStep.some({ routineId: opts.routineId }),
      );
    }
    const logs: any[] = await q
      .orderBy((l: any) => l.completedAt.desc())
      .limit(opts.limit)
      .all();

    // Filter on the raw dates first, then serialize.
    const since = Temporal.Instant.fromEpochMilliseconds(opts.since.getTime());
    const recent = logs.filter((l) => {
      const completedAt = toInstant(l.completedAt);
      return (
        completedAt !== null &&
        Temporal.Instant.compare(completedAt, since) >= 0
      );
    });
    return isoDates(recent);
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

    const recs = await orm()
      .Recommendation.where(where)
      .include("product")
      .include("routine")
      .include("routineStep")
      .orderBy((r: any) => r.createdAt.desc())
      .limit(opts.limit)
      .all();

    return isoDates(recs);
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
    if (existing) return isoDates(existing);
    return isoDates(await orm().Product.create(data));
  }

  async createRecommendation(data: {
    userId: string;
    scanId?: string;
    type: RecommendationType;
    explanation: string;
    productId?: string;
    routineId?: string;
  }) {
    return isoDates(
      await orm().Recommendation.create({ ...data, accepted: false }),
    );
  }

  /* ------------------------- messages & interaction ------------------------- */

  /** Latest messages for the user, oldest first. Requires `userId` on Message. */
  async messages(userId: string, limit: number): Promise<any[]> {
    const rows: any[] = await orm()
      .Message.where({ userId })
      .orderBy((m: any) => m.createdAt.desc())
      .limit(limit)
      .all();
    return isoDates(rows.reverse());
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

  
  async tasteProfile(userId: string): Promise<TasteProfileView> {
    const [pref, user] = await Promise.all([
      orm().Preference.where({ userId }).first(),
      orm().User.where({ id: userId }).first(),
    ]);

    const dob = user?.dateOfBirth ? toInstant(user.dateOfBirth) : null;
    let ageBand: TasteProfileView["ageBand"];
    if (dob) {
      const age = Math.floor(
        (Date.now() - dob.epochMilliseconds) / (365.25 * 24 * 3600 * 1000),
      );
      if (age >= 13 && age <= 120) {
        ageBand =
          age <= 24
            ? "24_and_younger"
            : age <= 29
              ? "25_to_29"
              : age <= 34
                ? "30_to_34"
                : age <= 44
                  ? "35_to_44"
                  : age <= 54
                    ? "45_to_54"
                    : "55_and_older";
      }
    }

    const g = String(user?.gender ?? "").toLowerCase();
    return {
      favoriteBrands: (pref?.favoriteBrands as string[]) ?? [],
      ageBand,
      gender: g === "male" || g === "female" ? g : undefined,
      city: user?.city?.trim() || undefined,
    };
  }

  async productsByBrands(brands: string[], perBrand = 2): Promise<any[]> {
    const out: any[] = [];
    for (const brand of brands.slice(0, 6)) {
      const rows = await orm().Product.where({ brand }).limit(perBrand).all();
      out.push(...rows);
    }
    return isoDates(out).map((p: any) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      price: p.price,
    }));
  }
}
