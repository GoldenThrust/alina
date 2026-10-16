import type { FastifyInstance } from "fastify";
import { scanAnalysisHandler } from "./messages.controller";

export default async function scanRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/scan",
    {
      preHandler: [fastify.authenticate],
    },
    scanAnalysisHandler
  );
}
