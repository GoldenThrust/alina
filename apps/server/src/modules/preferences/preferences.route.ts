import type { FastifyInstance } from "fastify";

import { requireAdmin } from "../../lib/crud";
import * as C from "./preferences.controller";
import * as Z from "./preferences.schema";


export default async function scanRoutes(fastify: FastifyInstance) {
    const auth = [fastify.authenticate];
  const admin = [fastify.authenticate, requireAdmin];

  
  /* ---------- Preferences (singleton) ---------- */
  fastify.get("/", { preHandler: auth }, C.preferenceController.get);
  fastify.put("/", { preHandler: auth, schema: { body: Z.UpsertPreferenceBody } }, C.preferenceController.upsert);
  fastify.delete("/", { preHandler: auth }, C.preferenceController.remove);

}
