import fp from "fastify-plugin";
import { prisma } from "../config/prisma.ts";

export default fp(async (app) => {
  app.decorate("prisma", prisma);
});