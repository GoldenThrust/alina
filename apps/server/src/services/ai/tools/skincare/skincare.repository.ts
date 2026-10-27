import { Temporal } from "@js-temporal/polyfill";
import { db } from "../../../../prisma/db";
import { type DateRange, toInstant } from "../../../../common/utils/date";

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

/* ------------------------- date range filter ------------------------- */

/**
 * The only place that touches the ORM's comparison syntax.
 * ASSUMPTION: a column on the callback form exposes gte / lte and accepts a
 * Temporal.Instant. If your ORM wants its own Temporal type or a string, convert
 * here (for example range.from.toString()).
 */
const withRange = (query: any, field: string, range: DateRange = {}) => {
  let out = query;
  if (range.from) out = out.where((m: any) => m[field].gte(range.from));
  if (range.to) out = out.where((m: any) => m[field].lte(range.to));
  return out;
};

/* ------------------------- date serialization ------------------------- */

const DATE_KEYS = new Set(["createdAt", "completedAt"]);

/** True for any Temporal object (native or polyfill), which both set Symbol.toStringTag. */
const isTemporal = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  /^\[object Temporal\./.test(Object.prototype.toString.call(value));

/**
 * The database returns Temporal.Instant. Output is the instant's ISO string.
 * null/undefined and unusable values pass through.
 */
const toIso = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  const instant = toInstant(value);
  return instant ? instant.toString() : value;
};

/**
 * Walks rows (including nested includes such as steps, product, routine,
 * routineStep, recommendations, analysis) and converts every createdAt /
 * completedAt to an ISO string. Any other Temporal value is converted too,
 * because it cannot be copied with Object.entries. Call it on results only.
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
    opts: { limit: number; withAnalysis?: boolean; range?: DateRange },
  ): Promise<any[]> {
    let query: any = orm().SkinScan.where({ userId, status: "COMPLETED" });
    query = withRange(query, "createdAt", opts.range);
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
    opts: { acceptedOnly: boolean; range?: DateRange },
  ): Promise<any[]> {
    let query: any = orm().Routine.where({ userId });
    if (opts.acceptedOnly) {
      // Only the ROUTINE recommendation counts. PRODUCT / HABIT / ROUTINE_STEP
      // recommendations share the routineId and must not mark it accepted.
      query = query.where((r: any) =>
        r.recommendations.some({ type: "ROUTINE", accepted: true }),
      );
    }
    query = withRange(query, "createdAt", opts.range);

    const rows = await query
      .include("steps", (steps: any) =>
        steps.orderBy((s: any) => s.position.asc()),
      )
      .include("recommendations")
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
      .include("recommendations")
      .first();
    return routine ? isoDates(routine) : null;
  }

  /** Ownership check: the routine only if it belongs to this user. */
  async findRoutine(userId: string, routineId: string): Promise<any | null> {
    const routine = await orm().Routine.where({ id: routineId, userId }).first();
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
    position?: number;
  }) {
    const routine = await orm()
      .Routine.where({ id: data.routineId })
      .first();
    if (!routine) throw new Error("Routine not found");

    // max + 1 rather than count + 1, so positions stay unique after deletions.
    let position = data.position;
    if (position === undefined) {
      const existing: any[] = await orm()
        .RoutineStep.where({ routineId: data.routineId })
        .all();
      position =
        existing.reduce((max, s) => Math.max(max, Number(s.position) || 0), 0) +
        1;
    }

    const step = await orm().RoutineStep.create({
      routineId: data.routineId,
      period: data.period,
      title: data.title,
      instruction: data.instruction,
      position,
    });

    return isoDates(step);
  }

  /* ------------------------- routine logs ------------------------- */

  async routineLogs(
    userId: string,
    opts: { routineId?: string; range?: DateRange; limit: number },
  ): Promise<any[]> {
    let stepIds: Set<string> | null = null;
    if (opts.routineId) {
      const steps: any[] = await orm()
        .RoutineStep.where({ routineId: opts.routineId })
        .all();
      stepIds = new Set(steps.map((s) => s.id));
      if (!stepIds.size) return [];
    }

    let query: any = orm().RoutineLog.where({ userId });
    query = withRange(query, "completedAt", opts.range);

    let logs: any[] = await query
      .orderBy((l: any) => l.completedAt.desc())
      .limit(opts.limit)
      .all();

    // RoutineLog.routineStep is a to-one relation, so filter by step id here.
    // This runs after `limit`; on a busy account a routine filter can return
    // fewer rows than exist. Move it into the query if your ORM has an `in` filter.
    if (stepIds) logs = logs.filter((l) => stepIds!.has(l.routineStepId));

    return isoDates(logs);
  }

  /* ------------------------- recommendations & products ------------------------- */

  async recommendations(
    userId: string,
    opts: {
      type?: RecommendationType;
      accepted?: boolean;
      limit: number;
      range?: DateRange;
    },
  ): Promise<any[]> {
    const where: Record<string, unknown> = { userId };
    if (opts.type) where.type = opts.type;
    if (opts.accepted !== undefined) where.accepted = opts.accepted;

    let query: any = orm().Recommendation.where(where);
    query = withRange(query, "createdAt", opts.range);

    const recs = await query
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
    // Scoped to the user: Product.productId on Recommendation is @unique, so a
    // product row must never be shared between users.
    const existing = await orm()
      .Product.where({
        userId: data.userId,
        name: data.name,
        brand: data.brand,
      })
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
    routineStepId?: string;
    accepted?: boolean;
  }) {
    // productId and routineStepId are @unique: reuse the existing row.
    if (data.productId) {
      const existing = await orm()
        .Recommendation.where({ productId: data.productId })
        .first();
      if (existing) return isoDates(existing);
    }
    if (data.routineStepId) {
      const existing = await orm()
        .Recommendation.where({ routineStepId: data.routineStepId })
        .first();
      if (existing) return isoDates(existing);
    }
    const { accepted = false, ...rest } = data;
    return isoDates(await orm().Recommendation.create({ ...rest, accepted }));
  }

  /* ------------------------- messages & interaction ------------------------- */

  /** Latest messages for the user, oldest first. Requires `userId` on Message. */
  async messages(
    userId: string,
    limit: number,
    range: DateRange = {},
  ): Promise<any[]> {
    let query: any = orm().Message.where({ userId });
    query = withRange(query, "createdAt", range);
    const rows: any[] = await query
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
        (Temporal.Now.instant().epochMilliseconds - dob.epochMilliseconds) /
          (365.25 * 24 * 3600 * 1000),
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