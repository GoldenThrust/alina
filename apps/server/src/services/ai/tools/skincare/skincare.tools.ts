import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import { BaseTool } from "../base.tool";
import type { ToolContext } from "../tool";
import type { SkincareRepository } from "./skincare.repository";
import {
  type DateRange,
  dateRangeShape,
  rangeError,
  rangeIsOrdered,
  resolveDateRange,
  toInstant,
  utcDay,
} from "../../../../common/utils/date";
// import { fetchTasteInsights } from "../../qloo/qloo.client";

const length = z.enum(["short", "long"]);
const period = z.enum(["MORNING", "AFTERNOON", "EVENING", "NIGHT", "HABIT"]);
const recommendationType = z.enum([
  "PRODUCT",
  "ROUTINE",
  "HABIT",
  "ROUTINE_STEP",
]);
const category = z.enum([
  "CLEANSER",
  "TONER",
  "SERUM",
  "MOISTURIZER",
  "SUNSCREEN",
  "TREATMENT",
  "OTHER",
]);

const limitOf = (max: number) => z.number().int().min(1).max(max).optional();

const stepSchema = z.object({
  period,
  title: z.string().min(1),
  instruction: z.string().min(1),
});

abstract class SkincareTool<TInput, TResult = unknown> extends BaseTool<
  TInput,
  TResult
> {
  constructor(protected readonly repo: SkincareRepository) {
    super();
  }

  /** The model supplies routine ids, so make sure they belong to this user. */
  protected async requireRoutine(userId: string, routineId: string) {
    const routine = await this.repo.findRoutine(userId, routineId);
    if (!routine) {
      throw new Error(
        `Routine ${routineId} not found for this user. Use an id from get_routines or from recommend_routine.`,
      );
    }
    return routine;
  }
}

/* ============================ READ ============================ */

const scanHistorySchema = z
  .object({ ...dateRangeShape, limit: limitOf(20) })
  .refine(rangeIsOrdered, rangeError);

export class GetScanHistoryTool extends SkincareTool<
  z.infer<typeof scanHistorySchema>
> {
  readonly name = "get_scan_history";
  readonly description =
    "Fetch the user's completed skin scans with score, skin age and detailed metrics, newest first. Optional startDate/endDate limit the period.";
  readonly schema = scanHistorySchema;

  protected async executeInternal(
    input: z.infer<typeof scanHistorySchema>,
    { userId }: ToolContext,
  ) {
    return await this.repo.scans(userId, {
      limit: input.limit ?? 5,
      withAnalysis: true,
      range: resolveDateRange(input),
    });
  }
}

const previousSchema = z
  .object({
    ...dateRangeShape,
    length: length.optional(),
    limit: limitOf(20),
  })
  .refine(rangeIsOrdered, rangeError);

export class GetPreviousSummariesTool extends SkincareTool<
  z.infer<typeof previousSchema>
> {
  readonly name = "get_previous_summaries";
  readonly description =
    "Fetch summaries saved on the user's previous scans, newest first. Optional startDate/endDate limit the period.";
  readonly schema = previousSchema;

  protected async executeInternal(
    input: z.infer<typeof previousSchema>,
    { userId }: ToolContext,
  ) {
    const scans = await this.repo.scans(userId, {
      limit: input.limit ?? 5,
      range: resolveDateRange(input),
    });
    return scans
      .filter((s) => s.aiShortSummary || s.aiSummary)
      .map((s) => ({
        scanId: s.id,
        createdAt: s.createdAt,
        ...(input.length !== "long" && { short: s.aiShortSummary }),
        ...(input.length !== "short" && { long: s.aiSummary }),
      }));
  }
}

export class GetPreviousObservationsTool extends SkincareTool<
  z.infer<typeof previousSchema>
> {
  readonly name = "get_previous_observations";
  readonly description =
    "Fetch observations saved on the user's previous scans, newest first. Optional startDate/endDate limit the period.";
  readonly schema = previousSchema;

  protected async executeInternal(
    input: z.infer<typeof previousSchema>,
    { userId }: ToolContext,
  ) {
    const scans = await this.repo.scans(userId, {
      limit: input.limit ?? 5,
      range: resolveDateRange(input),
    });
    return scans
      .filter((s) => s.aiShortObservation || s.aiObservation)
      .map((s) => ({
        scanId: s.id,
        createdAt: s.createdAt,
        ...(input.length !== "long" && { short: s.aiShortObservation }),
        ...(input.length !== "short" && { long: s.aiObservation }),
      }));
  }
}

const getRecommendationsSchema = z
  .object({
    ...dateRangeShape,
    type: recommendationType.optional(),
    accepted: z.boolean().optional(),
    limit: limitOf(30),
  })
  .refine(rangeIsOrdered, rangeError);

export class GetRecommendationsTool extends SkincareTool<
  z.infer<typeof getRecommendationsSchema>
> {
  readonly name = "get_recommendations";
  readonly description =
    "Fetch recommendations already made to the user (products, routines, habits, routine steps) with their product or routine details. Optional startDate/endDate limit the period.";
  readonly schema = getRecommendationsSchema;

  protected async executeInternal(
    input: z.infer<typeof getRecommendationsSchema>,
    { userId }: ToolContext,
  ) {
    return await this.repo.recommendations(userId, {
      type: input.type,
      accepted: input.accepted,
      limit: input.limit ?? 10,
      range: resolveDateRange(input),
    });
  }
}

const getRoutinesSchema = z
  .object({ ...dateRangeShape, acceptedOnly: z.boolean().optional() })
  .refine(rangeIsOrdered, rangeError);

export class GetRoutinesTool extends SkincareTool<
  z.infer<typeof getRoutinesSchema>
> {
  readonly name = "get_routines";
  readonly description =
    "Fetch the user's routines with their steps. Accepted routines only by default; pass acceptedOnly false to include suggestions not yet accepted. Optional startDate/endDate filter by when the routine was created.";
  readonly schema = getRoutinesSchema;

  protected async executeInternal(
    input: z.infer<typeof getRoutinesSchema>,
    { userId }: ToolContext,
  ) {
    return await this.repo.routines(userId, {
      acceptedOnly: input.acceptedOnly ?? true,
      range: resolveDateRange(input),
    });
  }
}

const getRoutineLogsSchema = z
  .object({
    ...dateRangeShape,
    routineId: z.string().optional(),
    days: z.number().int().min(1).max(90).optional(),
    limit: limitOf(200),
  })
  .refine(rangeIsOrdered, rangeError);

export class GetRoutineLogsTool extends SkincareTool<
  z.infer<typeof getRoutineLogsSchema>
> {
  readonly name = "get_routine_logs";
  readonly description =
    "Fetch routine completion logs, with the number of days the user completed a routine out of the window. Use days for a window ending now, or startDate/endDate for an explicit period (startDate takes precedence over days).";
  readonly schema = getRoutineLogsSchema;

  protected async executeInternal(
    input: z.infer<typeof getRoutineLogsSchema>,
    { userId }: ToolContext,
  ) {
    const explicit = resolveDateRange(input);
    const to = explicit.to ?? Temporal.Now.instant();
    const from =
      explicit.from ?? to.subtract({ hours: (input.days ?? 14) * 24 });
    const range: DateRange = { from, to };

    const logs = await this.repo.routineLogs(userId, {
      routineId: input.routineId,
      range,
      limit: input.limit ?? 100,
    });

    const activeDays = new Set(
      logs.flatMap((l) => {
        const at = toInstant(l.completedAt);
        return at ? [utcDay(at)] : [];
      }),
    );

    const fromDay = from.toZonedDateTimeISO("UTC").toPlainDate();
    const toDay = to.toZonedDateTimeISO("UTC").toPlainDate();
    const windowDays = Math.max(
      1,
      fromDay.until(toDay, { largestUnit: "days" }).days + 1,
    );

    return {
      from: from.toString(),
      to: to.toString(),
      windowDays,
      completions: logs.length,
      daysWithCompletion: activeDays.size,
      adherence: Number((activeDays.size / windowDays).toFixed(2)),
      logs,
    };
  }
}

const getConversationSchema = z
  .object({ ...dateRangeShape, limit: limitOf(100) })
  .refine(rangeIsOrdered, rangeError);

export class GetConversationTool extends SkincareTool<
  z.infer<typeof getConversationSchema>
> {
  readonly name = "get_conversation";
  readonly description =
    "Fetch the user's most recent chat messages (sender USER or ALINA), oldest first. Optional startDate/endDate limit the period.";
  readonly schema = getConversationSchema;

  protected async executeInternal(
    input: z.infer<typeof getConversationSchema>,
    { userId }: ToolContext,
  ) {
    return await this.repo.messages(
      userId,
      input.limit ?? 20,
      resolveDateRange(input),
    );
  }
}

const getPreferencesSchema = z.object({});

export class GetPreferencesTool extends SkincareTool<
  z.infer<typeof getPreferencesSchema>
> {
  readonly name = "get_preferences";
  readonly description =
    "Fetch the user's skin type, skin tone, favorite brands, favorite ingredients, avoided ingredients and budget.";
  readonly schema = getPreferencesSchema;

  protected async executeInternal(
    _input: z.infer<typeof getPreferencesSchema>,
    { userId }: ToolContext,
  ) {
    return await this.repo.preferences(userId);
  }
}

/* ============================ WRITE ============================ */

const saveTextSchema = z.object({
  scanId: z.string().min(1),
  length,
  content: z.string().min(1),
});

abstract class SaveScanTextTool extends SkincareTool<
  z.infer<typeof saveTextSchema>
> {
  readonly schema = saveTextSchema;
  protected abstract readonly shortField: string;
  protected abstract readonly longField: string;

  protected async executeInternal(
    input: z.infer<typeof saveTextSchema>,
    { userId }: ToolContext,
  ) {
    const scan = await this.repo.findScan(userId, input.scanId);
    if (!scan) throw new Error(`Scan ${input.scanId} not found for this user.`);

    const field = input.length === "short" ? this.shortField : this.longField;
    await this.repo.updateScan(input.scanId, { [field]: input.content });
    return { scanId: input.scanId, saved: field };
  }
}

export class CreateSummaryTool extends SaveScanTextTool {
  readonly name = "create_summary";
  readonly description =
    "Save the short or long summary on a scan. Call once with length short and once with length long.";
  protected readonly shortField = "aiShortSummary";
  protected readonly longField = "aiSummary";
}

export class CreateObservationTool extends SaveScanTextTool {
  readonly name = "create_observation";
  readonly description =
    "Save the short or long observation on a scan. Call once with length short and once with length long.";
  protected readonly shortField = "aiShortObservation";
  protected readonly longField = "aiObservation";
}

const createRoutineSchema = z.object({
  title: z.string().min(1),
  steps: z.array(stepSchema).min(1).max(12),
});

export class CreateRoutineTool extends SkincareTool<
  z.infer<typeof createRoutineSchema>
> {
  readonly name = "create_routine";
  readonly description =
    "Create a routine and mark it accepted. Only call when the user asked for it or agreed to it; otherwise use recommend_routine.";
  readonly schema = createRoutineSchema;

  protected async executeInternal(
    input: z.infer<typeof createRoutineSchema>,
    { userId }: ToolContext,
  ) {
    const routine = await this.repo.createRoutine({ userId, ...input });

    // A routine counts as accepted only through its ROUTINE recommendation.
    const recommendation = await this.repo.createRecommendation({
      userId,
      type: "ROUTINE",
      explanation: `Created at the user's request: ${input.title}`,
      routineId: routine.id,
      accepted: true,
    });
    return { routine, recommendation };
  }
}

const recommendRoutineSchema = z.object({
  scanId: z.string().optional(),
  title: z.string().min(1),
  explanation: z.string().min(1),
  steps: z.array(stepSchema).min(1).max(12),
});

export class RecommendRoutineTool extends SkincareTool<
  z.infer<typeof recommendRoutineSchema>
> {
  readonly name = "recommend_routine";
  readonly description =
    "Suggest a routine without accepting it. The user can accept it later.";
  readonly schema = recommendRoutineSchema;

  protected async executeInternal(
    input: z.infer<typeof recommendRoutineSchema>,
    { userId }: ToolContext,
  ) {
    const routine = await this.repo.createRoutine({
      userId,
      title: input.title,
      steps: input.steps,
    });

    const recommendation = await this.repo.createRecommendation({
      userId,
      scanId: input.scanId,
      type: "ROUTINE",
      explanation: input.explanation,
      routineId: routine.id,
    });
    return { recommendation, routine };
  }
}

const recommendRoutineStepSchema = z.object({
  routineId: z.string(),
  period,
  title: z.string().min(1),
  instruction: z.string().min(1),
  explanation: z.string().min(1),
});

export class RecommendRoutineStepTool extends SkincareTool<
  z.infer<typeof recommendRoutineStepSchema>
> {
  readonly name = "recommend_routine_step";
  readonly description =
    "Suggest a routine step that helps the skin (sleep, hydration, sun behavior, pillowcase hygiene, etc.).";
  readonly schema = recommendRoutineStepSchema;

  protected async executeInternal(
    input: z.infer<typeof recommendRoutineStepSchema>,
    { userId }: ToolContext,
  ) {
    await this.requireRoutine(userId, input.routineId);

    const routineStep = await this.repo.createRoutineStep({
      routineId: input.routineId,
      period: input.period,
      title: input.title,
      instruction: input.instruction,
    });

    const recommendation = await this.repo.createRecommendation({
      userId,
      type: "ROUTINE_STEP",
      explanation: input.explanation,
      routineId: routineStep.routineId,
      routineStepId: routineStep.id, // links the suggestion to its step
    });
    return { recommendation, routineStep };
  }
}

const recommendProductSchema = z.object({
  scanId: z.string().optional(),
  routineId: z.string(),
  name: z.string().min(1),
  brand: z.string().min(1),
  category,
  imageUrl: z.url().optional(),
  description: z.string().min(1),
  explanation: z.string().min(1),
  keyIngredients: z.array(z.string()),
  price: z.number().nonnegative().optional(),
  affiliateUrl: z.url().optional(),
});

export class RecommendProductTool extends SkincareTool<
  z.infer<typeof recommendProductSchema>
> {
  readonly name = "recommend_product";
  readonly description =
    "Recommend one skincare product. Rejected if it contains an ingredient the user avoids.";
  readonly schema = recommendProductSchema;

  protected async executeInternal(
    input: z.infer<typeof recommendProductSchema>,
    { userId }: ToolContext,
  ) {
    await this.requireRoutine(userId, input.routineId);

    const prefs = await this.repo.preferences(userId);
    const avoided = prefs.avoidedIngredients.map((i) => i.toLowerCase());
    const conflict = input.keyIngredients.find((ingredient) =>
      avoided.some(
        (a) =>
          ingredient.toLowerCase().includes(a) ||
          a.includes(ingredient.toLowerCase()),
      ),
    );
    if (conflict) {
      throw new Error(
        `"${conflict}" is an ingredient the user avoids. Choose a different product.`,
      );
    }

    const product = await this.repo.findOrCreateProduct({
      userId,
      name: input.name,
      brand: input.brand,
      image: input.imageUrl,
      category: input.category,
      description: input.description,
      price: input.price,
      affiliateUrl: input.affiliateUrl,
    });

    const recommendation = await this.repo.createRecommendation({
      userId,
      scanId: input.scanId,
      type: "PRODUCT",
      explanation: input.explanation,
      productId: product.id,
      routineId: input.routineId,
    });
    return { recommendation, product };
  }
}

// const tasteSchema = z.object({
//   extraInterests: z.array(z.string().min(1)).max(5).optional(),
// });

// export class GetTasteInsightsTool extends SkincareTool<
//   z.infer<typeof tasteSchema>
// > {
//   readonly name = "get_taste_insights";
//   readonly description =
//     "Fetch brands and taste tags this user is likely to love, based on their favorite brands. Read-only; saves nothing. Use to tailor recommendations to the user's taste.";
//   readonly schema = tasteSchema;

//   protected async executeInternal(
//     input: z.infer<typeof tasteSchema>,
//     { userId }: ToolContext,
//   ) {
//     const prefs = await this.repo.preferences(userId);

//     const seen = new Set<string>();
//     const seeds = [...prefs.favoriteBrands, ...(input.extraInterests ?? [])]
//       .map((s) => s.trim())
//       .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
//       .slice(0, 8);

//     if (!seeds.length) return { status: "no_taste_data", brands: [], tags: [] };

//     try {
//       const { brands, tags } = await fetchTasteInsights(seeds);
//       return { status: brands.length ? "ok" : "no_match", brands, tags };
//     } catch {
//       // A Qloo outage must never break the chat or a scan analysis
//       return { status: "unavailable", brands: [], tags: [] };
//     }
//   }
// }