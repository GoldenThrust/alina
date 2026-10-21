import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../lib/crud";
import * as C from "./recommendations.controller";
import * as Z from "./recommendations.schema";
import { IdParams, PaginationQuery } from "../../lib/schemas";

export default async function scanRoutes(fastify: FastifyInstance) {
  const auth = [fastify.authenticate];

  /* ---------- Recommendations ---------- */
  fastify.get(
    "/",
    { preHandler: auth, schema: { querystring: Z.ListRecommendationsQuery } },
    C.recommendationController.list,
  );
  fastify.get(
    "/:id",
    { preHandler: auth, schema: { params: IdParams } },
    C.recommendationController.get,
  );
  fastify.post(
    "/",
    { preHandler: auth, schema: { body: Z.CreateRecommendationBody } },
    C.recommendationController.create,
  );
  fastify.put(
    "/:id",
    {
      preHandler: auth,
      schema: { params: IdParams, body: Z.UpdateRecommendationBody },
    },
    C.recommendationController.update,
  );
  fastify.delete(
    "/:id",
    { preHandler: auth, schema: { params: IdParams } },
    C.recommendationController.remove,
  );
}
