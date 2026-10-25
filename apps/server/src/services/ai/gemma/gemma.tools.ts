/**
 * Tool declarations sent to Gemma.
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

const limitParam = (max: number, fallback: number) => ({
  type: "integer",
  description: `Max results, 1-${max}. Default ${fallback}.`,
});

const routineSteps = {
  type: "array",
  description: "Steps in the order they should be done, 1 to 12.",
  items: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["MORNING", "AFTERNOON", "EVENING", "NIGHT", "HABIT"],
        description: "When this step is done.",
      },
      title: { type: "string", description: "Short step name." },
      instruction: {
        type: "string",
        description: "What to do, including amount or duration.",
      },
    },
    required: ["period", "title", "instruction"],
  },
};

/* ---------------------------- READ ---------------------------- */

const getScanHistory = fn(
  "get_scan_history",
  "Fetch the user's completed skin scans with score, skin age and detailed metrics (redness, moisture, oiliness, acne, pores, wrinkles, etc.), newest first. For all scores, higher is better. Use to describe or compare skin over time.",
  { limit: limitParam(20, 5) },
);

const getPreviousSummaries = fn(
  "get_previous_summaries",
  "Fetch summaries saved on the user's previous scans, newest first. Use to stay consistent with earlier analyses.",
  { length: lengthParam, limit: limitParam(20, 5) },
);

const getPreviousObservations = fn(
  "get_previous_observations",
  "Fetch observations saved on the user's previous scans, newest first. Use to compare the current scan with past findings.",
  { length: lengthParam, limit: limitParam(20, 5) },
);

const getRecommendations = fn(
  "get_recommendations",
  "Fetch products, routines and habits already recommended to the user, with their details and whether they were accepted. Use so you never repeat or contradict them.",
  {
    type: {
      type: "string",
      enum: ["PRODUCT", "ROUTINE", "HABIT", "ROUTINE_STEP"],
    },
    accepted: {
      type: "boolean",
      description: "Filter by whether the user accepted it.",
    },
    limit: limitParam(30, 10),
  },
);

const getRoutines = fn(
  "get_routines",
  "Fetch the user's routines with their steps. Accepted routines only by default.",
  {
    acceptedOnly: {
      type: "boolean",
      description:
        "Set false to include suggested routines the user has not accepted. Default true.",
    },
  },
);

const getRoutineLogs = fn(
  "get_routine_logs",
  "Fetch routine completion logs for the last N days, with how many days the user completed a routine (adherence). Use before adjusting a routine or judging progress.",
  {
    routineId: { type: "string", description: "Limit to one routine." },
    days: { type: "integer", description: "Window in days, 1-90. Default 14." },
    limit: limitParam(200, 100),
  },
);

const getConversation = fn(
  "get_conversation",
  "Fetch recent messages (sender USER or ALINA) from the user's conversation. Use when the user refers to something said earlier that is not in context.",
  { limit: limitParam(100, 20) },
);

const getPreferences = fn(
  "get_preferences",
  "Fetch the user's skin type, skin tone, favorite brands, favorite ingredients, avoided ingredients and budget. Always call before recommending products or routines.",
);

/* ---------------------------- WRITE ---------------------------- */

const createSummary = fn(
  "create_summary",
  "Save the short or long summary on a scan. Call once with length short and once with length long.",
  {
    scanId: { type: "string", description: "The scan being analysed." },
    length: lengthParam,
    content: {
      type: "string",
      description:
        "short: 1-2 sentence headline. long: detailed plain-language overview.",
    },
  },
  ["scanId", "length", "content"],
);

const createObservation = fn(
  "create_observation",
  "Save the short or long observation on a scan: factual findings. Short is the single key finding. Long covers each area (hydration, texture, pigmentation, redness, pores, eyes). Call once with length short and once with length long.",
  {
    scanId: { type: "string", description: "The scan being analysed." },
    length: lengthParam,
    content: { type: "string", description: "The observation text." },
  },
  ["scanId", "length", "content"],
);

const createRoutine = fn(
  "create_routine",
  "Create a routine and mark it accepted. Only call when the user asked for it or agreed to it. Otherwise use recommend_routine.",
  {
    title: { type: "string" },
    steps: routineSteps,
  },
  ["title", "steps"],
);

const recommendRoutine = fn(
  "recommend_routine",
  "Suggest a routine without accepting it. The user can accept it later. Returns the routine id, which can be used as routineId for recommend_product.",
  {
    scanId: { type: "string", description: "Scan this is based on, if any." },
    title: { type: "string" },
    explanation: {
      type: "string",
      description: "Why this routine fits this user's skin.",
    },
    steps: routineSteps,
  },
  ["title", "explanation", "steps"],
);

const recommendRoutineStep = fn(
  "recommend_routine_step",
  "Suggest a routine step that helps the skin (sleep, hydration, sun behavior, pillowcase hygiene, etc.).",
  {
    routineId: { type: "string", description: "Limit to one routine." },
    period: {
      type: "string",
      enum: ["MORNING", "AFTERNOON", "EVENING", "NIGHT", "HABIT"],
      description: "When this step is done.",
    },
    title: { type: "string", description: "Short step name." },
    instruction: {
      type: "string",
      description: "What to do, including amount or duration.",
    },
    explanation: { type: "string", description: "Why it helps this user." },
  },
  ["routineId", "period", "title", "instruction", "explanation"],
);

const recommendProduct = fn(
  "recommend_product",
  "Recommend one skincare product. Call get_preferences first; the recommendation fails if it contains an ingredient the user avoids. A routineId is required: use one from get_routines, or create one with recommend_routine first and use its id.",
  {
    scanId: { type: "string", description: "Scan this is based on, if any." },
    routineId: {
      type: "string",
      description: "The routine this product belongs to.",
    },
    name: { type: "string" },
    brand: { type: "string" },
    category: {
      type: "string",
      enum: [
        "CLEANSER",
        "TONER",
        "SERUM",
        "MOISTURIZER",
        "SUNSCREEN",
        "TREATMENT",
        "OTHER",
      ],
    },
    description: { type: "string", description: "What the product is." },
    explanation: {
      type: "string",
      description: "Why it fits this scan and these preferences.",
    },
    keyIngredients: {
      type: "array",
      items: { type: "string" },
      description:
        "Main active ingredients. Used to check against avoided ingredients. Use an empty array only if unknown.",
    },
    price: {
      type: "number",
      description: "Approximate price in dollar amount, if known.",
    },
    imageUrl: { type: "string", description: "Product image, if known." },
    affiliateUrl: { type: "string", description: "Purchase link, if known." },
  },
  [
    "routineId",
    "name",
    "brand",
    "category",
    "description",
    "explanation",
    "keyIngredients",
  ],
);

/* ---------------------------- TOOL SETS ---------------------------- */

const readTools = [
  getScanHistory,
  getRecommendations,
  getRoutines,
  getRoutineLogs,
  getConversation,
  getPreferences,
];

const baseTools = [{ type: "google_search" as const }];

// Scan analysis: read everything, save findings, make suggestions.
export const analyserTools = [
  ...baseTools,
  ...readTools,
  createSummary,
  createObservation,
  recommendRoutine,
  recommendRoutineStep,
  recommendProduct,
];

// Chat: read everything, act on what the user asks for.
export const streamTools = [
  ...baseTools,
  ...readTools,
  recommendRoutine,
  recommendRoutineStep,
  recommendProduct,
  createRoutine,
];