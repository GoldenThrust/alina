import type { FastifyInstance } from "fastify";

import { requireAdmin } from "../../lib/crud";

import * as C from "./routines.controller";
import * as Z from "./routines.schema";
import { IdParams, PaginationQuery } from "../../lib/schemas";

export default async function scanRoutes(fastify: FastifyInstance) {
  const auth = [fastify.authenticate];
  const admin = [fastify.authenticate, requireAdmin];

  fastify.get(
    "/",
    { preHandler: auth, schema: { querystring: PaginationQuery } },
    C.routineController.list,
  );
  fastify.get(
    "/:id",
    { preHandler: auth, schema: { params: IdParams } },
    C.routineController.get,
  );
  fastify.post(
    "/",
    { preHandler: auth, schema: { body: Z.CreateRoutineBody } },
    C.routineController.create,
  );
  fastify.put(
    "/:id",
    {
      preHandler: auth,
      schema: { params: IdParams, body: Z.UpdateRoutineBody },
    },
    C.routineController.update,
  );
  fastify.delete(
    "/:id",
    { preHandler: auth, schema: { params: IdParams } },
    C.routineController.remove,
  );

  /* ---------- Routine steps ---------- */
  fastify.get(
    "/:routineId/steps",
    { preHandler: auth, schema: { params: Z.RoutineIdParams } },
    C.stepController.list,
  );
  fastify.get(
    "/:routineId/steps/:id",
    { preHandler: auth, schema: { params: Z.StepParams } },
    C.stepController.get,
  );
  fastify.post(
    "/:routineId/steps",
    {
      preHandler: auth,
      schema: { params: Z.RoutineIdParams, body: Z.CreateStepBody },
    },
    C.stepController.create,
  );
  fastify.put(
    "/:routineId/steps/:id",
    {
      preHandler: auth,
      schema: { params: Z.StepParams, body: Z.UpdateStepBody },
    },
    C.stepController.update,
  );
  fastify.delete(
    "/:routineId/steps/:id",
    { preHandler: auth, schema: { params: Z.StepParams } },
    C.stepController.remove,
  );

  /* ---------- Routine logs ---------- */
  fastify.get(
    "/logs",
    { preHandler: auth, schema: { querystring: Z.ListRoutineLogsQuery } },
    C.routineLogController.list,
  );
  fastify.get(
    "/logs/:id",
    { preHandler: auth, schema: { params: IdParams } },
    C.routineLogController.get,
  );
  fastify.post(
    "/logs",
    { preHandler: auth, schema: { body: Z.CreateRoutineLogBody } },
    C.routineLogController.create,
  );
  fastify.put(
    "/logs/:id",
    {
      preHandler: auth,
      schema: { params: IdParams, body: Z.UpdateRoutineLogBody },
    },
    C.routineLogController.update,
  );
  fastify.delete(
    "/logs/:id",
    { preHandler: auth, schema: { params: IdParams } },
    C.routineLogController.remove,
  );
}
