import { seed, type SeedOptions } from "./seed";

/**
 * Usage:
 *   tsx seed/run.ts                               5 random users plus the demo user
 *   tsx seed/run.ts --users=20                    more users
 *   tsx seed/run.ts --seed=7                      different (but repeatable) data
 *   tsx seed/run.ts --reset                       delete seed users, then recreate
 *   tsx seed/run.ts --scans-per-user=500 --logs-per-user=2000 --products=300
 *
 * Numeric flags (kebab-case of the SeedOptions keys):
 *   --users --seed --products --scans-per-user --routines-per-user
 *   --logs-per-user --recommendations-per-user --message-pairs-per-user
 *   --orders-per-user --span-days --concurrency
 */

type NumericOption = Exclude<keyof SeedOptions, "reset">;

const NUMERIC_OPTIONS = [
  "users",
  "seed",
  "productsPerUser",
  "scansPerUser",
  "routinesPerUser",
  "logsPerUser",
  "recommendationsPerUser",
  "messagePairsPerUser",
  "ordersPerUser",
  "spanDays",
  "concurrency",
] as const satisfies readonly NumericOption[];

const toKebab = (key: string): string =>
  key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const fail = (message: string): never => {
  console.error(`[seed] ${message}`);
  process.exit(1);
};

const flagValue = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
};

const toInt = (name: string, value: string | undefined): number | undefined => {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return fail(`--${name} must be a non-negative integer, got "${value}"`);
  return n;
};

function parseOptions(): SeedOptions {
  const known = new Set<string>(["reset", ...NUMERIC_OPTIONS.map(toKebab)]);
  for (const arg of process.argv.slice(2)) {
    const name = arg.replace(/^--/, "").split("=")[0] ?? "";
    if (!arg.startsWith("--") || !known.has(name)) fail(`unknown argument: ${arg}`);
  }

  // Only set keys that were actually passed, so defaults in seed() apply.
  const options: SeedOptions = { reset: process.argv.includes("--reset") };
  for (const key of NUMERIC_OPTIONS) {
    const name = toKebab(key);
    const value = toInt(name, flagValue(name));
    if (value !== undefined) options[key] = value;
  }
  return options;
}

if (process.env.NODE_ENV === "production" && process.env.FORCE_SEED !== "true") {
  fail("Refusing to run with NODE_ENV=production. Set FORCE_SEED=true to override.");
}

seed(parseOptions())
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("[seed] failed", error);
    process.exit(1);
  });