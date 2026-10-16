import type { FastifyInstance } from "fastify";
import { scanAnalysisHandler } from "./scans.controller";

export default async function scanRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/scan",
    {
      preHandler: [fastify.authenticate],
    },
    scanAnalysisHandler
  );
}
