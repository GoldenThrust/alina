import type { FastifyInstance } from "fastify";
import { IdParams, PaginationQuery } from "../../lib/schemas";

import { requireAdmin } from "../../lib/crud";
import * as C from "./messages.controller";
import * as Z from "./messages.schema";

export default async function scanRoutes(fastify: FastifyInstance) {
    const auth = [fastify.authenticate];
  const admin = [fastify.authenticate, requireAdmin];

  /* ---------- Messages (no update: chat history is immutable) ---------- */
  fastify.get("/", { preHandler: auth, schema: { querystring: PaginationQuery } }, C.messageController.list);
  fastify.get("/:id", { preHandler: auth, schema: { params: IdParams } }, C.messageController.get);
  fastify.post("/", { preHandler: auth, schema: { body: Z.CreateMessageBody } }, C.messageController.create);
  fastify.delete("/:id", { preHandler: auth, schema: { params: IdParams } }, C.messageController.remove);

}
