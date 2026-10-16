import { seed } from "./seed";

/**
 * Usage:
 *   tsx seed/run.ts                      5 random users plus the demo user
 *   tsx seed/run.ts --users=20           more users
 *   tsx seed/run.ts --seed=7             different (but repeatable) data
 *   tsx seed/run.ts --reset              delete seed users, then recreate
 */

const flag = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const toInt = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) {
    console.error(`[seed] invalid number: ${value}`);
    process.exit(1);
  }
  return n;
};

if (process.env.NODE_ENV === "production" && process.env.FORCE_SEED !== "true") {
  console.error(
    "[seed] Refusing to run with NODE_ENV=production. Set FORCE_SEED=true to override.",
  );
  process.exit(1);
}

seed({
  reset: process.argv.includes("--reset"),
  users: toInt(flag("users")),
  seed: toInt(flag("seed")),
})
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exit(1);
  });
