import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../lib/crud";
import * as C from "./products.controller";
import * as Z from "./products.schema";
import { IdParams, PaginationQuery } from "../../lib/schemas";

export default async function scanRoutes(fastify: FastifyInstance) {
  const auth = [fastify.authenticate];
  const admin = [fastify.authenticate, requireAdmin];

  /* ---------- Products (public read, admin write) ---------- */
  fastify.get(
    "/",
    {
      preHandler: auth,
      schema: { querystring: Z.ListProductsQuery },
    },
    C.productController.list,
  );
  fastify.get(
    "/recommended",
    {
      preHandler: auth,
      schema: { querystring: Z.ListProductsQuery },
    },
    C.productController.recommended,
  );
  fastify.get(
    "/ids",
    {
      preHandler: auth,
      schema: { querystring: Z.ProductIdsQuery },
    },
    C.productController.getByIds,
  );
  fastify.get(
    "/:id",
    {
      preHandler: auth,
      schema: { params: IdParams },
    },
    C.productController.get,
  );
  fastify.post(
    "/",
    {
      preHandler: admin,
      schema: { body: Z.CreateProductBody },
    },
    C.productController.create,
  );
  fastify.put(
    "/:id",
    {
      preHandler: admin,
      schema: { params: IdParams, body: Z.UpdateProductBody },
    },
    C.productController.update,
  );
  fastify.delete(
    "/:id",
    { preHandler: admin, schema: { params: IdParams } },
    C.productController.remove,
  );
}
