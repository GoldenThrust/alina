import fp from "fastify-plugin";
import redis from "../config/redis.ts";

export default fp(async (app) => {
  app.decorate("redis", redis);
});