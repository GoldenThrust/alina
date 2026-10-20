// src/lib/crud.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import APIError from "../errors/APIError";
import { decodeCursor, encodeCursor } from "../common/utils/crypto";
import { db } from "../prisma/db";

export type ListQuery = { page: number; limit: number } & Record<string, any>;

/** Returns the authenticated user's id (JWT `sub`). */
export function getUserId(req: FastifyRequest): string {
  const user = req.user as JwtPayload | undefined;
  if (!user) throw new APIError("Unauthorized", 401);
  return user.sub;
}

/** Whitelist fields so clients can't set anything outside the allowed list. */
export function pick(payload: Record<string, any>, keys: readonly string[]) {
  return Object.fromEntries(
    keys.filter((k) => payload?.[k] !== undefined).map((k) => [k, payload[k]]),
  );
}

export function handleError(
  res: FastifyReply,
  error: unknown,
  fallback: string,
) {
  // console.log("handleError", error);
  if (error instanceof APIError) {
    return res.status(error.statusCode).send({ message: error.message });
  }
  res.log.error(error);
  return res.status(500).send({ message: fallback });
}

/**
 * Wraps a handler body with the same try/catch pattern as updateProfileHandler.
 * Whatever `fn` returns is sent as the response body.
 */
export function handle<Req extends FastifyRequest = any>(
  fallback: string,
  fn: (req: Req, res: FastifyReply) => Promise<unknown>,
  status = 200,
) {
  return async (req: Req, res: FastifyReply) => {
    try {
      const result = await fn(req, res);
      return res.status(status).send(result);
    } catch (error) {
      return handleError(res, error, fallback);
    }
  };
}

export async function requireAdmin(req: FastifyRequest) {
  const user = req.user as (JwtPayload & { role?: string }) | undefined;
  if (user?.role !== "ADMIN") throw new APIError("Forbidden", 403);
}

type Model = () => any;

/** Throws 404 unless a row with this id exists AND belongs to the user. */
export async function assertOwned(
  model: Model,
  id: string,
  userId: string,
  label: string,
) {
  const row = await model().where({ id, userId }).first();
  if (!row) throw new APIError(`${label} not found`, 404);
  return row;
}

type OwnedServiceConfig = {
  label: string;
  model: Model;
  createFields: readonly string[];
  updateFields: readonly string[];
  filterFields?: readonly string[];
  /** Validate related ids / inject server-controlled fields before insert. */
  prepareCreate?: (
    userId: string,
    data: Record<string, any>,
  ) => Promise<Record<string, any>>;
};

/**
 * Generic CRUD service for models that have a `userId` column.
 * Every query is scoped by userId, so users can only touch their own rows.
 *
 * NOTE: only `.where().update()` is confirmed by your example. The other
 * ORM calls (.first/.all/.skip/.take/.create/.delete) are my assumption of
 * the API - if they differ, this is the only place you need to change.
 */
export function createOwnedService(cfg: OwnedServiceConfig) {
  const { label, model, createFields, updateFields, filterFields = [] } = cfg;

  return {
    async list(userId: string, query: ListQuery) {
      const { page = 1, limit = 20, cursor } = query;

      let rows = await model()
        .include("analysis")
        .where({ ...pick(query, filterFields), userId })
        .orderBy([(r: any) => r.createdAt.desc(), (r: any) => r.id.desc()])
        .cursor(cursor ? decodeCursor(cursor) : {})
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
      return assertOwned(model, id, userId, label);
    },

    async create(userId: string, payload: Record<string, any>) {
      let data: Record<string, any> = {
        ...pick(payload, createFields),
        userId,
      };
      if (cfg.prepareCreate) data = await cfg.prepareCreate(userId, data);
      return model().create(data);
    },

    async update(userId: string, id: string, payload: Record<string, any>) {
      const data = pick(payload, updateFields);
      if (Object.keys(data).length === 0) {
        throw new APIError("No valid fields to update", 400);
      }
      const row = await model().where({ id, userId }).update(data);
      if (!row) throw new APIError(`${label} not found`, 404);
      return row;
    },

    async remove(userId: string, id: string) {
      await assertOwned(model, id, userId, label);
      await model().where({ id, userId }).delete();
      return { message: `${label} deleted successfully` };
    },
  };
}

type OwnedService = ReturnType<typeof createOwnedService>;

/** Generic fastify handlers for an owned service. */
export function createOwnedHandlers(service: OwnedService, label: string) {
  return {
    list: handle(`Failed to fetch ${label}s`, (req: any) =>
      service.list(getUserId(req), req.query),
    ),
    get: handle(`Failed to fetch ${label}`, (req: any) =>
      service.get(getUserId(req), req.params.id),
    ),
    create: handle(
      `Failed to create ${label}`,
      (req: any) => service.create(getUserId(req), req.body),
      201,
    ),
    update: handle(`Failed to update ${label}`, (req: any) =>
      service.update(getUserId(req), req.params.id, req.body),
    ),
    remove: handle(`Failed to delete ${label}`, (req: any) =>
      service.remove(getUserId(req), req.params.id),
    ),
  };
}
