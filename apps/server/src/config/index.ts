import redis from "./redis.js";
import { env } from "./env.ts";
import { db } from "../prisma/db.ts";

export const config = {
  env,
  db,
  redis,
};