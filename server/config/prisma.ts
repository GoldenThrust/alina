import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { env } from "./env.ts";
const connectionString = env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
// const prisma = new PrismaClient({ adapter, log: ["query", "error", "warn"] });
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });
export { prisma };
