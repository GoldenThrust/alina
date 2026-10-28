import { Redis } from "ioredis";
import { env } from "./env.ts";
const redis = new Redis({ port: Number(env.REDIS_PORT), host: env.REDIS_HOST,  password: env.REDIS_PASSWORD, maxRetriesPerRequest: null });

export default redis;
