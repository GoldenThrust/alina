import type { FastifyInstance } from "fastify";
import { IdParams, PaginationQuery } from "../../lib/schemas";
import * as C from "./subscriptions.controller";

export default async function scanRoutes(fastify: FastifyInstance) {
      const auth = [fastify.authenticate];
    // const admin = [fastify.authenticate, requireAdmin];

    /* ---------- Subscriptions (read + cancel) ---------- */
  fastify.get("/subscriptions", { preHandler: auth, schema: { querystring: PaginationQuery } }, C.subscriptionController.list);
  fastify.get("/subscriptions/:id", { preHandler: auth, schema: { params: IdParams } }, C.subscriptionController.get);
  fastify.post("/subscriptions/:id/cancel", { preHandler: auth, schema: { params: IdParams } }, C.subscriptionController.cancel);
}
