import fp from "fastify-plugin";
import { db } from "../prisma/db.ts";

export default fp(async (app) => {
  app.decorate("db", db);
});