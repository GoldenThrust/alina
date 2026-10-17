import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../lib/crud";
import * as C from "./devices.controller";
import * as Z from "./devices.schema";
import { IdParams, PaginationQuery } from "../../lib/schemas";

export default async function scanRoutes(fastify: FastifyInstance) {
    const auth = [fastify.authenticate];
  const admin = [fastify.authenticate, requireAdmin];

    /* ---------- Devices ---------- */
  fastify.get("/", { preHandler: auth, schema: { querystring: PaginationQuery } }, C.deviceController.list);
  fastify.get("/:id", { preHandler: auth, schema: { params: IdParams } }, C.deviceController.get);
  fastify.post("/", { preHandler: auth, schema: { body: Z.CreateDeviceBody } }, C.deviceController.create);
  fastify.put("/:id", { preHandler: auth, schema: { params: IdParams, body: Z.UpdateDeviceBody } }, C.deviceController.update);
  fastify.delete("//:id", { preHandler: auth, schema: { params: IdParams } }, C.deviceController.remove);

}
