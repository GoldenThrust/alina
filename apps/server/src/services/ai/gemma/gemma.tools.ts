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

/* ---------------------------- DATE RANGE ---------------------------- */

const startDateParam = {
  type: "string",
  description:
    "Optional. Only include items on or after this date. Format YYYY-MM-DD (read as UTC), or an ISO 8601 datetime with Z or an offset. Never use words like 'last week'.",
};
const endDateParam = {
  type: "string",
  description:
    "Optional. Only include items on or before this date, inclusive. Same format as startDate.",
};
const dateRange = { startDate: startDateParam, endDate: endDateParam };

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
  "Fetch the user's completed skin scans with score, skin age and detailed metrics (redness, moisture, oiliness, acne, pores, wrinkles, etc.), newest first. For all scores, higher is better. Use to describe or compare skin over time. Use startDate/endDate to look at a specific period.",
  { ...dateRange, limit: limitParam(20, 5) },
);

const getPreviousSummaries = fn(
  "get_previous_summaries",
  "Fetch summaries saved on the user's previous scans, newest first. Use to stay consistent with earlier analyses. Use startDate/endDate to look at a specific period.",
  { ...dateRange, length: lengthParam, limit: limitParam(20, 5) },
);

const getPreviousObservations = fn(
  "get_previous_observations",
  "Fetch observations saved on the user's previous scans, newest first. Use to compare the current scan with past findings. Use startDate/endDate to look at a specific period.",
  { ...dateRange, length: lengthParam, limit: limitParam(20, 5) },
);

const getRecommendations = fn(
  "get_recommendations",
  "Fetch products, routines, habits and routine steps already recommended to the user, with their details and whether they were accepted. Use so you never repeat or contradict them. Use startDate/endDate to look at a specific period.",
  {
    ...dateRange,
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
  "Fetch the user's routines with their steps. Accepted routines only by default. startDate/endDate filter by when the routine was created.",
  {
    ...dateRange,
    acceptedOnly: {
      type: "boolean",
      description:
        "Set false to include suggested routines the user has not accepted. Default true.",
    },
  },
);

const getRoutineLogs = fn(
  "get_routine_logs",
  "Fetch routine completion logs, with how many days the user completed a routine (adherence). Use before adjusting a routine or judging progress. Give either days (a window ending now) or startDate/endDate (an explicit period). If startDate is given, days is ignored.",
  {
    routineId: { type: "string", description: "Limit to one routine." },
    days: {
      type: "integer",
      description: "Window in days, 1-90. Default 14. Ignored if startDate is given.",
    },
    ...dateRange,
    limit: limitParam(200, 100),
  },
);

const getConversation = fn(
  "get_conversation",
  "Fetch recent messages (sender USER or ALINA) from the user's conversation. Use when the user refers to something said earlier that is not in context. Use startDate/endDate to look at a specific period.",
  { ...dateRange, limit: limitParam(100, 20) },
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
    routineId: {
      type: "string",
      description:
        "The routine this step belongs to. Use an id from get_routines or recommend_routine.",
    },
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

const getTasteInsights = fn(
  "get_taste_insights",
  "Fetch brands and taste tags this user is likely to love, based on their favorite brands. Read-only, saves nothing. Call before recommending products, brands or routines, whether chatting or about to save a recommendation.",
  {
    extraInterests: {
      type: "array",
      items: { type: "string" },
      description:
        "Optional brands or styles the user just mentioned in this chat that are not saved yet (max 5).",
    },
  },
);

const entityTypeParam = {
  type: "string",
  enum: ["brand", "product", "place", "person", "podcast"],
  description:
    "What to recommend or compare. 'person' means influencers and public figures.",
};
const interestsParam = {
  type: "array",
  items: { type: "string" },
  description:
    "Optional extra brands, people, places or podcasts the user just mentioned or that earlier tool results suggest (max 5). Saved favorites are added automatically.",
};
const cityParam = {
  type: "string",
  description:
    "Optional. Overrides the user's saved city. Needed for places if none is saved.",
};

const qlooRecommend = fn(
  "qloo_recommend",
  "Read-only, saves nothing. Recommend brands, products, places, people/influencers or podcasts this user is likely to love, based on their saved favorite brands, age range, gender and city. Call before recommending or discussing any of these, in plain chat too.",
  {
    entityType: entityTypeParam,
    interests: interestsParam,
    city: cityParam,
    limit: limitParam(10, 8),
  },
  ["entityType"],
);

const qlooCompare = fn(
  "qloo_compare",
  "Read-only, saves nothing. Compare 2-4 brands, places, people/influencers or podcasts: shared and distinct traits, popularity trend, and closeness to this user's taste (userAffinity, higher is closer). For products pass brand names.",
  {
    entityType: entityTypeParam,
    items: {
      type: "array",
      items: { type: "string" },
      description: "2 to 4 names of the same kind.",
    },
    interests: interestsParam,
    city: cityParam,
  },
  ["entityType", "items"],
);

const qlooTrending = fn(
  "qloo_trending",
  "Read-only, saves nothing. Without items: what is trending now for this user's age range, gender and city. With items: whether those specific brands, places, people or podcasts are rising, steady or falling. For products pass brand names.",
  {
    entityType: entityTypeParam,
    items: {
      type: "array",
      items: { type: "string" },
      description:
        "Optional 1-4 names to check momentum for. Omit to list what is trending.",
    },
    city: cityParam,
    personalize: {
      type: "boolean",
      description: "true to weight the trending list by the user's taste.",
    },
    limit: limitParam(10, 8),
  },
  ["entityType"],
);

/* ---------------------------- TOOL SETS ---------------------------- */

// get_taste_insights is declared above but its tool class is commented out in
// skincare.tools.ts, so it stays out of the sets until that is enabled.
void getTasteInsights;

const readTools = [
  getScanHistory,
  getPreviousSummaries,
  getPreviousObservations,
  getRecommendations,
  getRoutines,
  getRoutineLogs,
  getConversation,
  getPreferences,
  qlooRecommend,
  qlooCompare,
  qlooTrending,
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