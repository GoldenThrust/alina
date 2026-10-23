import path from "path";
import { ORM } from "../../prisma/db";
import {
  assertOwned,
  createOwnedService,
  pick,
  type ListQuery,
} from "../../lib/crud";
import APIError from "../../errors/APIError";
import type { CreateStepBody, UpdateStepBody } from "./routines";
import { decodeCursor, encodeCursor } from "../../common/utils/crypto";
import { ro } from "@faker-js/faker";
import { Temporal } from "@js-temporal/polyfill";

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
  async list(userId: string, query: ListQuery) {
    const { page = 1, limit = 100, cursor } = query;

    console.log("list", { userId, query });

    const rows = await ORM.Routine()
      .include("recommendation")
      .include("steps", (steps) => steps.include("recommendation"))
      .where({
        ...pick(query, ["period", "title", "accepted"]),
        userId,
      })
      .orderBy([(r: any) => r.createdAt.desc(), (r: any) => r.id.desc()])
      .cursor(
        cursor
          ? (decodeCursor(cursor) as {
              createdAt: Date;
              id: string;
            })
          : {},
      )
      .offset(cursor ? 0 : (page - 1) * limit)
      .limit(limit + 1)
      .all();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
    };
  },
  async get(userId: string, id: string) {
    const routine = await assertOwned(ORM.Routine, id, userId, "Routine");
    const steps = await ORM.Step().where({ routineId: id }).all();
    steps.sort((a: any, b: any) => a.position - b.position);
    return { ...routine, steps };
  },
  async remove(userId: string, id: string) {
    await assertOwned(ORM.Routine, id, userId, "Routine");

    await ORM.Routine().where({ id, userId }).delete();
    return { message: "Routine deleted successfully" };
  },
};

/* ===================== RoutineStep (nested under routine) ===================== */
const STEP_FIELDS = ["period", "title", "instruction", "position"] as const;

export const stepService = {
  async list(userId: string, routineId: string) {
    await assertOwned(ORM.Routine, routineId, userId, "Routine");
    const steps = await ORM.Step()
      .where({ routineId })
      .orderBy((s: any) => s.position.asc())
      .all();
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

const routineLogBase = createOwnedService({
  label: "Routine log",
  model: ORM.RoutineLog,
  createFields: ["routineId", "completedAt"],
  updateFields: ["completedAt"],
  filterFields: ["routineId"],
  prepareCreate: async (userId, data) => {
    await assertOwned(ORM.Routine, data.routineId, userId, "Routine");
    return data;
  },
});

/* ===================== RoutineLog ===================== */
export const routineLogService = {
  ...routineLogBase,
  async list(userId: string, query: ListQuery) {
    let ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { routineId, startDate = ninetyDaysAgo.toDateString() } = query;
    let q = ORM.RoutineLog().include("routineStep").where({ userId });

    if (routineId) {
      q = q.where((r) => r.routineStep.some({ routineId }));
    }

    const items = await q
      .where((r) => r.completedAt.isNotNull())
      .where((r) => r.completedAt.gte(Temporal.Instant.from(startDate)))
      .orderBy([(r: any) => r.completedAt.desc(), (r: any) => r.id.desc()])
      .all();

    return {
      items,
      nextCursor: null, // no pagination for logs
    };
  },
  async create(userId: string, payload: Record<string, any>) {
    const { routineStepId, completedAt } = payload;
    await assertOwned(ORM.Step, routineStepId, userId, "Routine Step");
    const data = {
      routineStepId,
      completedAt: completedAt
        ? Temporal.Instant.from(completedAt)
        : Temporal.Now.instant(),
    };

    return ORM.RoutineLog()
      .include("routineStep")
      .create({
        ...pick(data, ["routineId", "completedAt"]),
        userId,
      });
  },
};
