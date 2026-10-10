import redis from "./redis.js";
import { env } from "./env.ts";
import { prisma } from "./prisma.ts";

export const config = {
  env,
  prisma,
  redis,
};