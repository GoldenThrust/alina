import { randomBytes, scryptSync } from "node:crypto";
import { fakerEN_NG as faker } from "@faker-js/faker";
import { Temporal } from "@js-temporal/polyfill";
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
 * Development seed data. Real skincare products, faker-generated people and
 * history. Deterministic for a given seed, so reruns produce the same users
 * and are skipped if they already exist.
 *
 * All seed users share the SEED_DOMAIN email domain, which is how `reset`
 * finds and removes them without touching real accounts.
 */

export const SEED_DOMAIN = "seed.example.com";
export const DEMO_EMAIL = `demo@${SEED_DOMAIN}`;
export const DEV_PASSWORD = "Password123!";

console.log("Running Seeder......................")

export interface SeedOptions {
  /** Random users to create besides the demo user. Default 5. */
  users?: number;
  /** Faker seed. Same seed, same data. Default 2026. */
  seed?: number;
  /** Delete existing seed users and recreate them. */
  reset?: boolean;
}

/* ------------------------------ helpers ------------------------------ */

/**
 * Timestamps are Temporal.Instant, calendar dates are Temporal.PlainDate.
 * Calendar-day math (days ago / from now) goes through a ZonedDateTime in the
 * system timezone, because Instant can't add or subtract days.
 */
const nowZoned = () => Temporal.Now.zonedDateTimeISO();

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

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const metric = (min: number, max: number) =>
  faker.number.float({ min, max, fractionDigits: 1 });

/** Random birth date for someone aged between minAge and maxAge today. */
function randomBirthDate(minAge: number, maxAge: number): Temporal.Instant {
  const age = faker.number.int({ min: minAge, max: maxAge });
  return Temporal.Now.plainDateISO()
    .subtract({ years: age })
    .subtract({ days: faker.number.int({ min: 0, max: 364 }) })
    .toZonedDateTime("UTC") // midnight UTC; the column is timestamptz, so it needs an Instant
    .toInstant();
}

/** scrypt, stored as salt:hash. Swap for your auth module's hasher if different. */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

/* ------------------------------ catalogue ------------------------------ */

const PRODUCTS: NewProduct[] = [
  { name: "Hydrating Facial Cleanser", brand: "CeraVe", category: "CLEANSER", description: "Gentle, fragrance-free cleanser with ceramides and hyaluronic acid.", price: 15 },
  { name: "Toleriane Hydrating Gentle Cleanser", brand: "La Roche-Posay", category: "CLEANSER", description: "Soap-free creamy cleanser for sensitive, dry skin.", price: 17 },
  { name: "Supple Preparation Facial Toner", brand: "Klairs", category: "TONER", description: "Alcohol-free hydrating toner that preps skin for serums.", price: 22 },
  { name: "Niacinamide 10% + Zinc 1%", brand: "The Ordinary", category: "SERUM", description: "Lightweight serum that helps with oiliness and visible pores.", price: 6 },
  { name: "Hyaluronic Acid 2% + B5", brand: "The Ordinary", category: "SERUM", description: "Hydrating serum with multiple weights of hyaluronic acid.", price: 9 },
  { name: "Skin Perfecting 2% BHA Liquid Exfoliant", brand: "Paula's Choice", category: "TREATMENT", description: "Leave-on salicylic acid exfoliant for clogged pores and uneven texture.", price: 34 },
  { name: "Adapalene Gel 0.1%", brand: "Differin", category: "TREATMENT", description: "Retinoid gel for acne-prone skin. Start slowly.", price: 15 },
  { name: "Moisturizing Cream", brand: "CeraVe", category: "MOISTURIZER", description: "Rich ceramide cream for dry to very dry skin.", price: 19 },
  { name: "Hydro Boost Water Gel", brand: "Neutrogena", category: "MOISTURIZER", description: "Oil-free gel moisturizer with hyaluronic acid.", price: 18 },
  { name: "Anthelios UV Mune 400 SPF 50+", brand: "La Roche-Posay", category: "SUNSCREEN", description: "Broad-spectrum fluid sunscreen with a light finish.", price: 36 },
  { name: "UV Clear Broad-Spectrum SPF 46", brand: "EltaMD", category: "SUNSCREEN", description: "Oil-free sunscreen with niacinamide for blemish-prone skin.", price: 41 },
];

const SKIN_TYPES = ["oily", "dry", "combination", "normal", "sensitive"];
const SKIN_TONES = ["fair", "light", "medium", "tan", "deep", "dark"];
const AVOID_POOL = ["fragrance", "alcohol denat.", "essential oils", "parabens", "sulfates"];
const LIKE_POOL = ["niacinamide", "hyaluronic acid", "ceramides", "vitamin c", "salicylic acid", "squalane"];

const CHAT_PAIRS: [string, string][] = [
  ["How is my skin doing compared to last time?", "Your score is trending up and moisture has improved. Keep going with your current routine."],
  ["Should I add an exfoliant?", "A 2% BHA once or twice a week would suit you. I have added it as a suggestion you can accept."],
  ["Is it okay to use vitamin C in the morning?", "Yes, vitamin C works well in the morning under sunscreen. Start every other day to check tolerance."],
  ["My cheeks feel tight after cleansing.", "That usually means the cleanser is too stripping. Try a creamy, fragrance-free one and moisturise right after."],
  ["Do I really need sunscreen indoors?", "Daily SPF still matters, especially near windows. A light fluid sunscreen is easy to wear every day."],
  ["What helps with dark spots?", "Niacinamide, vitamin C and consistent SPF help fade them over time. Results take 8 to 12 weeks."],
];

const MORNING: Record<string, (p: (c: ProductCategory) => string) => StepInput> = {
  cleanse: (p) => ({ period: "MORNING", title: "Cleanse", instruction: `Massage ${p("CLEANSER")} for 30 seconds, then rinse with lukewarm water.` }),
  serum: (p) => ({ period: "MORNING", title: "Serum", instruction: `Apply a few drops of ${p("SERUM")} to damp skin.` }),
  moisturise: (p) => ({ period: "MORNING", title: "Moisturise", instruction: `Apply a pea-sized amount of ${p("MOISTURIZER")} to face and neck.` }),
  spf: (p) => ({ period: "MORNING", title: "Sunscreen", instruction: `Apply two finger-lengths of ${p("SUNSCREEN")} and reapply every 2-3 hours outdoors.` }),
};

const HABITS: StepInput[] = [
  { period: "HABIT", title: "Hydration", instruction: "Drink about 8 glasses of water a day; keep a bottle within reach." },
  { period: "HABIT", title: "Pillowcase", instruction: "Change your pillowcase twice a week to reduce breakouts." },
  { period: "HABIT", title: "Sleep", instruction: "Aim for 7 to 8 hours of sleep; skin repairs itself overnight." },
  { period: "HABIT", title: "Phone hygiene", instruction: "Wipe your phone screen daily and avoid touching your face." },
];

/* ------------------------------ purge ------------------------------ */

/** Deletes one user and everything that belongs to them, children first. */
export async function purgeUser(userId: string): Promise<void> {
  for (const order of await r.orders.findMany({ userId })) {
    await r.orderItems.deleteWhere({ orderId: order.id });
  }
  await r.orders.deleteWhere({ userId });
  await r.recommendations.deleteWhere({ userId });
  for (const routine of await r.routines.findMany({ userId })) {
    await r.routineSteps.deleteWhere({ routineId: routine.id });
  }
  await r.routineLogs.deleteWhere({ userId });
  await r.routines.deleteWhere({ userId });
  for (const scan of await r.scans.findMany({ userId })) {
    await r.analyses.deleteWhere({ scanId: scan.id });
  }
  await r.scans.deleteWhere({ userId });
  await r.messages.deleteWhere({ userId });
  await r.preferences.deleteWhere({ userId });
  await r.subscriptions.deleteWhere({ userId });
  await r.devices.deleteWhere({ userId });
  await r.oauthAccounts.deleteWhere({ userId });
  await r.sessions.deleteWhere({ userId });
  await r.users.delete(userId);
}

async function findSeedUsers(): Promise<User[]> {
  const all = await r.users.findMany();
  return all.filter((u) => u.email.endsWith(`@${SEED_DOMAIN}`));
}

/* ------------------------------ per-user data ------------------------------ */

class Catalogue {
  constructor(readonly all: Product[]) {}

  ofCategory(category: ProductCategory): Product[] {
    return this.all.filter((p) => p.category === category);
  }

  pick(category: ProductCategory, avoid: string[] = []): Product {
    const options = this.ofCategory(category);
    const safe = options.filter(
      (p) => !avoid.some((a) => p.description.toLowerCase().includes(a)),
    );
    return faker.helpers.arrayElement(safe.length ? safe : options);
  }
}

async function seedScans(user: User, avoid: string[]) {
  const count = faker.number.int({ min: 2, max: 5 });
  const gapDays = faker.number.int({ min: 12, max: 30 });
  let score = faker.number.int({ min: 48, max: 68 });
  let skinAge = faker.number.int({ min: 24, max: 42 });
  const scans = [];

  for (let i = 0; i < count; i++) {
    const ago = (count - 1 - i) * gapDays + faker.number.int({ min: 0, max: 2 });
    const moisture = clamp(score - 10 + faker.number.int({ min: -6, max: 6 }), 20, 95);
    const oiliness = clamp(95 - score + faker.number.int({ min: -8, max: 8 }), 10, 90);
    const acne = clamp(80 - score + faker.number.int({ min: -6, max: 6 }), 3, 80);
    const redness = clamp(70 - score + faker.number.int({ min: -6, max: 6 }), 5, 75);

    const scan = await r.scans.create({
      userId: user.id,
      status: "COMPLETED",
      score,
      skinAge,
      createdAt: daysAgo(ago),
      aiShortSummary: `Skin score ${score}. ${moisture < 55 ? "Hydration is the main focus." : "Hydration looks healthy."}`,
      aiSummary: `Your skin scored ${score} with an estimated skin age of ${skinAge}. Moisture is ${moisture} and oiliness ${oiliness}. ${acne > 35 ? "Breakouts are the area to watch." : "Breakouts are well controlled."} Keep your routine consistent and use sunscreen daily.`,
      aiShortObservation: `Oiliness ${oiliness}, moisture ${moisture}.`,
      aiObservation: `Oiliness measured ${oiliness} and moisture ${moisture}. Acne markers are at ${acne} and redness at ${redness}.${avoid.length ? ` Noting that you avoid ${avoid.join(", ")}.` : ""}`,
    });

    await r.analyses.upsertForScan(scan.id, {
      redness,
      ageSpot: metric(5, 45),
      radiance: clamp(score + faker.number.int({ min: -8, max: 8 }), 20, 98),
      moisture,
      oiliness,
      darkCircle: metric(10, 60),
      eyeBag: metric(10, 55),
      droopyUpperEyelid: metric(5, 35),
      droopyLowerEyelid: metric(5, 35),
      firmness: clamp(skinAge < 30 ? 80 : 65 + faker.number.int({ min: -10, max: 10 }), 30, 98),
      texture: { score: clamp(score + faker.number.int({ min: -6, max: 6 }), 20, 98) },
      acne,
      pore: { score: metric(30, 85), forehead: metric(30, 85), nose: metric(25, 80), cheeks: metric(35, 90) },
      wrinkle: { score: metric(55, 95), forehead: metric(55, 95), eyes: metric(55, 95) },
      tearTrough: metric(5, 45),
      skinType: { type: faker.helpers.arrayElement(SKIN_TYPES), confidence: faker.number.float({ min: 0.6, max: 0.95, fractionDigits: 2 }) },
    });

    scans.push(scan);
    score = clamp(score + faker.number.int({ min: 0, max: 7 }), 0, 96);
    skinAge = Math.max(18, skinAge - faker.number.int({ min: 0, max: 1 }));
  }
  return scans;
}

async function seedRoutines(user: User, catalogue: Catalogue, avoid: string[]) {
  const name = (category: ProductCategory) => {
    const p = catalogue.pick(category, avoid);
    return `${p.brand} ${p.name}`;
  };

  const morningSteps = [MORNING.cleanse!, MORNING.serum!, MORNING.moisturise!, MORNING.spf!]
    .filter((_, i) => i !== 1 || faker.datatype.boolean())
    .map((make) => make(name));

  const morning = await r.routines.createWithSteps({
    userId: user.id,
    title: "Morning routine",
    accepted: true,
    steps: morningSteps,
  });
  const evening = await r.routines.createWithSteps({
    userId: user.id,
    title: "Evening routine",
    accepted: true,
    steps: [
      { period: "EVENING", title: "Cleanse", instruction: `Remove sunscreen and impurities with ${name("CLEANSER")}.` },
      { period: "NIGHT", title: "Treat", instruction: `Apply ${name("SERUM")} to damp skin.` },
      { period: "NIGHT", title: "Moisturise", instruction: `Seal in with ${name("MOISTURIZER")}.` },
    ],
  });
  const treatment = await r.routines.createWithSteps({
    userId: user.id,
    title: "Weekly treatment",
    accepted: false,
    steps: [
      { period: "NIGHT", title: "Exfoliate", instruction: `Twice a week, apply ${name("TREATMENT")} after cleansing. Wait 15 minutes before moisturiser.` },
    ],
  });
  const habitStep = faker.helpers.arrayElement(HABITS);
  const habit = await r.routines.createWithSteps({
    userId: user.id,
    title: habitStep.title,
    accepted: false,
    steps: [habitStep],
  });

  /* logs: ~30 days, mornings on most days, evenings less often */
  const consistency = faker.number.float({ min: 0.4, max: 0.95 });
  for (let d = 0; d < 30; d++) {
    if (faker.number.float() < consistency) {
      await r.routineLogs.log(user.id, morning.id, daysAgo(d, 6 + faker.number.int({ min: 0, max: 2 })));
    }
    if (faker.number.float() < consistency * 0.7) {
      await r.routineLogs.log(user.id, evening.id, daysAgo(d, 20 + faker.number.int({ min: 0, max: 2 })));
    }
  }

  return { treatment, habit };
}

async function seedRecommendations(
  user: User,
  scanId: string,
  catalogue: Catalogue,
  avoid: string[],
  routines: { treatment: { id: string }; habit: { id: string } },
) {
  const picks = faker.helpers.arrayElements(
    (["SERUM", "SUNSCREEN", "MOISTURIZER", "TREATMENT"] as ProductCategory[]).map(
      (c) => catalogue.pick(c, avoid),
    ),
    { min: 2, max: 3 },
  );
  for (const product of picks) {
    await r.recommendations.create({
      userId: user.id,
      scanId,
      type: "PRODUCT",
      explanation: `${product.name} fits your latest scan: ${product.description.toLowerCase()}`,
      accepted: faker.datatype.boolean(0.4),
      productId: product.id,
      createdAt: daysAgo(faker.number.int({ min: 0, max: 5 })),
    });
  }
  await r.recommendations.create({
    userId: user.id,
    scanId,
    type: "ROUTINE",
    explanation: "Gentle weekly exfoliation targets clogged pores without over-drying.",
    routineId: routines.treatment.id,
  });
  await r.recommendations.create({
    userId: user.id,
    scanId,
    type: "HABIT",
    explanation: "Small daily habits compound with your routine over a few weeks.",
    routineId: routines.habit.id,
  });
}

async function seedChat(user: User) {
  const pairs = faker.helpers.arrayElements(CHAT_PAIRS, { min: 2, max: 4 });
  let minutes = pairs.length * 12;
  for (const [question, answer] of pairs) {
    await r.messages.addUserMessage(user.id, question, minutesAgo(minutes));
    minutes -= 1;
    await r.messages.addAlinaMessage(user.id, answer, minutesAgo(minutes));
    minutes -= 11;
  }
}

async function seedAccount(user: User, withPassword: boolean) {
  const plan = faker.helpers.weightedArrayElement([
    { weight: 6, value: "FREE" as const },
    { weight: 3, value: "PLUS" as const },
    { weight: 1, value: "PREMIUM" as const },
  ]);
  const outcome = faker.helpers.weightedArrayElement([
    { weight: 8, value: "ACTIVE" as const },
    { weight: 1, value: "CANCELLED" as const },
    { weight: 1, value: "EXPIRED" as const },
  ]);
  await r.subscriptions.create({
    userId: user.id,
    plan,
    status: plan === "FREE" ? "ACTIVE" : outcome,
    startedAt: daysAgo(faker.number.int({ min: 20, max: 200 })),
    expiresAt: plan === "FREE" ? null : outcome === "EXPIRED" ? daysAgo(3) : daysFromNow(faker.number.int({ min: 5, max: 30 })),
  });

  await r.devices.connect({
    userId: user.id,
    type: "MOBILE",
    externalId: faker.string.uuid(),
    name: `${faker.person.firstName()}'s ${faker.helpers.arrayElement(["iPhone", "Pixel", "Galaxy", "Tecno Camon"])}`,
  });
  if (faker.datatype.boolean(0.3)) {
    await r.devices.connect({
      userId: user.id,
      type: faker.helpers.arrayElement(["WEB", "RING"] as const),
      externalId: faker.string.uuid(),
      name: faker.helpers.arrayElement(["Chrome on laptop", "Oura Ring", "Safari on iPad"]),
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

async function seedOrders(user: User, catalogue: Catalogue) {
  const orders = faker.number.int({ min: 0, max: 2 });
  for (let i = 0; i < orders; i++) {
    const products = faker.helpers.arrayElements(catalogue.all, { min: 1, max: 3 });
    await r.orders.createWithItems({
      userId: user.id,
      paypalOrderId: `SEED-${faker.string.alphanumeric({ length: 12, casing: "upper" })}`,
      items: products.map((p) => ({
        productId: p.id,
        quantity: faker.number.int({ min: 1, max: 2 }),
      })),
    });
  }
}

async function seedUser(
  catalogue: Catalogue,
  options: { email: string; fullName?: string; password: boolean; gender?: Gender },
): Promise<User> {
  const gender: Gender = options.gender ?? faker.helpers.arrayElement(["MALE", "FEMALE"] as const);
  const sex = gender === "MALE" ? "male" : "female";
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName();
  const avoid = faker.helpers.arrayElements(AVOID_POOL, { min: 0, max: 2 });

  const user = await r.users.create({
    email: options.email,
    fullName: options.fullName ?? `${firstName} ${lastName}`,
    password: options.password ? hashPassword(DEV_PASSWORD) : null,
    phoneNumber: faker.phone.number({ style: "international" }),
    emailVerifiedAt: daysAgo(faker.number.int({ min: 5, max: 120 })),
    gender,
    dateOfBirth: randomBirthDate(18, 48),
    avatar: faker.image.avatar(),
    skinType: faker.helpers.arrayElement(SKIN_TYPES),
    skinTone: faker.helpers.arrayElement(SKIN_TONES),
  });

  await r.preferences.upsert(user.id, {
    favoriteBrands: faker.helpers.arrayElements([...new Set(catalogue.all.map((p) => p.brand))], { min: 1, max: 3 }),
    favoriteIngredients: faker.helpers.arrayElements(LIKE_POOL, { min: 1, max: 3 }),
    avoidedIngredients: avoid,
    budget: faker.helpers.arrayElement([20, 30, 50, 80, 120]),
  });

  console.log(`[seed] ${user.email} created with skin type ${user.skinType} and tone ${user.skinTone}. Avoids: ${avoid.join(", ") || "none"}.`);

  await seedAccount(user, options.password);
  const scans = await seedScans(user, avoid);
  const latest = scans[scans.length - 1]!;
  await r.users.setLastScanImage(user.id, null);
  const routines = await seedRoutines(user, catalogue, avoid);
  await seedRecommendations(user, latest.id, catalogue, avoid, routines);
  await seedChat(user);
  await seedOrders(user, catalogue);
  return user;
}

/* ------------------------------ entry ------------------------------ */

export async function seed(options: SeedOptions = {}) {
  const { users = 5, seed: fakerSeed = 2026, reset = false } = options;
  faker.seed(fakerSeed);

  const catalogue = new Catalogue(
    await Promise.all(PRODUCTS.map((p) => r.products.findOrCreate(p))),
  );
  console.log(`[seed] products ready (${catalogue.all.length})`);

  if (reset) {
    const existing = await findSeedUsers();
    for (const user of existing) await purgeUser(user.id);
    console.log(`[seed] removed ${existing.length} seed users`);
  }

  const plan = [
    { email: DEMO_EMAIL, fullName: "Demo User", password: true },
    ...Array.from({ length: users }, (_, i) => ({
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
    await seedUser(catalogue, entry);
    created++;
    console.log(`[seed] created ${entry.email}`);
  }

  console.log(
    `[seed] done: ${created} created, ${plan.length - created} skipped. Password users sign in with "${DEV_PASSWORD}" (demo: ${DEMO_EMAIL}).`,
  );
}