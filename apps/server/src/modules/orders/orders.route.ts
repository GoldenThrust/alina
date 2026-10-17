import type { FastifyInstance } from "fastify";
import { IdParams, PaginationQuery } from "../../lib/schemas";

import { requireAdmin } from "../../lib/crud";
import * as C from "./orders.controller";
import * as Z from "./orders.schema";

export default async function scanRoutes(fastify: FastifyInstance) {
    const auth = [fastify.authenticate];
  const admin = [fastify.authenticate, requireAdmin];


    /* ---------- Orders ---------- */
  fastify.get("/", { preHandler: auth, schema: { querystring: PaginationQuery } }, C.orderController.list);
  fastify.get("/:id", { preHandler: auth, schema: { params: IdParams } }, C.orderController.get);
  fastify.post("/", { preHandler: auth, schema: { body: Z.CreateOrderBody } }, C.orderController.create);
  fastify.put("/:id", { preHandler: auth, schema: { params: IdParams, body: Z.UpdateOrderBody } }, C.orderController.update);
  fastify.delete("/:id", { preHandler: auth, schema: { params: IdParams } }, C.orderController.remove);

}
