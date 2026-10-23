import { randomBytes } from "node:crypto";
import { fakerEN_NG as faker } from "@faker-js/faker";
import { Temporal } from "@js-temporal/polyfill";
import { hash } from "argon2";
import {
  repositories as r,
  type Gender,
  type NewProduct,
  type Product,
  type ProductCategory,
  type StepInput,
  type User,
} from "../repositories";



/**
 * Development seed data at load-test scale. Real-looking skincare products,
 * faker-generated people and a long history per user.
 *
 * Deterministic for a given seed: every random value is generated
 * synchronously first, and only then written to the database concurrently,
 * so concurrency never changes which data is produced.
 *
 * All seed users share SEED_DOMAIN, which is how `reset` finds and removes
 * them without touching real accounts. Generated products are kept on reset
 * (they are matched by findOrCreate).
 */

export const SEED_DOMAIN = "alina.com";
export const DEMO_EMAIL = `liza@${SEED_DOMAIN}`;
export const DEV_PASSWORD = "Password123!";

/* ------------------------------ domain types ------------------------------ */

/** Fitzpatrick scale, I (very fair) to VI (deeply pigmented). */
export type FitzpatrickType = "I" | "II" | "III" | "IV" | "V" | "VI";

/** Output of YouCam `hd_skin_type`. Not the Fitzpatrick scale. */
export const SKIN_TYPE_LABELS = ["oily", "dry", "combination", "normal", "sensitive"] as const;
export type SkinTypeLabel = (typeof SKIN_TYPE_LABELS)[number];

/*
 * The Json column payloads below are `type` aliases, not interfaces:
 * interfaces are not assignable to Prisma's `InputJsonValue` index signature.
 */
export type PoreScores = {
  forehead: number;
  nose: number;
  cheek: number;
  whole: number;
};

export type WrinkleScores = {
  forehead: number;
  glabellar: number;
  crowfeet: number;
  periocular: number;
  nasolabial: number;
  marionette: number;
  whole: number;
};

export type TextureData = { score: number };
export type SkinTypeData = { type: SkinTypeLabel; confidence: number };

/* ------------------------------ seed types ------------------------------ */

export interface SeedOptions {
  /** Random users to create besides the demo user. Default 5. */
  users?: number;
  /** Faker seed. Same seed, same data. Default 2026. */
  seed?: number;
  /** Delete existing seed users and recreate them. */
  reset?: boolean;
  /** Products in the shared catalogue. Default 2000. */
  // products?: number;
  /** Scans (each with a full analysis) per user. Default 1500. */
  scansPerUser?: number;
  /** Routines per user (morning, evening, treatment, habit mix). Default 1500. */
  routinesPerUser?: number;
  /** Routine completion logs per user. Default 6000. */
  logsPerUser?: number;
  /** Recommendations per user. Default 2000. */
  recommendationsPerUser?: number;
  /** Chat message pairs (user + Alina) per user. Default 2000. */
  messagePairsPerUser?: number;
  /** Orders per user. Default 150. */
  ordersPerUser?: number;
  /** Products per user. Default 100. */
  productsPerUser?: number;
  /** How many days of history the data spans. Default 730. */
  spanDays?: number;
  /** Concurrent database writes. Keep at or below your DB pool size. Default 16. */
  concurrency?: number;
}

type ResolvedOptions = Required<SeedOptions>;

const DEFAULTS: ResolvedOptions = {
  users: 1,
  seed: 2026,
  reset: false,
  // products: 2000,
  scansPerUser: 30000,
  routinesPerUser: 1500,
  logsPerUser: 6000,
  recommendationsPerUser: 2000,
  messagePairsPerUser: 2000,
  ordersPerUser: 150,
  spanDays: 1000,
  concurrency: 16,
  productsPerUser: 100,
};

/** `??` instead of spread, so an explicit `undefined` falls back to the default. */
function resolveOptions(options: SeedOptions): ResolvedOptions {
  return {
    users: options.users ?? DEFAULTS.users,
    seed: options.seed ?? DEFAULTS.seed,
    reset: options.reset ?? DEFAULTS.reset,
    // products: options.products ?? DEFAULTS.products,
    scansPerUser: options.scansPerUser ?? DEFAULTS.scansPerUser,
    routinesPerUser: options.routinesPerUser ?? DEFAULTS.routinesPerUser,
    logsPerUser: options.logsPerUser ?? DEFAULTS.logsPerUser,
    recommendationsPerUser: options.recommendationsPerUser ?? DEFAULTS.recommendationsPerUser,
    messagePairsPerUser: options.messagePairsPerUser ?? DEFAULTS.messagePairsPerUser,
    ordersPerUser: options.ordersPerUser ?? DEFAULTS.ordersPerUser,
    spanDays: options.spanDays ?? DEFAULTS.spanDays,
    productsPerUser: options.productsPerUser ?? DEFAULTS.productsPerUser,
    concurrency: Math.max(1, options.concurrency ?? DEFAULTS.concurrency),
  };
}

interface SeedPlanEntry {
  readonly email: string;
  readonly fullName?: string;
  readonly password: boolean;
  readonly gender?: Gender;
}

/** Derived from the repositories so they can never drift from the schema. */
type ScanInput = Parameters<typeof r.scans.create>[0];
type Scan = Awaited<ReturnType<typeof r.scans.create>>;
type AnalysisInput = Parameters<typeof r.analyses.upsertForScan>[1];
type RoutineInput = Parameters<typeof r.routines.createWithSteps>[0];
type Routine = Awaited<ReturnType<typeof r.routines.createWithSteps>>;
type RecommendationInput = Parameters<typeof r.recommendations.create>[0];
type OrderInput = Parameters<typeof r.orders.createWithItems>[0];
type SubscriptionInput = Parameters<typeof r.subscriptions.create>[0];
type SubscriptionPlan = SubscriptionInput["plan"];
type SubscriptionStatus = SubscriptionInput["status"];
type DeviceInput = Parameters<typeof r.devices.connect>[0];
type DeviceType = DeviceInput["type"];

type ProductNamer = (category: ProductCategory) => string;
type StepFactory = (name: ProductNamer) => StepInput;

type RoutineKind = "morning" | "evening" | "treatment" | "habit";

interface RoutineSpec {
  readonly kind: RoutineKind;
  readonly accepted: boolean;
  readonly input: RoutineInput;
}

interface SeededRoutine {
  readonly kind: RoutineKind;
  readonly accepted: boolean;
  readonly routine: Routine;
}

interface ScanSpec {
  readonly scan: ScanInput;
  readonly analysis: AnalysisInput;
}


interface GeneratedProduct {
  readonly input: Omit<NewProduct, "userId">;
  readonly ingredients: readonly string[];
}

/* ------------------------------ constants ------------------------------ */

/** Representative skin tone colours (hex) for each Fitzpatrick type, I to VI. */
const SKIN_TONES_BY_TYPE = {
  I: ["#F6E7DC", "#F3DCCB"],
  II: ["#EBCDB5", "#E8C4A8"],
  III: ["#D9A878", "#D2A06E"],
  IV: ["#B98355", "#A8744A"],
  V: ["#8A5A3B", "#7A4E32"],
  VI: ["#4A2E22", "#3B2419"],
} as const satisfies Record<FitzpatrickType, readonly string[]>;

const AVOID_POOL = ["fragrance", "alcohol denat.", "essential oils", "parabens", "sulfates"] as const;
const LIKE_POOL = ["niacinamide", "hyaluronic acid", "ceramides", "vitamin c", "salicylic acid", "squalane"] as const;
const PHONE_MODELS = ["iPhone", "Pixel", "Galaxy", "Tecno Camon"] as const;
const OTHER_DEVICE_NAMES = ["Chrome on laptop", "Oura Ring", "Safari on iPad"] as const;
const BUDGETS = [20, 30, 50, 80, 120] as const;
const RECOMMENDED_CATEGORIES = [
  "SERUM",
  "SUNSCREEN",
  "MOISTURIZER",
  "TREATMENT",
  "CLEANSER",
  "TONER",
] as const satisfies readonly ProductCategory[];

const BRANDS = [
  "CeraVe", "La Roche-Posay", "Klairs", "The Ordinary", "Paula's Choice", "Differin",
  "Neutrogena", "EltaMD", "Cetaphil", "Bioderma", "Vichy", "Avène", "Eucerin",
  "Simple", "Nivea", "Garnier", "Inkey List", "Naturium", "Beauty of Joseon", "COSRX",
] as const;

const DESCRIPTORS = [
  "Hydrating", "Gentle", "Barrier Repair", "Brightening", "Clarifying", "Soothing",
  "Daily", "Intensive", "Lightweight", "Rich", "Balancing", "Purifying", "Radiance",
  "Sensitive", "Oil-Free", "Overnight", "Repairing", "Calming", "Renewing", "Advanced",
] as const;

const BASE_NAMES: Record<ProductCategory, readonly string[]> = {
  CLEANSER: ["Facial Cleanser", "Foaming Cleanser", "Cream Cleanser", "Gel Cleanser", "Cleansing Balm"],
  TONER: ["Toner", "Essence Toner", "Balancing Mist", "Toning Lotion"],
  SERUM: ["Serum", "Ampoule", "Concentrate", "Booster Serum", "Drops"],
  MOISTURIZER: ["Moisturizer", "Cream", "Water Gel", "Lotion", "Night Cream"],
  SUNSCREEN: ["Sunscreen SPF 30", "Sunscreen SPF 50", "Fluid SPF 50+", "Mineral SPF 40", "Daily UV Shield"],
  TREATMENT: ["Exfoliant", "Spot Treatment", "Retinoid Gel", "Peel Treatment", "Clarifying Treatment"],
  OTHER: ["Lip Balm", "Eye Cream", "Face Mask"],
};

const CATEGORY_WEIGHTS: readonly { weight: number; value: ProductCategory }[] = [
  { weight: 4, value: "CLEANSER" },
  { weight: 2, value: "TONER" },
  { weight: 5, value: "SERUM" },
  { weight: 5, value: "MOISTURIZER" },
  { weight: 4, value: "SUNSCREEN" },
  { weight: 3, value: "TREATMENT" },
  { weight: 1, value: "OTHER" },
];

const PRICE_RANGE: Record<ProductCategory, readonly [min: number, max: number]> = {
  CLEANSER: [8, 30],
  TONER: [10, 35],
  SERUM: [6, 70],
  MOISTURIZER: [10, 60],
  SUNSCREEN: [12, 45],
  TREATMENT: [10, 50],
  OTHER: [5, 40],
};

const CHAT_PAIRS: readonly (readonly [question: string, answer: string])[] = [
  ["How is my skin doing compared to last time?", "Your score is trending up and moisture has improved. Keep going with your current routine."],
  ["Should I add an exfoliant?", "A 2% BHA once or twice a week would suit you. I have added it as a suggestion you can accept."],
  ["Is it okay to use vitamin C in the morning?", "Yes, vitamin C works well in the morning under sunscreen. Start every other day to check tolerance."],
  ["My cheeks feel tight after cleansing.", "That usually means the cleanser is too stripping. Try a creamy, fragrance-free one and moisturise right after."],
  ["Do I really need sunscreen indoors?", "Daily SPF still matters, especially near windows. A light fluid sunscreen is easy to wear every day."],
  ["What helps with dark spots?", "Niacinamide, vitamin C and consistent SPF help fade them over time. Results take 8 to 12 weeks."],
  ["Can I use retinol and niacinamide together?", "Yes, they pair well. Introduce the retinol slowly, two nights a week, and keep moisturiser on top."],
  ["Why am I breaking out around my chin?", "Hormones, friction and heavy products are common causes. Keep the routine simple and avoid picking."],
  ["How long until I see results from my new serum?", "Most serums need 4 to 8 weeks of consistent use. Take a scan every two weeks to track the change."],
  ["Is my skin dehydrated or just dry?", "Dehydrated skin lacks water and can still be oily; dry skin lacks oil. Your moisture score points to dehydration."],
  ["What should I do after a long sun day?", "Cleanse gently, use a soothing moisturiser and skip actives for a couple of nights."],
  ["Does water intake really matter for skin?", "It helps overall, but topical hydration and sleep move your scores more. Keep a bottle nearby anyway."],
];

const ROUTINE_ADJECTIVES = [
  "Simple", "Glow", "Barrier", "Clear skin", "Hydration", "Calm", "Reset", "Weekend", "Travel", "Minimal",
] as const;

const MORNING_STEPS = {
  cleanse: (name) => ({ period: "MORNING", title: "Cleanse", instruction: `Massage ${name("CLEANSER")} for 30 seconds, then rinse with lukewarm water.` }),
  serum: (name) => ({ period: "MORNING", title: "Serum", instruction: `Apply a few drops of ${name("SERUM")} to damp skin.` }),
  moisturise: (name) => ({ period: "MORNING", title: "Moisturise", instruction: `Apply a pea-sized amount of ${name("MOISTURIZER")} to face and neck.` }),
  spf: (name) => ({ period: "MORNING", title: "Sunscreen", instruction: `Apply two finger-lengths of ${name("SUNSCREEN")} and reapply every 2-3 hours outdoors.` }),
} as const satisfies Record<string, StepFactory>;

const HABITS: readonly StepInput[] = [
  { period: "HABIT", title: "Hydration", instruction: "Drink about 8 glasses of water a day; keep a bottle within reach." },
  { period: "HABIT", title: "Pillowcase", instruction: "Change your pillowcase twice a week to reduce breakouts." },
  { period: "HABIT", title: "Sleep", instruction: "Aim for 7 to 8 hours of sleep; skin repairs itself overnight." },
  { period: "HABIT", title: "Phone hygiene", instruction: "Wipe your phone screen daily and avoid touching your face." },
  { period: "HABIT", title: "Diet", instruction: "Add more fruit, vegetables and omega-3 rich foods to your meals." },
  { period: "HABIT", title: "Hands off", instruction: "Avoid picking or touching blemishes; use a patch instead." },
];

const LOG_HOURS: Record<RoutineKind, readonly [start: number, end: number]> = {
  morning: [6, 8],
  evening: [20, 22],
  treatment: [21, 23],
  habit: [12, 18],
};

/* ------------------------------ helpers ------------------------------ */

/**
 * Timestamps are Temporal.Instant, calendar dates are Temporal.PlainDate.
 * Calendar-day math goes through a ZonedDateTime in the system timezone,
 * because Instant can't add or subtract days.
 */
const nowZoned = (): Temporal.ZonedDateTime => Temporal.Now.zonedDateTimeISO();

const daysAgo = (n: number, hour?: number): Temporal.Instant => {
  let moment = nowZoned().subtract({ days: n });
  if (hour !== undefined) {
    moment = moment.with({
      hour,
      minute: 0,
      second: 0,
      millisecond: 0,
      microsecond: 0,
      nanosecond: 0,
    });
  }
  return moment.toInstant();
};

const daysFromNow = (n: number): Temporal.Instant =>
  nowZoned().add({ days: n }).toInstant();

const minutesAgo = (n: number): Temporal.Instant =>
  Temporal.Now.instant().subtract({ minutes: n });

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

const metric = (min: number, max: number): number =>
  faker.number.float({ min, max, fractionDigits: 1 });

const jitter = (spread: number): number =>
  faker.number.int({ min: -spread, max: spread });

const average = (values: readonly number[]): number =>
  Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;

/** Random whole days within the span, skewed toward recent history. */
const recentDay = (spanDays: number): number =>
  Math.floor(faker.number.float({ min: 0, max: 1 }) ** 1.6 * spanDays);

/**
 * `count` timestamps (minutes ago) across the whole span, oldest first.
 * The oldest scan is pinned to the start of the span and the newest to the
 * last 12 hours, so the history always covers the full period.
 */
function scanOffsets(count: number, totalMinutes: number): number[] {
  const offsets = Array.from({ length: count }, () =>
    faker.number.int({ min: 0, max: totalMinutes }),
  ).sort((a, b) => b - a); // descending: oldest first

  if (count > 0) offsets[0] = totalMinutes;
  if (count > 1) offsets[count - 1] = Math.min(offsets[count - 1] ?? 0, 12 * 60);
  return offsets;
}

/**
 * Runs `fn` over `items` with at most `limit` in flight. Results keep input
 * order. All workers share one iterator, so each item is handed out once.
 */
async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const queue = items.entries();
  const worker = async (): Promise<void> => {
    for (const [index, item] of queue) {
      try {
        results[index] = await fn(item, index);
      } catch (err) {
        console.error(`[seed] Error processing item ${index}:`, err);
        // throw err;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Times a phase and logs how long it took. */
async function phase<T>(label: string, run: () => Promise<T>): Promise<T> {
  const started = performance.now();
  const result = await run();
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`[seed]   ${label} (${seconds}s)`);
  return result;
}



/** Random birth date for someone aged between minAge and maxAge today. */
function randomBirthDate(minAge: number, maxAge: number): Temporal.Instant {
  const age = faker.number.int({ min: minAge, max: maxAge });
  return Temporal.Now.plainDateISO()
    .subtract({ years: age })
    .subtract({ days: faker.number.int({ min: 0, max: 364 }) })
    .toZonedDateTime("UTC") // midnight UTC; the column is timestamptz, so it needs an Instant
    .toInstant();
}

/** This is an en-NG seed, so skew toward the darker end of the Fitzpatrick scale. */
function randomFitzpatrick(): FitzpatrickType {
  return faker.helpers.weightedArrayElement<FitzpatrickType>([
    { weight: 1, value: "II" },
    { weight: 2, value: "III" },
    { weight: 3, value: "IV" },
    { weight: 5, value: "V" },
    { weight: 5, value: "VI" },
  ]);
}

/* ------------------------------ catalogue ------------------------------ */

/** Builds `count` unique products. Pure and synchronous, so it stays deterministic. */
function generateProducts(count: number): GeneratedProduct[] {
  const seen = new Set<string>();
  const products: GeneratedProduct[] = [];
  let attempts = 0;

  while (products.length < count) {
    if (++attempts > count * 50) {
      throw new Error(`Cannot generate ${count} unique products; lower the count.`);
    }
    const category = faker.helpers.weightedArrayElement(CATEGORY_WEIGHTS);
    const brand = faker.helpers.arrayElement(BRANDS);
    const name = `${faker.helpers.arrayElement(DESCRIPTORS)} ${faker.helpers.arrayElement(BASE_NAMES[category])}`;
    const key = `${brand}|${name}`;
    if (seen.has(key)) continue;
    seen.add(key);

        const ingredients = faker.helpers.arrayElements([...AVOID_POOL, ...LIKE_POOL], { min: 1, max: 3 });
    const containsAvoided = ingredients.some((i) => (AVOID_POOL as readonly string[]).includes(i));
    const [min, max] = PRICE_RANGE[category];

    // image and affiliateUrl are nullable columns, so some products get neither.
    const slug = faker.helpers.slugify(`${brand}-${name}`).toLowerCase();
    const image = faker.datatype.boolean(0.75)
      ? `https://picsum.photos/seed/${slug}/600/600`
      : null;
    const affiliateUrl = faker.datatype.boolean(0.6)
      ? `https://shop.${SEED_DOMAIN}/p/${slug}?ref=alina`
      : null;

    products.push({
      ingredients,
      input: {
        name,
        brand,
        category,
        description: `${name} by ${brand}. Contains ${ingredients.join(", ")}.${containsAvoided ? "" : " Free from common irritants."}`,
        price: faker.number.int({ min, max }),
        image,
        affiliateUrl,
      },
    });
  }
  return products;
}

class Catalogue {
  readonly brands: readonly string[];
  private readonly byCategory = new Map<ProductCategory, Product[]>();
  private readonly ingredients = new Map<string, readonly string[]>();

  constructor(
    readonly all: readonly Product[],
    ingredientsInOrder: readonly (readonly string[])[],
  ) {
    this.brands = [...new Set(all.map((p) => p.brand))];
    all.forEach((product, i) => {
      this.ingredients.set(product.id, ingredientsInOrder[i] ?? []);
      const bucket = this.byCategory.get(product.category) ?? [];
      bucket.push(product);
      this.byCategory.set(product.category, bucket);
    });
  }

  ofCategory(category: ProductCategory): readonly Product[] {
    return this.byCategory.get(category) ?? [];
  }

  /** A random product in the category that has none of the avoided ingredients. */
  pick(category: ProductCategory, avoid: readonly string[] = []): Product {
    const options = this.ofCategory(category);
    if (options.length === 0) throw new Error(`No products in category ${category}`);
    const safe = options.filter(
      (p) => !(this.ingredients.get(p.id) ?? []).some((i) => avoid.includes(i)),
    );
    return faker.helpers.arrayElement(safe.length > 0 ? safe : options);
  }

    /** All products in the category with none of the avoided ingredients. */
  safeOf(category: ProductCategory, avoid: readonly string[] = []): Product[] {
    return this.ofCategory(category).filter(
      (p) => !(this.ingredients.get(p.id) ?? []).some((i) => avoid.includes(i)),
    );
  }
}

/* ------------------------------ purge ------------------------------ */

/** Deletes one user and everything that belongs to them, children first. */
export async function purgeUser(userId: string): Promise<void> {
  await r.users.delete(userId);
}

async function findSeedUsers(): Promise<User[]> {
  const all = await r.users.findMany();
  return all.filter((u) => u.email.endsWith(`@${SEED_DOMAIN}`));
}

/* ------------------------------ scans ------------------------------ */

/**
 * Builds the whole scan history synchronously. The score does a mean-reverting
 * random walk so the timeline has realistic ups and downs, not a straight line.
 */
function buildScanSpecs(
  userId: string,
  count: number,
  spanDays: number,
  avoid: readonly string[],
): ScanSpec[] {
  const totalMinutes = spanDays * 24 * 60;
  const offsets = scanOffsets(count, totalMinutes);
  const baseAge = faker.number.int({ min: 22, max: 44 });
  let score = faker.number.int({ min: 45, max: 65 });
  const specs: ScanSpec[] = [];

  for (let i = 0; i < count; i++) {
    const skinAge = clamp(baseAge + Math.round((60 - score) / 8) + jitter(1), 18, 70);
    const moisture = clamp(score - 10 + jitter(6), 20, 95);
    const oiliness = clamp(95 - score + jitter(8), 10, 90);
    const acne = clamp(80 - score + jitter(6), 3, 80);
    const redness = clamp(70 - score + jitter(6), 5, 75);
        const ago = offsets[i] ?? 0;

    const texture: TextureData = { score: clamp(score + jitter(6), 20, 98) };

    const poreRegions = {
      forehead: metric(30, 85),
      nose: metric(25, 80),
      cheek: metric(35, 90),
    };
    const pore: PoreScores = {
      ...poreRegions,
      whole: average(Object.values(poreRegions)),
    };

    const wrinkleRegions = {
      forehead: metric(55, 95),
      glabellar: metric(55, 95),
      crowfeet: metric(55, 95),
      periocular: metric(55, 95),
      nasolabial: metric(55, 95),
      marionette: metric(55, 95),
    };
    const wrinkle: WrinkleScores = {
      ...wrinkleRegions,
      whole: average(Object.values(wrinkleRegions)),
    };

    const skinType: SkinTypeData = {
      type: faker.helpers.arrayElement(SKIN_TYPE_LABELS),
      confidence: faker.number.float({ min: 0.6, max: 0.95, fractionDigits: 2 }),
    };

    specs.push({
      scan: {
        userId,
        status: "COMPLETED",
        score,
        skinAge,
        createdAt: minutesAgo(ago),
        aiShortSummary: `Skin score ${score}. ${moisture < 55 ? "Hydration is the main focus." : "Hydration looks healthy."}`,
        aiSummary: `Your skin scored ${score} with an estimated skin age of ${skinAge}. Moisture is ${moisture} and oiliness ${oiliness}. ${acne > 35 ? "Breakouts are the area to watch." : "Breakouts are well controlled."} Keep your routine consistent and use sunscreen daily.`,
        aiShortObservation: `Oiliness ${oiliness}, moisture ${moisture}.`,
        aiObservation: `Oiliness measured ${oiliness} and moisture ${moisture}. Acne markers are at ${acne} and redness at ${redness}.${avoid.length > 0 ? ` Noting that you avoid ${avoid.join(", ")}.` : ""}`,
      },
      analysis: {
        redness,
        ageSpot: metric(5, 45),
        radiance: clamp(score + jitter(8), 20, 98),
        moisture,
        oiliness,
        darkCircle: metric(10, 60),
        eyeBag: metric(10, 55),
        droopyUpperEyelid: metric(5, 35),
        droopyLowerEyelid: metric(5, 35),
        firmness: clamp(skinAge < 30 ? 80 : 65 + jitter(10), 30, 98),
        texture,
        acne,
        pore,
        wrinkle,
        tearTrough: metric(5, 45),
        skinType,
      },
    });

    // Drift toward 72 with noise, so scores wander instead of only climbing.
    score = clamp(score + Math.round((72 - score) * 0.03) + jitter(3), 25, 97);
  }
  return specs;
}

async function seedScans(
  user: User,
  count: number,
  spanDays: number,
  avoid: readonly string[],
  concurrency: number,
): Promise<Scan[]> {
  const specs = buildScanSpecs(user.id, count, spanDays, avoid);
  return mapPool(specs, concurrency, async (spec) => {
    const scan = await r.scans.create(spec.scan);
    await r.analyses.upsertForScan(scan.id, spec.analysis);
    return scan;
  });
}

/* ------------------------------ routines ------------------------------ */

function buildRoutineSpecs(
  userId: string,
  count: number,
  catalogue: Catalogue,
  avoid: readonly string[],
): RoutineSpec[] {
  const name: ProductNamer = (category) => {
    const p = catalogue.pick(category, avoid);
    return `${p.brand} ${p.name}`;
  };

  /** The first four are fixed so every user always has one of each kind. */
  const fixedKinds: readonly RoutineKind[] = ["morning", "evening", "treatment", "habit"];

  const build = (kind: RoutineKind, accepted: boolean): RoutineSpec => {
    const label = faker.helpers.arrayElement(ROUTINE_ADJECTIVES);
    switch (kind) {
      case "morning": {
        const factories: StepFactory[] = [
          MORNING_STEPS.cleanse,
          ...(faker.datatype.boolean() ? [MORNING_STEPS.serum] : []),
          MORNING_STEPS.moisturise,
          MORNING_STEPS.spf,
        ];
        return {
          kind,
          accepted,
          // accepted,
          input: { userId, title: `${label} morning routine`, steps: factories.map((make) => make(name)) },
        };
      }
      case "evening":
        return {
          kind,
          accepted,
          input: {
            userId,
            title: `${label} evening routine`,
            // accepted,
            steps: [
              { period: "EVENING", title: "Cleanse", instruction: `Remove sunscreen and impurities with ${name("CLEANSER")}.` },
              { period: "NIGHT", title: "Treat", instruction: `Apply ${name("SERUM")} to damp skin.` },
              { period: "NIGHT", title: "Moisturise", instruction: `Seal in with ${name("MOISTURIZER")}.` },
            ],
          },
        };
      case "treatment":
        return {
          kind,
          accepted,
          input: {
            userId,
            title: `${label} weekly treatment`,
            steps: [
              { period: "NIGHT", title: "Exfoliate", instruction: `Twice a week, apply ${name("TREATMENT")} after cleansing. Wait 15 minutes before moisturiser.` },
            ],
          },
        };
      case "habit": {
        const habitStep = faker.helpers.arrayElement(HABITS);
        return { kind, accepted, input: { userId, title: habitStep.title, steps: [habitStep] } };
      }
    }
  };

  return Array.from({ length: Math.max(count, fixedKinds.length) }, (_, i) => {
    const fixed = fixedKinds[i];
    if (fixed !== undefined) return build(fixed, fixed === "morning" || fixed === "evening");
    const kind = faker.helpers.weightedArrayElement<RoutineKind>([
      { weight: 3, value: "morning" },
      { weight: 3, value: "evening" },
      { weight: 2, value: "treatment" },
      { weight: 2, value: "habit" },
    ]);
    return build(kind, faker.datatype.boolean(0.5));
  });
}

async function seedRoutines(
  user: User,
  count: number,
  catalogue: Catalogue,
  avoid: readonly string[],
  concurrency: number,
): Promise<SeededRoutine[]> {
  const specs = buildRoutineSpecs(user.id, count, catalogue, avoid);
  return mapPool(specs, concurrency, async (spec): Promise<SeededRoutine> => ({
    kind: spec.kind,
    accepted: spec.accepted,
    routine: await r.routines.createWithSteps(spec.input),
  }));
}

/* ------------------------------ logs ------------------------------ */
async function seedRoutineLogs(
  user: User,
  routines: readonly SeededRoutine[],
  count: number,
  spanDays: number,
  concurrency: number,
): Promise<void> {
  // Users log the routines they accepted; fall back to all if none were.
  const accepted = routines.filter((x) => x.accepted);
  const source = accepted.length > 0 ? accepted : routines;
  const pool = source.filter((x) => x.routine.steps.length > 0);
  if (pool.length === 0) return;

  const consistency = faker.number.float({ min: 0.4, max: 0.95 });
  const entries: { routineStepId: string; at: Temporal.Instant }[] = [];

  // One "session" = the user completing a routine, which logs each of its
  // steps a couple of minutes apart. Stops exactly at `count` rows.
  while (entries.length < count) {
    const { kind, routine } = faker.helpers.arrayElement(pool);
    const [start, end] = LOG_HOURS[kind];
    // Lower consistency pushes logs further into the past (user dropping off).
    const day = Math.min(spanDays - 1, recentDay(spanDays) + Math.round((1 - consistency) * 10));
    const startedAt = daysAgo(day, faker.number.int({ min: start, max: end }));

    for (const [i, step] of routine.steps.entries()) {
      if (entries.length >= count) break;
      entries.push({ routineStepId: step.id, at: startedAt.add({ minutes: i * 2 }) });
    }
  }

  await mapPool(entries, concurrency, (e) => r.routineLogs.log(user.id, e.routineStepId, e.at));
}
/* ------------------------------ recommendations ------------------------------ */
type RecType = RecommendationInput["type"];

const RECOMMENDATION_TYPE_WEIGHTS: readonly { weight: number; value: RecType }[] = [
  { weight: 5, value: "PRODUCT" },
  { weight: 2, value: "ROUTINE" },
  { weight: 2, value: "HABIT" },
  { weight: 2, value: "ROUTINE_STEP" },
];

async function seedRecommendations(
  user: User,
  count: number,
  spanDays: number,
  scans: readonly Scan[],
  catalogue: Catalogue,
  avoid: readonly string[],
  routines: readonly SeededRoutine[],
  concurrency: number,
): Promise<void> {
  // productId, routineId and routineStepId are each unique on Recommendation,
  // so every target can be recommended at most once: draw without replacement.
  const productPool = faker.helpers.shuffle(
    RECOMMENDED_CATEGORIES.flatMap((c) => catalogue.safeOf(c, avoid)),
  );
  const routinePool = faker.helpers.shuffle(routines.filter((x) => x.kind === "treatment"));
  const habitPool = faker.helpers.shuffle(routines.filter((x) => x.kind === "habit"));
  const stepPool = faker.helpers.shuffle(
    routines.filter((x) => x.kind !== "habit").flatMap((x) => x.routine.steps),
  );

  const remaining: Record<RecType, number> = {
    PRODUCT: productPool.length,
    ROUTINE: routinePool.length,
    HABIT: habitPool.length,
    ROUTINE_STEP: stepPool.length,
  };

  const specs: RecommendationInput[] = [];
  for (let i = 0; i < count; i++) {
    const available = RECOMMENDATION_TYPE_WEIGHTS.filter((w) => remaining[w.value] > 0);
    if (available.length === 0) break; // every pool is exhausted

    const type = faker.helpers.weightedArrayElement(available);
    const base = {
      userId: user.id,
      scanId: faker.helpers.arrayElement(scans).id,
      createdAt: daysAgo(recentDay(spanDays)),
    };

    switch (type) {
      case "PRODUCT": {
        const product = productPool.pop()!;
        remaining.PRODUCT--;
        specs.push({
          ...base,
          type,
          explanation: `${product.name} fits your latest scan: ${product.description.toLowerCase()}`,
          accepted: faker.datatype.boolean(0.4),
          productId: product.id,

        });
        break;
      }
      case "ROUTINE": {
        const source = routinePool.pop()!;
        remaining.ROUTINE--;
        specs.push({
          ...base,
          type,
          explanation: "Gentle weekly exfoliation targets clogged pores without over-drying.",
          accepted: faker.datatype.boolean(0.3),
          routineId: source.routine.id,
        });
        break;
      }
      case "HABIT": {
        const source = habitPool.pop()!;
        remaining.HABIT--;
        specs.push({
          ...base,
          type,
          explanation: "Small daily habits compound with your routine over a few weeks.",
          accepted: faker.datatype.boolean(0.3),
          routineId: source.routine.id,
        });
        break;
      }
      case "ROUTINE_STEP": {
        const step = stepPool.pop()!;
        remaining.ROUTINE_STEP--;
        specs.push({
          ...base,
          type,
          explanation: `Add "${step.title.toLowerCase()}" to your routine to support your latest scan results.`,
          accepted: faker.datatype.boolean(0.35),
          routineStepId: step.id,
        });
        break;
      }
    }
  }

  if (specs.length < count) {
    console.log(
      `[seed]   ${user.email}: ${specs.length}/${count} recommendations (limited by unique products/routines/steps)`,
    );
  }

  await mapPool(specs, concurrency, (spec) => r.recommendations.create(spec));
}

/* ------------------------------ chat, account, orders ------------------------------ */

async function seedChat(
  user: User,
  pairsCount: number,
  spanDays: number,
  concurrency: number,
): Promise<void> {
  const totalMinutes = spanDays * 24 * 60;
  const pairs = Array.from({ length: pairsCount }, () => {
    const [question, answer] = faker.helpers.arrayElement(CHAT_PAIRS);
    const ago = faker.number.int({ min: 2, max: totalMinutes });
    return { question, answer, ago };
  });

  await mapPool(pairs, concurrency, async ({ question, answer, ago }) => {
    await r.messages.addUserMessage(user.id, question, minutesAgo(ago));
    await r.messages.addAlinaMessage(user.id, answer, minutesAgo(ago - 1));
  });
}

async function seedAccount(user: User, withPassword: boolean): Promise<void> {
  const plan = faker.helpers.weightedArrayElement<SubscriptionPlan>([
    { weight: 6, value: "FREE" },
    { weight: 3, value: "PLUS" },
    { weight: 1, value: "PREMIUM" },
  ]);
  const outcome = faker.helpers.weightedArrayElement<SubscriptionStatus>([
    { weight: 8, value: "ACTIVE" },
    { weight: 1, value: "CANCELLED" },
    { weight: 1, value: "EXPIRED" },
  ]);
  const isFree = plan === "FREE";

  await r.subscriptions.create({
    userId: user.id,
    plan,
    status: isFree ? "ACTIVE" : outcome,
    startedAt: daysAgo(faker.number.int({ min: 20, max: 200 })),
    expiresAt: isFree
      ? null
      : outcome === "EXPIRED"
        ? daysAgo(3)
        : daysFromNow(faker.number.int({ min: 5, max: 30 })),
  });

  await r.devices.connect({
    userId: user.id,
    type: "MOBILE",
    externalId: faker.string.uuid(),
    name: `${faker.person.firstName()}'s ${faker.helpers.arrayElement(PHONE_MODELS)}`,
  });
  if (faker.datatype.boolean(0.3)) {
    const secondaryType: DeviceType = faker.helpers.arrayElement(["WEB", "RING"] as const);
    await r.devices.connect({
      userId: user.id,
      type: secondaryType,
      externalId: faker.string.uuid(),
      name: faker.helpers.arrayElement(OTHER_DEVICE_NAMES),
    });
  }

  if (withPassword) {
    await r.sessions.create({
      userId: user.id,
      refreshSecret: randomBytes(24).toString("hex"),
      ipAddress: faker.internet.ipv4(),
      userAgent: faker.internet.userAgent(),
      expiresAt: daysFromNow(30),
    });
  } else {
    await r.oauthAccounts.link(user.id, "google", faker.string.numeric(21));
  }
}

async function seedOrders(
  user: User,
  count: number,
  catalogue: Catalogue,
  concurrency: number,
): Promise<void> {
  const specs: OrderInput[] = Array.from({ length: count }, () => ({
    userId: user.id,
    paypalOrderId: `SEED-${faker.string.alphanumeric({ length: 12, casing: "upper" })}`,
    items: faker.helpers.arrayElements(catalogue.all, { min: 1, max: 4 }).map((p) => ({
      productId: p.id,
      quantity: faker.number.int({ min: 1, max: 3 }),
    })),
  }));
  await mapPool(specs, concurrency, (spec) => r.orders.createWithItems(spec));
}

/* ------------------------------ user ------------------------------ */

async function seedUser(entry: SeedPlanEntry, o: ResolvedOptions): Promise<User> {
  const gender: Gender = entry.gender ?? faker.helpers.arrayElement(["MALE", "FEMALE"] as const);
  const sex = gender === "MALE" ? "male" : "female";
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName();
  const avoid = faker.helpers.arrayElements(AVOID_POOL, { min: 0, max: 2 });

  // Fitzpatrick type first, then a tone colour that matches it.
  const fitzpatrick = randomFitzpatrick();
  const skinTone = faker.helpers.arrayElement(SKIN_TONES_BY_TYPE[fitzpatrick]);

  const user = await r.users.create({
    email: entry.email,
    fullName: entry.fullName ?? `${firstName} ${lastName}`,
    password: entry.password ? await hash(DEV_PASSWORD) : null,
    phoneNumber: faker.phone.number({ style: "international" }),
    emailVerifiedAt: daysAgo(faker.number.int({ min: 5, max: 120 })),
    gender,
    dateOfBirth: randomBirthDate(18, 48),
    avatar: faker.image.avatar(),
    skinType: fitzpatrick,
    skinTone,
  });


  const generated = generateProducts(o.productsPerUser);
  const products = await phase(`${o.productsPerUser} products`, () =>
    mapPool(generated, o.concurrency, (g) =>
      r.products.findOrCreate({ ...g.input, userId: user.id }),
    ),
  );
  const catalogue = new Catalogue(products, generated.map((g) => g.ingredients));


  await r.preferences.upsert(user.id, {
    favoriteBrands: faker.helpers.arrayElements(catalogue.brands, { min: 1, max: 4 }),
    favoriteIngredients: faker.helpers.arrayElements(LIKE_POOL, { min: 1, max: 3 }),
    avoidedIngredients: avoid,
    budget: faker.helpers.arrayElement(BUDGETS),
  });

  console.log(
    `[seed] ${user.email}: Fitzpatrick ${fitzpatrick}, tone ${skinTone}, avoids ${avoid.join(", ") || "none"}`,
  );

  await phase("account", () => seedAccount(user, entry.password));

  const scans = await phase(`${o.scansPerUser} scans + analyses`, () =>
    seedScans(user, o.scansPerUser, o.spanDays, avoid, o.concurrency),
  );
  await r.users.setLastScanImage(user.id, null);

  const routines = await phase(`${o.routinesPerUser} routines`, () =>
    seedRoutines(user, o.routinesPerUser, catalogue, avoid, o.concurrency),
  );
  await phase(`${o.logsPerUser} routine logs`, () =>
    seedRoutineLogs(user, routines, o.logsPerUser, o.spanDays, o.concurrency),
  );
  await phase(`${o.recommendationsPerUser} recommendations`, () =>
    seedRecommendations(user, o.recommendationsPerUser, o.spanDays, scans, catalogue, avoid, routines, o.concurrency),
  );
  await phase(`${o.messagePairsPerUser * 2} messages`, () =>
    seedChat(user, o.messagePairsPerUser, o.spanDays, o.concurrency),
  );
  await phase(`${o.ordersPerUser} orders`, () =>
    seedOrders(user, o.ordersPerUser, catalogue, o.concurrency),
  );

  return user;
}

/* ------------------------------ entry ------------------------------ */

export async function seed(options: SeedOptions = {}): Promise<void> {
  const o = resolveOptions(options);
  console.log("Running Seeder......................");
  console.log("seeder options", o);
  faker.seed(o.seed);

  if (o.reset) {
    const existing = await findSeedUsers();
    for (const user of existing) await purgeUser(user.id);
    console.log(`[seed] removed ${existing.length} seed users`);
  }


  const plan: SeedPlanEntry[] = [
    { email: DEMO_EMAIL, fullName: "Demo User", password: true },
    ...Array.from({ length: o.users }, (_, i): SeedPlanEntry => ({
      email: faker.internet
        .email({ provider: SEED_DOMAIN })
        .toLowerCase()
        .replace("@", `.${i + 1}@`),
      password: i % 3 !== 2, // every third user signs in with Google instead
    })),
  ];

  let created = 0;
  for (const entry of plan) {
    if (await r.users.findByEmail(entry.email)) {
      console.log(`[seed] ${entry.email} exists, skipping`);
      continue;
    }
    await seedUser(entry, o);   // no catalogue argument
    created++;
    console.log(`[seed] created ${entry.email}`);
  }


  console.log(
    `[seed] done: ${created} created, ${plan.length - created} skipped. Password users sign in with "${DEV_PASSWORD}" (demo: ${DEMO_EMAIL}).`,
  );
}