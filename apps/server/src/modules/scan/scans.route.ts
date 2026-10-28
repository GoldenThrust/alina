import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../lib/crud";
import * as C from "./scans.controller";
import * as Z from "./scans.schema";
import { IdParams, PaginationQuery } from "../../lib/schemas";

export default async function scanRoutes(fastify: FastifyInstance) {
    const auth = [fastify.authenticate];
  // const admin = [fastify.authenticate, requireAdmin];
  
  
  /* ---------- Scans ---------- */
  fastify.get("/", { preHandler: auth, schema: { querystring: Z.ListScansQuery } }, C.scanController.list);
  fastify.get("/:id", { preHandler: auth, schema: { params: IdParams } }, C.scanController.get);
  fastify.post("/", { preHandler: auth }, C.scanController.create); // multipart: field "image"
  fastify.delete("/:id", { preHandler: auth, schema: { params: IdParams } }, C.scanController.remove);
  fastify.get("/history", { preHandler: auth, schema: { querystring: Z.ListScansQuery } }, C.scanController.history);

  fastify.post("/upload/temporal", { preHandler: auth }, C.scanController.createTemporalImage)

  fastify.get("/first-and-last", { preHandler: auth }, C.scanController.firstAndLast);

  /* ---------- Skin analysis (1:1 with scan) ---------- */
  fastify.get("/:scanId/analysis", { preHandler: auth, schema: { params: Z.ScanIdParams } }, C.analysisController.get);
  fastify.put("/:scanId/analysis", { preHandler: auth, schema: { params: Z.ScanIdParams, body: Z.UpsertAnalysisBody } }, C.analysisController.upsert);
  fastify.delete("/:scanId/analysis", { preHandler: auth, schema: { params: Z.ScanIdParams } }, C.analysisController.remove);
}
