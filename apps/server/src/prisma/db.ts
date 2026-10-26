import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";

import "temporal-polyfill/global";

import service from "../../service.ts";
import type { Contract } from "./contract.d.ts";
import contractJson from "./contract.json" with { type: "json" };

export const contract = contractFromJson<Contract>(contractJson);

function loadComposerDatabase() {
  try {
    return service.load().database.client;
  } catch {
    return undefined;
  }
}

export const db =
  loadComposerDatabase() ??
  (process.env.DATABASE_URL
    ? postgres({ contract, url: process.env.DATABASE_URL })
    : postgres({ contract }));

let connection: Promise<void> | undefined;

export function connectDatabase(): Promise<void> | undefined {
  connection ??= db.connect().then(() => undefined).catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

export const ORM = {
  User: () => db.orm.public.User,
  Scan: () => db.orm.public.SkinScan,
  Analysis: () => db.orm.public.SkinAnalysis,
  Routine: () => db.orm.public.Routine,
  Step: () => db.orm.public.RoutineStep,
  RoutineLog: () => db.orm.public.RoutineLog,
  Product: () => db.orm.public.Product,
  Recommendation: () => db.orm.public.Recommendation,
  Message: () => db.orm.public.Message,
  Preference: () => db.orm.public.Preference,
  Order: () => db.orm.public.Order,
  OrderItem: () => db.orm.public.OrderItem,
  Device: () => db.orm.public.ConnectedDevice,
  Subscription: () => db.orm.public.Subscription,
};
