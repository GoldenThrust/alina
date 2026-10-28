import { createHash } from "node:crypto";
import { redisService } from "../../../redis.service.ts"; // adjust path
import { env } from "../../../../config/env.ts";

/* ------------------------------ config ------------------------------ */

const BASE = env.QLOO_API_URL;
const TIMEOUT_MS = 8_000;
const CACHE_VERSION = "v3"; // bump when params or response shape change
const TAKE = 20;

const TTL = {
  rec: 6 * 3600,
  trending: 3 * 3600,
  compare: 12 * 3600,
  entity: 7 * 24 * 3600,
  empty: 10 * 60, // retry sooner when Qloo returned nothing
};

const SEARCH_PATH = "/search";
const ENTITIES_PATH = "/entities";
const INSIGHTS_PATH = "/v2/insights";
const TRENDING_PATH = "/v2/trending";
const COMPARE_PATH = "/v2/analysis/compare";

const SEED_PARAM = "signal.interests.entities";
const AGE_PARAM = "signal.demographics.age";
const GENDER_PARAM = "signal.demographics.gender";
const EXCLUDE_PARAM = "filter.exclude.entities";
const RESULTS_PARAM = "filter.results.entities";
const LOCATION_PARAM = "filter.location.query";
const TRENDS_PARAM = "bias.trends";
const POPULARITY_MIN_PARAM = "filter.popularity.min";

/* ------------------------------- types ------------------------------ */

export type QlooEntityType = "brand" | "place" | "person" | "podcast";
const URN: Record<QlooEntityType, string> = {
  brand: "urn:entity:brand",
  place: "urn:entity:place",
  person: "urn:entity:person",
  podcast: "urn:entity:podcast",
};
export const URNTAG: Record<QlooEntityType, string> = {
  brand: "urn:tag:genre:brand:health_and_beauty",
  place: "urn:tag:genre:place:hotel:wellness",
  person: "urn:tag:genre:person:influencer",
  podcast: "urn:tag:genre:media:health_fitness,urn:tag:genre:media:medicine",
};

export type AgeBand =
  | "24_and_younger"
  | "25_to_29"
  | "30_to_34"
  | "35_to_44"
  | "45_to_54"
  | "55_and_older";

export interface TasteContext {
  ageBand?: AgeBand;
  gender?: "male" | "female";
  city?: string;
}

export interface Seed {
  name: string;
  hint?: QlooEntityType;
}

export interface EntityItem {
  id?: string;
  name: string;
  description?: string;
  address?: string;
  rating?: number;
  affinity?: number;
  popularity?: number;
  tags?: string[];
}

export type Status =
  "ok" | "no_match" | "no_signal" | "needs_location" | "location_not_found";
export interface RecResult {
  status: Status;
  items: EntityItem[];
}

export interface Momentum {
  direction: "rising" | "falling" | "steady" | "unknown";
  percentile?: number; // 0-100 popularity percentile
  rank?: number;
  foldChange?: number;
  asOf?: string;
}

export class QlooError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}
const isLocationError = (e: unknown) =>
  e instanceof QlooError && e.message === "location_not_found";

/* -------------------------------- http ------------------------------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(
  path: string,
  params: Record<string, string>,
  attempt = 0,
): Promise<any> {
  const key = env.QLOO_API_KEY;
  if (!key) throw new QlooError("missing_api_key");

  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { "X-Api-Key": key }, // header only: never a query param or Bearer token
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 1) {
    await sleep(400);
    return get(path, params, attempt + 1);
  }
  if (!res.ok) throw new QlooError(`qloo_${res.status}`, res.status);
  return res.json();
}

/* ------------------------------ mapping ------------------------------ */

// /search and /entities return `results: [...]`; /v2/insights returns `results.entities`.
const entitiesOf = (body: any): any[] =>
  Array.isArray(body?.results) ? body.results : (body?.results?.entities ?? []);

const str = (v: unknown, max = 160): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.round(v * 100) / 100
    : undefined;

function toItem(e: any, tagLimit = 5): EntityItem | null {
  const name = str(e?.name, 120);
  if (!name) return null;
  const tags = Array.isArray(e?.tags)
    ? e.tags
        .map((t: any) => str(t?.name, 40))
        .filter((t: any): t is string => !!t)
        .slice(0, tagLimit)
    : undefined;
  return {
    id: str(e?.entity_id, 80),
    name,
    description: str(e?.properties?.description ?? e?.disambiguation),
    address: str(e?.properties?.address),
    rating: num(e?.properties?.business_rating),
    affinity: num(e?.query?.affinity),
    popularity: num(e?.popularity),
    tags: tags?.length ? tags : undefined,
  };
}

const itemsOf = (body: any, tagLimit = 5): EntityItem[] =>
  entitiesOf(body)
    .map((e) => toItem(e, tagLimit))
    .filter((x): x is EntityItem => x !== null);

function contextParams(ctx: TasteContext): Record<string, string> {
  const p: Record<string, string> = {};
  if (ctx.ageBand) p[AGE_PARAM] = ctx.ageBand;
  if (ctx.gender) p[GENDER_PARAM] = ctx.gender;
  return p;
}
const hasDemo = (ctx: TasteContext) =>
  Object.keys(contextParams(ctx)).length > 0;

/* -------------------- cache (Redis, fail-open) + dedupe -------------------- */

const inflight = new Map<string, Promise<unknown>>();

async function cached<T>(
  ns: string,
  parts: unknown,
  ttlS: number,
  fn: () => Promise<T>,
  isEmpty: (v: T) => boolean = () => false,
): Promise<T> {
  // Hashed so keys hold no brand names, age band, gender or city.
  const hash = createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("hex")
    .slice(0, 32);
  const key = `qloo:${ns}:${CACHE_VERSION}:${hash}`;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const run = (async () => {
    try {
      const hit = await redisService.getJson<T>(key);
      if (hit !== null) return hit;
    } catch {
      /* Redis down: go to Qloo */
    }
    const value = await fn();
    try {
      await redisService.setJson(key, value, isEmpty(value) ? TTL.empty : ttlS);
    } catch {
      /* cache write failure must not fail the request */
    }
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, run);
  return run;
}

/* --------------------------- entity resolution --------------------------- */

interface Resolved {
  id?: string;
  name?: string;
}

function resolveEntity(name: string, hint?: QlooEntityType): Promise<Resolved> {
  const query = name.trim();
  return cached(
    "entity",
    { n: query.toLowerCase(), h: hint ?? null },
    TTL.entity,
    async () => {
      const params: Record<string, string> = { query, take: "5" };
      if (hint) params.types = URN[hint]; // /search `types` is comma-separated
      const list = entitiesOf(await get(SEARCH_PATH, params).catch(() => null));
      const pick =
        (hint &&
          list.find(
            (e) => e?.subtype === URN[hint] || e?.types?.includes?.(URN[hint]),
          )) ||
        list[0];
      return typeof pick?.entity_id === "string"
        ? { id: pick.entity_id, name: str(pick.name, 120) }
        : {};
    },
    (r) => !r.id,
  );
}

async function resolveIds(seeds: Seed[]): Promise<string[]> {
  const found = await Promise.all(
    seeds.map((s) => resolveEntity(s.name, s.hint)),
  );
  return [
    ...new Set(found.map((f) => f.id).filter((id): id is string => !!id)),
  ];
}

/* -------------------------------- insights -------------------------------- */

function insights(
  type: QlooEntityType,
  ids: string[],
  ctx: TasteContext,
  take: number,
  opts: { trending?: boolean; excludeIds?: string[] } = {},
): Promise<EntityItem[]> {
  const demo = contextParams(ctx);
  const city = type === "place" ? ctx.city?.trim() : undefined;
  const exclude = [...(opts.excludeIds ?? [])].sort();

  return cached(
    "ins",
    {
      type,
      ids: [...ids].sort(),
      exclude,
      demo,
      city: city?.toLowerCase(),
      take,
      t: !!opts.trending,
    },
    opts.trending ? TTL.trending : TTL.rec,
    async () => {
      const params: Record<string, string> = {
        "filter.type": URN[type],
        "filter.tags": URNTAG[type],
        take: String(take),
        ...demo,
      };
      if (ids.length) {
        ids.push(URNTAG[type]);
        params[SEED_PARAM] = ids.join(",");
      }
      if (exclude.length) params[EXCLUDE_PARAM] = exclude.join(",");
      if (city) params[LOCATION_PARAM] = city;
      if (opts.trending) {
        params[TRENDS_PARAM] = "very_high";
        // Qloo needs at least one valid signal or filter
        if (!ids.length && !hasDemo(ctx) && !city)
          params[POPULARITY_MIN_PARAM] = "0.5";
      }
      try {
        return itemsOf(await get(INSIGHTS_PATH, params));
      } catch (e) {
        // filter.location.query returns 400 when the locality is not found
        if (city && e instanceof QlooError && e.status === 400) {
          throw new QlooError("location_not_found", 400);
        }
        throw e;
      }
    },
    (l) => l.length === 0,
  );
}

/* ------------------------------- recommend ------------------------------- */

export async function recommend(
  type: QlooEntityType,
  seeds: Seed[],
  ctx: TasteContext,
  limit = 10,
): Promise<RecResult> {
  if (type === "place" && !ctx.city?.trim())
    return { status: "needs_location", items: [] };

  const ids = await resolveIds(seeds);
  if (type !== "place" && !ids.length && !hasDemo(ctx))
    return { status: "no_signal", items: [] };

  try {
    const items = (
      await insights(type, ids, ctx, TAKE, { excludeIds: ids })
    ).slice(0, limit);
    return { status: items.length ? "ok" : "no_match", items };
  } catch (e) {
    if (isLocationError(e)) return { status: "location_not_found", items: [] };
    throw e;
  }
}

/* -------------------------------- trending -------------------------------- */

/** What is trending now (bias.trends), shaped by demographics, optional taste, and city for places. */
export async function trending(
  type: QlooEntityType,
  ctx: TasteContext,
  personalSeeds: Seed[] = [],
  limit = 10,
): Promise<RecResult> {
  if (type === "place" && !ctx.city?.trim())
    return { status: "needs_location", items: [] };

  const ids = personalSeeds.length ? await resolveIds(personalSeeds) : [];
  try {
    const items = (
      await insights(type, ids, ctx, TAKE, { trending: true })
    ).slice(0, limit);
    return { status: items.length ? "ok" : "no_match", items };
  } catch (e) {
    if (isLocationError(e)) return { status: "location_not_found", items: [] };
    throw e;
  }
}

/** Popularity momentum of one entity over ~90 days (/v2/trending is a per-entity time series). */
function momentumById(type: QlooEntityType, id: string): Promise<Momentum> {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 90 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return cached(
    "mom",
    { type, id, end },
    TTL.compare,
    async (): Promise<Momentum> => {
      const body = await get(TRENDING_PATH, {
        "filter.type": URN[type],
        [SEED_PARAM]: id,
        "filter.start_date": start,
        "filter.end_date": end,
        take: "20",
      });
      const rows: any[] = Array.isArray(body?.results?.trending)
        ? body.results.trending
        : [];
      const latest = rows[0]; // newest first
      const oldest = rows[rows.length - 1];
      const now = num(latest?.population_percentile);
      if (now === undefined) return { direction: "unknown" };

      const before = num(oldest?.population_percentile);
      const delta = before === undefined || rows.length < 2 ? 0 : now - before;
      return {
        direction: delta > 2 ? "rising" : delta < -2 ? "falling" : "steady",
        percentile: now,
        rank: num(latest?.population_rank),
        foldChange: num(latest?.velocity_fold_change),
        asOf: str(latest?.date, 10),
      };
    },
    (m) => m.direction === "unknown",
  );
}

export async function momentumOf(type: QlooEntityType, names: string[]) {
  return Promise.all(
    names.map(async (asked) => {
      const r = await resolveEntity(asked, type);
      if (!r.id) return { asked, status: "not_found" as const };
      const momentum = await momentumById(type, r.id).catch((): Momentum => ({
        direction: "unknown",
      }));
      return { asked, status: "ok" as const, name: r.name ?? asked, momentum };
    }),
  );
}

/* --------------------------------- compare --------------------------------- */

const entitiesByIds = (ids: string[]): Promise<EntityItem[]> =>
  cached(
    "ent",
    { ids: [...ids].sort() },
    TTL.entity,
    async () =>
      itemsOf(await get(ENTITIES_PATH, { entity_ids: ids.join(",") }), 15),
    (l) => l.length === 0,
  );

/** Affinity of each candidate toward the user's taste (filter.results.entities). Higher = closer match. */
const affinitiesOf = (
  type: QlooEntityType,
  ids: string[],
  userIds: string[],
  ctx: TasteContext,
): Promise<Record<string, number>> => {
  const demo = contextParams(ctx);
  return cached(
    "aff",
    { type, ids: [...ids].sort(), userIds: [...userIds].sort(), demo },
    TTL.compare,
    async () => {
      const body = await get(INSIGHTS_PATH, {
        "filter.type": URN[type],
        [SEED_PARAM]: userIds.join(","),
        [RESULTS_PARAM]: ids.join(","),
        take: String(ids.length),
        ...demo,
      });
      return Object.fromEntries(
        itemsOf(body)
          .filter((i) => i.id && i.affinity !== undefined)
          .map((i) => [i.id!, i.affinity!]),
      );
    },
    (m) => Object.keys(m).length === 0,
  );
};

/** Qloo's own analysis of group A (first item) vs group B (second item). */
const analysisOf = (a: string, b: string) =>
  cached(
    "cmp",
    { a, b },
    TTL.compare,
    async () =>
      itemsOf(
        await get(COMPARE_PATH, {
          "a.signal.interests.entities": a,
          "b.signal.interests.entities": b,
          take: "10",
        }),
      ).map((i) => ({ name: i.name, affinity: i.affinity })),
    (l) => l.length === 0,
  );

export interface CompareItem {
  asked: string;
  status: "ok" | "not_found";
  name?: string;
  description?: string;
  tags?: string[];
  popularity?: number;
  /** closeness to the user's taste: higher is better; undefined if the user has no taste data */
  userAffinity?: number;
  momentum?: Momentum;
}

export async function compare(
  type: QlooEntityType,
  names: string[],
  ctx: TasteContext,
  userSeeds: Seed[],
) {
  const [resolved, userIds] = await Promise.all([
    Promise.all(names.map((n) => resolveEntity(n, type))),
    resolveIds(userSeeds),
  ]);
  const ids = resolved.map((r) => r.id).filter((x): x is string => !!x);

  const [details, affinity, analysis] = await Promise.all([
    ids.length
      ? entitiesByIds(ids).catch((): EntityItem[] => [])
      : Promise.resolve([] as EntityItem[]),
    ids.length && userIds.length
      ? affinitiesOf(type, ids, userIds, ctx).catch(
          (): Record<string, number> => ({}),
        )
      : Promise.resolve({} as Record<string, number>),
    ids.length === 2
      ? analysisOf(ids[0], ids[1]).catch(
          () => [] as { name: string; affinity?: number }[],
        )
      : Promise.resolve([] as { name: string; affinity?: number }[]),
  ]);

  const byId = new Map(details.map((d) => [d.id, d]));

  const items: CompareItem[] = await Promise.all(
    names.map(async (asked, i): Promise<CompareItem> => {
      const r = resolved[i];
      if (!r.id) return { asked, status: "not_found" };
      const d = byId.get(r.id);
      const momentum = await momentumById(type, r.id).catch((): Momentum => ({
        direction: "unknown",
      }));
      return {
        asked,
        status: "ok",
        name: d?.name ?? r.name ?? asked,
        description: d?.description,
        tags: d?.tags,
        popularity: d?.popularity,
        userAffinity: userIds.length ? affinity[r.id] : undefined,
        momentum,
      };
    }),
  );

  const ok = items.filter((i) => i.status === "ok");
  const sets = ok.map(
    (i) => new Set((i.tags ?? []).map((t) => t.toLowerCase())),
  );
  const sharedTags = sets.length
    ? [...sets[0]].filter((t) => sets.every((s) => s.has(t)))
    : [];
  const uniqueTags = Object.fromEntries(
    ok.map((i) => [
      i.name!,
      (i.tags ?? []).filter((t) => !sharedTags.includes(t.toLowerCase())),
    ]),
  );

  return { items, sharedTags, uniqueTags, qlooAnalysis: analysis };
}
