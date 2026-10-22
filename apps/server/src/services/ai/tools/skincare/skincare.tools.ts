import { z } from "zod";
import { BaseTool } from "../base.tool";
import type { ToolContext } from "../tool";
import type { SkincareRepository } from "./skincare.repository";

const length = z.enum(["short", "long"]);
const period = z.enum(["MORNING", "AFTERNOON", "EVENING", "NIGHT", "HABIT"]);
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
}

/* ============================ READ ============================ */

const scanHistorySchema = z.object({ limit: limitOf(20) });

export class GetScanHistoryTool extends SkincareTool<
  z.infer<typeof scanHistorySchema>
> {
  readonly name = "get_scan_history";
  readonly description =
    "Fetch the user's completed skin scans with score, skin age and detailed metrics, newest first.";
  readonly schema = scanHistorySchema;

  protected async executeInternal(
    input: z.infer<typeof scanHistorySchema>,
    { userId }: ToolContext,
  ) {
    const scans = await this.repo.scans(userId, {
      limit: input.limit ?? 5,
      withAnalysis: true,
    });
    return scans.map((s) => ({
      scanId: s.id,
      createdAt: s.createdAt,
      score: s.score,
      skinAge: s.skinAge,
      analysis: s.analysis ?? null,
    }));
  }
}

const previousSchema = z.object({
  length: length.optional(),
  limit: limitOf(20),
});

export class GetPreviousSummariesTool extends SkincareTool<
  z.infer<typeof previousSchema>
> {
  readonly name = "get_previous_summaries";
  readonly description =
    "Fetch summaries saved on the user's previous scans, newest first.";
  readonly schema = previousSchema;

  protected async executeInternal(
    input: z.infer<typeof previousSchema>,
    { userId }: ToolContext,
  ) {
    const scans = await this.repo.scans(userId, { limit: input.limit ?? 5 });
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
    "Fetch observations saved on the user's previous scans, newest first.";
  readonly schema = previousSchema;

  protected async executeInternal(
    input: z.infer<typeof previousSchema>,
    { userId }: ToolContext,
  ) {
    const scans = await this.repo.scans(userId, { limit: input.limit ?? 5 });
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

const getRecommendationsSchema = z.object({
  type: z.enum(["PRODUCT", "ROUTINE", "HABIT"]).optional(),
  accepted: z.boolean().optional(),
  limit: limitOf(30),
});

export class GetRecommendationsTool extends SkincareTool<
  z.infer<typeof getRecommendationsSchema>
> {
  readonly name = "get_recommendations";
  readonly description =
    "Fetch recommendations already made to the user (products, routines, habits) with their product or routine details.";
  readonly schema = getRecommendationsSchema;

  protected async executeInternal(
    input: z.infer<typeof getRecommendationsSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.recommendations(userId, {
      type: input.type,
      accepted: input.accepted,
      limit: input.limit ?? 10,
    });
  }
}

const getRoutinesSchema = z.object({ acceptedOnly: z.boolean().optional() });

export class GetRoutinesTool extends SkincareTool<
  z.infer<typeof getRoutinesSchema>
> {
  readonly name = "get_routines";
  readonly description =
    "Fetch the user's routines with their steps. Accepted routines only by default; pass acceptedOnly false to include suggestions not yet accepted.";
  readonly schema = getRoutinesSchema;

  protected async executeInternal(
    input: z.infer<typeof getRoutinesSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.routines(userId, {
      acceptedOnly: input.acceptedOnly ?? true,
    });
  }
}

const getRoutineLogsSchema = z.object({
  routineId: z.string().optional(),
  days: z.number().int().min(1).max(90).optional(),
  limit: limitOf(200),
});

export class GetRoutineLogsTool extends SkincareTool<
  z.infer<typeof getRoutineLogsSchema>
> {
  readonly name = "get_routine_logs";
  readonly description =
    "Fetch routine completion logs for the last N days, with the number of days the user completed a routine out of the window.";
  readonly schema = getRoutineLogsSchema;

  protected async executeInternal(
    input: z.infer<typeof getRoutineLogsSchema>,
    { userId }: ToolContext,
  ) {
    const days = input.days ?? 14;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = await this.repo.routineLogs(userId, {
      routineId: input.routineId,
      since,
      limit: input.limit ?? 100,
    });

    const activeDays = new Set(
      logs.map((l) => new Date(l.createdAt).toISOString().slice(0, 10)),
    ).size;

    return {
      windowDays: days,
      completions: logs.length,
      daysWithCompletion: activeDays,
      adherence: Number((activeDays / days).toFixed(2)),
      logs,
    };
  }
}

const getConversationSchema = z.object({ limit: limitOf(100) });

export class GetConversationTool extends SkincareTool<
  z.infer<typeof getConversationSchema>
> {
  readonly name = "get_conversation";
  readonly description =
    "Fetch the user's most recent chat messages (sender USER or ALINA), oldest first.";
  readonly schema = getConversationSchema;

  protected async executeInternal(
    input: z.infer<typeof getConversationSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.messages(userId, input.limit ?? 20);
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
    return this.repo.preferences(userId);
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
    return this.repo.createRoutine({ userId, accepted: true, ...input });
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
      accepted: false,
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

const recommendHabitSchema = z.object({
  scanId: z.string().optional(),
  title: z.string().min(1),
  instruction: z.string().min(1),
  explanation: z.string().min(1),
});

export class RecommendHabitTool extends SkincareTool<
  z.infer<typeof recommendHabitSchema>
> {
  readonly name = "recommend_habit";
  readonly description =
    "Suggest a lifestyle habit (sleep, water, sun protection behavior, pillowcase changes, etc.).";
  readonly schema = recommendHabitSchema;

  protected async executeInternal(
    input: z.infer<typeof recommendHabitSchema>,
    { userId }: ToolContext,
  ) {
    const routine = await this.repo.createRoutine({
      userId,
      accepted: false,
      title: input.title,
      steps: [
        {
          period: "HABIT",
          title: input.title,
          instruction: input.instruction,
        },
      ],
    });
    const recommendation = await this.repo.createRecommendation({
      userId,
      scanId: input.scanId,
      type: "HABIT",
      explanation: input.explanation,
      routineId: routine.id,
    });
    return { recommendation, routine };
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
