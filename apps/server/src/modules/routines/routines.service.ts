import path from "path";
import { ORM } from "../../prisma/db";
import { assertOwned, createOwnedService, pick } from "../../lib/crud";
import APIError from "../../errors/APIError";
import type { CreateStepBody, UpdateStepBody } from "./routines";

const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");

/* ===================== Routine ===================== */
const routineBase = createOwnedService({
  label: "Routine",
  model: ORM.Routine,
  createFields: ["title", "accepted"],
  updateFields: ["title", "accepted"],
});

export const routineService = {
  ...routineBase,
  async get(userId: string, id: string) {
    const routine = await assertOwned(ORM.Routine, id, userId, "Routine");
    const steps = await ORM.Step().where({ routineId: id }).all();
    steps.sort((a: any, b: any) => a.position - b.position);
    return { ...routine, steps };
  },
  async remove(userId: string, id: string) {
    await assertOwned(ORM.Routine, id, userId, "Routine");
    // no cascade in schema -> clean up children first
    await ORM.Step().where({ routineId: id }).delete();
    await ORM.RoutineLog().where({ routineId: id, userId }).delete();
    await ORM.Routine().where({ id, userId }).delete();
    return { message: "Routine deleted successfully" };
  },
};

/* ===================== RoutineStep (nested under routine) ===================== */
const STEP_FIELDS = ["period", "title", "instruction", "position"] as const;

export const stepService = {
  async list(userId: string, routineId: string) {
    await assertOwned(ORM.Routine, routineId, userId, "Routine");
    const steps = await ORM.Step().where({ routineId }).all();
    return steps.sort((a: any, b: any) => a.position - b.position);
  },
  async get(userId: string, routineId: string, id: string) {
    await assertOwned(ORM.Routine, routineId, userId, "Routine");
    const step = await ORM.Step().where({ id, routineId }).first();
    if (!step) throw new APIError("Step not found", 404);
    return step;
  },
  async create(userId: string, routineId: string, payload: CreateStepBody) {
    await assertOwned(ORM.Routine, routineId, userId, "Routine");

    let position = payload.position;
    if (position === undefined) {
      const steps = await ORM.Step().where({ routineId }).all();
      position = steps.length
        ? Math.max(...steps.map((s) => s.position)) + 1
        : 0;
    }

    return ORM.Step().create({
      routineId,
      period: payload.period,
      title: payload.title,
      instruction: payload.instruction,
      position,
    });
  },
  async update(
    userId: string,
    routineId: string,
    id: string,
    payload: UpdateStepBody,
  ) {
    await assertOwned(ORM.Routine, routineId, userId, "Routine");
    const data = pick(payload, STEP_FIELDS);
    if (Object.keys(data).length === 0) {
      throw new APIError("No valid fields to update", 400);
    }
    const step = await ORM.Step().where({ id, routineId }).update(data);
    if (!step) throw new APIError("Step not found", 404);
    return step;
  },
  async remove(userId: string, routineId: string, id: string) {
    await stepService.get(userId, routineId, id);
    await ORM.Step().where({ id, routineId }).delete();
    return { message: "Step deleted successfully" };
  },
};

/* ===================== RoutineLog ===================== */
export const routineLogService = createOwnedService({
  label: "Routine log",
  model: ORM.RoutineLog,
  createFields: ["routineId", "createdAt"],
  updateFields: ["createdAt"],
  filterFields: ["routineId"],
  prepareCreate: async (userId, data) => {
    await assertOwned(ORM.Routine, data.routineId, userId, "Routine");
    return data;
  },
});
