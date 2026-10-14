import { z } from "zod";
import { BaseTool } from "../base.tool";
import type { ToolContext } from "../tool";
import type { SkincareRepository } from "./skincare.repository";

const length = z.enum(["short", "long"]);
const limit = (max: number, fallback: number) =>
  z.number().int().min(1).max(max).default(fallback);

abstract class SkincareTool<TInput, TResult = unknown> extends BaseTool<
  TInput,
  TResult
> {
  constructor(protected readonly repo: SkincareRepository) {
    super();
  }
}

/* ======================= READ TOOLS ======================= */

const getSummariesSchema = z.object({
  length: length.optional().describe("Filter by short or long summaries"),
  limit: limit(20, 5),
});

export class GetPreviousSummariesTool extends SkincareTool<
  z.infer<typeof getSummariesSchema>
> {
  readonly name = "get_previous_summaries";
  readonly description =
    "Fetch the user's previous skin summaries, newest first. Use before writing a new summary to stay consistent and track change over time.";
  readonly schema = getSummariesSchema;

  protected async executeInternal(
    input: z.infer<typeof getSummariesSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.summaries(userId, input);
  }
}

const getObservationsSchema = z.object({
  length: length.optional().describe("Filter by short or long observations"),
  limit: limit(20, 5),
});

export class GetPreviousObservationsTool extends SkincareTool<
  z.infer<typeof getObservationsSchema>
> {
  readonly name = "get_previous_observations";
  readonly description =
    "Fetch the user's previous skin observations, newest first. Use to compare the current scan against past findings.";
  readonly schema = getObservationsSchema;

  protected async executeInternal(
    input: z.infer<typeof getObservationsSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.observations(userId, input);
  }
}

const getRecommendationsSchema = z.object({
  type: z.enum(["routine", "product"]).optional(),
  limit: limit(30, 10),
});

export class GetRecommendationsTool extends SkincareTool<
  z.infer<typeof getRecommendationsSchema>
> {
  readonly name = "get_recommendations";
  readonly description =
    "Fetch recommendations already made to the user (routines and products) so you do not repeat or contradict them.";
  readonly schema = getRecommendationsSchema;

  protected async executeInternal(
    input: z.infer<typeof getRecommendationsSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.recommendations(userId, input);
  }
}

const getRoutinesSchema = z.object({
  activeOnly: z.boolean().default(true),
});

export class GetRoutinesTool extends SkincareTool<
  z.infer<typeof getRoutinesSchema>
> {
  readonly name = "get_routines";
  readonly description =
    "Fetch the user's skincare routines with their steps. Defaults to active routines only.";
  readonly schema = getRoutinesSchema;

  protected async executeInternal(
    input: z.infer<typeof getRoutinesSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.routines(userId, input);
  }
}

const getRoutineLogsSchema = z.object({
  routineId: z.string().optional(),
  days: z.number().int().min(1).max(90).default(14),
  limit: limit(200, 60),
});

export class GetRoutineLogsTool extends SkincareTool<
  z.infer<typeof getRoutineLogsSchema>
> {
  readonly name = "get_routine_logs";
  readonly description =
    "Fetch the user's routine completion logs for the last N days. Use to judge adherence before adjusting a routine.";
  readonly schema = getRoutineLogsSchema;

  protected async executeInternal(
    input: z.infer<typeof getRoutineLogsSchema>,
    { userId }: ToolContext,
  ) {
    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
    const logs = await this.repo.routineLogs(userId, {
      routineId: input.routineId,
      since,
      limit: input.limit,
    });
    const completed = logs.filter((l) => l.completed).length;
    return {
      windowDays: input.days,
      total: logs.length,
      completed,
      adherence: logs.length ? Number((completed / logs.length).toFixed(2)) : null,
      logs,
    };
  }
}

const getConversationSchema = z.object({
  conversationId: z.string().optional(),
  limit: limit(100, 20),
});

export class GetConversationTool extends SkincareTool<
  z.infer<typeof getConversationSchema>
> {
  readonly name = "get_conversation";
  readonly description =
    "Fetch recent messages from the user's conversation (latest one unless an id is given).";
  readonly schema = getConversationSchema;

  protected async executeInternal(
    input: z.infer<typeof getConversationSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.conversation(userId, input);
  }
}

const getPreferencesSchema = z.object({});

export class GetPreferencesTool extends SkincareTool<
  z.infer<typeof getPreferencesSchema>
> {
  readonly name = "get_preferences";
  readonly description =
    "Fetch the user's skincare preferences: skin type, concerns, allergies, ingredients to avoid, budget. Always check before recommending products.";
  readonly schema = getPreferencesSchema;

  protected async executeInternal(
    _input: z.infer<typeof getPreferencesSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.preferences(userId);
  }
}

/* ======================= WRITE TOOLS ======================= */

const createSummarySchema = z.object({
  length,
  content: z
    .string()
    .min(1)
    .describe(
      "short: 1-2 sentences headline. long: detailed multi-paragraph summary.",
    ),
  scanId: z.string().optional(),
});

export class CreateSummaryTool extends SkincareTool<
  z.infer<typeof createSummarySchema>
> {
  readonly name = "create_summary";
  readonly description =
    "Save a skin summary. Call once with length 'short' and once with 'long' for a complete scan analysis.";
  readonly schema = createSummarySchema;

  protected async executeInternal(
    input: z.infer<typeof createSummarySchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.createSummary({ userId, ...input });
  }
}

const createObservationSchema = z.object({
  length,
  content: z
    .string()
    .min(1)
    .describe(
      "short: one key finding. long: detailed findings per area (hydration, texture, pigmentation, etc.).",
    ),
  concerns: z
    .array(z.string())
    .default([])
    .describe("Concern tags, e.g. dryness, acne, redness"),
  scanId: z.string().optional(),
});

export class CreateObservationTool extends SkincareTool<
  z.infer<typeof createObservationSchema>
> {
  readonly name = "create_observation";
  readonly description =
    "Save a skin observation (a factual finding from the scan). Use 'short' for a key finding and 'long' for the detailed breakdown.";
  readonly schema = createObservationSchema;

  protected async executeInternal(
    input: z.infer<typeof createObservationSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.createObservation({ userId, ...input });
  }
}

const routineStepSchema = z.object({
  order: z.number().int().min(1),
  instruction: z.string().min(1),
  productName: z.string().optional(),
  productCategory: z
    .string()
    .optional()
    .describe("e.g. cleanser, serum, moisturizer, sunscreen"),
});

const createRoutineSchema = z.object({
  name: z.string().min(1),
  slot: z.enum(["morning", "evening", "weekly"]),
  goal: z.string().optional(),
  steps: z.array(routineStepSchema).min(1).max(12),
});

export class CreateRoutineTool extends SkincareTool<
  z.infer<typeof createRoutineSchema>
> {
  readonly name = "create_routine";
  readonly description =
    "Create an active routine for the user. Only call when the user wants it set up; otherwise use recommend_routine.";
  readonly schema = createRoutineSchema;

  protected async executeInternal(
    input: z.infer<typeof createRoutineSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.createRoutine({
      userId,
      ...input,
      steps: [...input.steps].sort((a, b) => a.order - b.order),
    });
  }
}

const recommendRoutineSchema = z.object({
  title: z.string().min(1),
  reason: z.string().min(1).describe("Why this routine fits the scan"),
  slot: z.enum(["morning", "evening", "weekly"]),
  steps: z.array(routineStepSchema).min(1).max(12),
});

export class RecommendRoutineTool extends SkincareTool<
  z.infer<typeof recommendRoutineSchema>
> {
  readonly name = "recommend_routine";
  readonly description =
    "Suggest a routine to the user without activating it. The user can accept it later.";
  readonly schema = recommendRoutineSchema;

  protected async executeInternal(
    input: z.infer<typeof recommendRoutineSchema>,
    { userId }: ToolContext,
  ) {
    const { title, reason, ...payload } = input;
    return this.repo.createRecommendation({
      userId,
      type: "routine",
      title,
      reason,
      payload,
    });
  }
}

const recommendProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  category: z.string().min(1).describe("e.g. cleanser, serum, sunscreen"),
  reason: z.string().min(1).describe("Why this fits the scan and preferences"),
  keyIngredients: z.array(z.string()).default([]),
  usage: z.string().optional().describe("When and how to use it"),
  priceRange: z.string().optional(),
});

export class RecommendProductTool extends SkincareTool<
  z.infer<typeof recommendProductSchema>
> {
  readonly name = "recommend_product";
  readonly description =
    "Recommend a skincare product. Check get_preferences first and never suggest allergens or ingredients the user avoids.";
  readonly schema = recommendProductSchema;

  protected async executeInternal(
    input: z.infer<typeof recommendProductSchema>,
    { userId }: ToolContext,
  ) {
    const { reason, ...payload } = input;

    const prefs = await this.repo.preferences(userId);
    const blocked = new Set(
      [...(prefs?.allergies ?? []), ...(prefs?.avoidIngredients ?? [])].map(
        (i) => i.toLowerCase(),
      ),
    );
    const conflict = input.keyIngredients.find((i) =>
      blocked.has(i.toLowerCase()),
    );
    if (conflict) {
      throw new Error(
        `Product contains "${conflict}", which the user avoids. Choose a different product.`,
      );
    }

    return this.repo.createRecommendation({
      userId,
      type: "product",
      title: input.name,
      reason,
      payload,
    });
  }
}

const createConversationSchema = z.object({
  title: z.string().min(1).max(120),
  firstMessage: z
    .object({
      role: z.enum(["user", "assistant"]).default("assistant"),
      content: z.string().min(1),
    })
    .optional(),
});

export class CreateConversationTool extends SkincareTool<
  z.infer<typeof createConversationSchema>
> {
  readonly name = "create_conversation";
  readonly description =
    "Start a new conversation thread for the user, optionally seeded with a first message.";
  readonly schema = createConversationSchema;

  protected async executeInternal(
    input: z.infer<typeof createConversationSchema>,
    { userId }: ToolContext,
  ) {
    return this.repo.createConversation(
      { userId, title: input.title },
      input.firstMessage,
    );
  }
}
