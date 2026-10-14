/**
 * Tool declarations + system instructions sent to Gemma.
 * Tool names MUST match the names registered in ToolRegistry
 * (see skincare.tools.ts).
 */

type JsonSchema = Record<string, unknown>;

const fn = (
  name: string,
  description: string,
  properties: Record<string, JsonSchema> = {},
  required: string[] = [],
) => ({
  type: "function" as const,
  name,
  description,
  parameters: { type: "object" as const, properties, required },
});

const lengthParam = {
  type: "string",
  enum: ["short", "long"],
  description: "short = brief headline. long = detailed breakdown.",
};

const routineSlot = {
  type: "string",
  enum: ["morning", "evening", "weekly", "habit"],
  description: "When the routine is performed.",
};

const routineSteps = {
  type: "array",
  description: "Ordered routine steps, 1 to 12.",
  items: {
    type: "object",
    properties: {
      order: { type: "integer", description: "1-based position." },
      instruction: {
        type: "string",
        description: "What to do, including how long or how much.",
      },
      productName: { type: "string", description: "Optional product." },
      productCategory: {
        type: "string",
        description: "cleanser, toner, serum, moisturizer, sunscreen, treatment, and other.",
      },
    },
    required: ["order", "instruction"],
  },
};

/* ---------------------------- READ ---------------------------- */

const getPreviousSummaries = fn(
  "get_previous_summaries",
  "Fetch the user's previous skin summaries, newest first. Use to stay consistent with earlier analyses and to describe change over time.",
  {
    length: lengthParam,
    limit: { type: "integer", description: "Max results, 1-20. Default 5." },
  },
);

const getPreviousObservations = fn(
  "get_previous_observations",
  "Fetch the user's previous skin observations, newest first. Use to compare the current scan with past findings.",
  {
    length: lengthParam,
    limit: { type: "integer", description: "Max results, 1-20. Default 5." },
  },
);

const getRecommendations = fn(
  "get_recommendations",
  "Fetch routines and products already recommended to the user, so you never repeat or contradict them.",
  {
    type: { type: "string", enum: ["routine", "product"] },
    limit: { type: "integer", description: "Max results, 1-30. Default 10." },
  },
);

const getRoutines = fn(
  "get_routines",
  "Fetch the user's skincare routines with their steps. Active routines only by default.",
  {
    activeOnly: {
      type: "boolean",
      description: "Set false to include inactive routines. Default true.",
    },
  },
);

const getRoutineLogs = fn(
  "get_routine_logs",
  "Fetch routine completion logs and an adherence ratio for the last N days. Use before adjusting a routine or judging progress.",
  {
    routineId: { type: "string", description: "Limit to one routine." },
    days: { type: "integer", description: "Window in days, 1-90. Default 14." },
    limit: { type: "integer", description: "Max logs, 1-200. Default 60." },
  },
);

const getConversation = fn(
  "get_conversation",
  "Fetch recent messages from the user's conversation. Use when the user refers to something said earlier that is not in context.",
  {
    limit: { type: "integer", description: "Max messages, 1-100. Default 20." },
  },
);

const getPreferences = fn(
  "get_preferences",
  "Fetch the user's skincare preferences: skin type, concerns, allergies, ingredients to avoid, budget. Always call before recommending products or routines.",
);

/* ---------------------------- WRITE ---------------------------- */

const createSummary = fn(
  "create_summary",
  "Save a skin summary from the current scan. Call once with length short and once with length long.",
  {
    length: lengthParam,
    content: {
      type: "string",
      description:
        "short: 1-2 sentences. long: detailed, multi-paragraph, plain language.",
    },
    scanId: { type: "string", description: "Scan this summary belongs to." },
  },
  ["length", "content"],
);

const createObservation = fn(
  "create_observation",
  "Save a factual skin observation from the current scan. Short = one key finding. Long = detailed findings per area (hydration, texture, pigmentation, redness, pores).",
  {
    length: lengthParam,
    content: { type: "string", description: "The observation text." },
    concerns: {
      type: "array",
      items: { type: "string" },
      description: "Concern tags such as dryness, acne, redness.",
    },
    scanId: { type: "string" },
  },
  ["length", "content"],
);

const createRoutine = fn(
  "create_routine",
  "Create and activate a routine for the user. Only call when the user asked for it or agreed to it. Otherwise use recommend_routine.",
  {
    name: { type: "string" },
    slot: routineSlot,
    goal: { type: "string", description: "What the routine targets." },
    steps: routineSteps,
  },
  ["name", "slot", "steps"],
);

const recommendRoutine = fn(
  "recommend_routine",
  "Suggest a routine without activating it. The user can accept it later.",
  {
    title: { type: "string" },
    reason: { type: "string", description: "Why it fits this user's scan." },
    slot: routineSlot,
    steps: routineSteps,
  },
  ["title", "reason", "slot", "steps"],
);

const recommendProduct = fn(
  "recommend_product",
  "Recommend one skincare product. Call get_preferences first. Never recommend allergens or ingredients the user avoids; the call fails if you do.",
  {
    name: { type: "string" },
    brand: { type: "string" },
    category: { type: "string", description: "cleanser, serum, sunscreen, etc." },
    reason: {
      type: "string",
      description: "Why it fits this scan and these preferences.",
    },
    keyIngredients: { type: "array", items: { type: "string" } },
    usage: { type: "string", description: "When and how to use it." },
    priceRange: { type: "string" },
  },
  ["name", "category", "reason"],
);

const createConversation = fn(
  "create_conversation",
  "Start a new conversation thread, optionally seeded with a first message. Use only when the user starts a new topic or asks for a fresh chat.",
  {
    title: { type: "string", description: "Short title, max 120 chars." },
    firstMessage: {
      type: "object",
      properties: {
        role: { type: "string", enum: ["user", "assistant"] },
        content: { type: "string" },
      },
      required: ["content"],
    },
  },
  ["title"],
);

/* ---------------------------- TOOL SETS ---------------------------- */

const readTools = [
  getPreviousSummaries,
  getPreviousObservations,
  getRecommendations,
  getRoutines,
  getRoutineLogs,
  getConversation,
  getPreferences,
];

const baseTools = [{ type: "google_search" as const }];

// Scan analysis: read everything, write findings and suggestions.
export const analyserTools = [
  ...baseTools,
  ...readTools,
  createSummary,
  createObservation,
  recommendRoutine,
  recommendProduct,
];

// Chat: read everything, act on what the user asks for.
export const streamTools = [
  ...baseTools,
  ...readTools,
  recommendRoutine,
  recommendProduct,
  createRoutine,
  createConversation,
];
