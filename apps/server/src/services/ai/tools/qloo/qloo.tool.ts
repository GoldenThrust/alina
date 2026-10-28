import { z } from "zod";
import { BaseTool } from "../base.tool";
import type { ToolContext } from "../tool";
import type { SkincareRepository } from "../skincare/skincare.repository";
import {
  compare,
  momentumOf,
  recommend,
  trending,
  type QlooEntityType,
  type Seed,
  type TasteContext,
} from "./qloo.client";

const entityType = z.enum(["brand", "product", "place", "person", "podcast"]);
type EntityType = z.infer<typeof entityType>;

// Qloo has no product entity type: products are handled through their brands.
const qlooType = (t: EntityType): QlooEntityType => (t === "product" ? "brand" : t);

const PRODUCT_NOTE =
  "Qloo ranks brands only. Choose specific products from catalogProducts, or find real products from these brands with google_search. Never invent a product, and check ingredients against the user's avoided ingredients.";

function buildSeeds(favorites: string[], extra: string[] = []): Seed[] {
  const seen = new Set<string>();
  const out: Seed[] = [];
  const add = (raw: string, hint?: QlooEntityType) => {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    out.push({ name, hint });
  };
  extra.forEach((e) => add(e)); // what the user just mentioned comes first
  favorites.forEach((f) => add(f, "brand"));
  return out.slice(0, 8);
}

abstract class QlooTool<TInput, TResult = unknown> extends BaseTool<TInput, TResult> {
  constructor(protected readonly repo: SkincareRepository) {
    super();
  }

  protected async load(userId: string, cityOverride?: string) {
    const profile = await this.repo.tasteProfile(userId);
    const ctx: TasteContext = {
      ageBand: profile.ageBand,
      gender: profile.gender,
      city: cityOverride?.trim() || profile.city,
    };
    return { profile, ctx };
  }
}

const limit = z.number().int().min(1).max(10).optional();
const extra = z.array(z.string().min(1).max(80)).max(5).optional();
const city = z.string().min(1).max(80).optional();

/* ------------------------------ recommend ------------------------------ */

const recommendSchema = z.object({
  entityType,
  interests: extra,
  city,
  limit,
});

export class QlooRecommendTool extends QlooTool<z.infer<typeof recommendSchema>> {
  readonly name = "qloo_recommend";
  readonly description =
    "Recommend brands, products, places, people/influencers or podcasts this user is likely to love, based on their favorite brands, age range, gender and city. Saves nothing.";
  readonly schema = recommendSchema;

  protected async executeInternal(
    input: z.infer<typeof recommendSchema>,
    { userId }: ToolContext,
  ) {
    try {
      const { profile, ctx } = await this.load(userId, input.city);
      const seeds = buildSeeds(profile.favoriteBrands, input.interests);
      const isProduct = input.entityType === "product";

      const res = await recommend(
        qlooType(input.entityType),
        seeds,
        ctx,
        isProduct ? 8 : (input.limit ?? 8),
      );

      if (!isProduct) return { entityType: input.entityType, ...res };

      const catalogProducts = res.items.length
        ? await this.repo.productsByBrands(res.items.map((i) => i.name), 2)
        : [];
      return {
        entityType: "product",
        status: res.status,
        brands: res.items,
        catalogProducts,
        note: PRODUCT_NOTE,
      };
    } catch {
      return { status: "unavailable", items: [] };
    }
  }
}

/* ------------------------------- compare ------------------------------- */

const compareSchema = z.object({
  entityType,
  items: z.array(z.string().min(1).max(80)).min(2).max(4),
  interests: extra,
  city,
});

export class QlooCompareTool extends QlooTool<z.infer<typeof compareSchema>> {
  readonly name = "qloo_compare";
  readonly description =
    "Compare 2-4 brands, places, people/influencers or podcasts: shared and distinct taste traits, audience profile, and how well each fits this user's taste. For products, pass their brand names. Saves nothing.";
  readonly schema = compareSchema;

  protected async executeInternal(
    input: z.infer<typeof compareSchema>,
    { userId }: ToolContext,
  ) {
    try {
      const { profile, ctx } = await this.load(userId, input.city);
      const seeds = buildSeeds(profile.favoriteBrands, input.interests);
      const result = await compare(qlooType(input.entityType), input.items, ctx, seeds);
      return {
        entityType: input.entityType,
        status: "ok",
        ...result,
        ...(input.entityType === "product" && {
          note: "Compared at brand level. Use google_search for product and ingredient details.",
        }),
      };
    } catch {
      return { status: "unavailable", items: [] };
    }
  }
}

/* ------------------------------- trending ------------------------------- */
const trendingSchema = z.object({
  entityType,
  items: z.array(z.string().min(1).max(80)).min(1).max(4).optional(),
  city,
  personalize: z.boolean().optional(),
  limit,
});

export class QlooTrendingTool extends QlooTool<z.infer<typeof trendingSchema>> {
  readonly name = "qloo_trending";
  readonly description =
    "Two uses. (1) No items: what is trending now among brands, products, places, people/influencers or podcasts for this user's age range, gender and city (set personalize true to weight by their taste). (2) With items: whether those specific brands, places, people or podcasts are rising, steady or falling in popularity over the last ~90 days. For products, pass brand names. Saves nothing.";
  readonly schema = trendingSchema;

  protected async executeInternal(
    input: z.infer<typeof trendingSchema>,
    { userId }: ToolContext,
  ) {
    try {
      const type = qlooType(input.entityType);

      if (input.items?.length) {
        return {
          entityType: input.entityType,
          status: "ok",
          momentum: await momentumOf(type, input.items),
          note: "direction compares popularity percentile across ~90 days. percentile is 0-100.",
        };
      }

      const { profile, ctx } = await this.load(userId, input.city);
      const seeds = input.personalize ? buildSeeds(profile.favoriteBrands) : [];
      const isProduct = input.entityType === "product";

      const res = await trending(type, ctx, seeds, isProduct ? 8 : (input.limit ?? 8));
      if (!isProduct) return { entityType: input.entityType, ...res };

      const catalogProducts = res.items.length
        ? await this.repo.productsByBrands(res.items.map((i) => i.name), 2)
        : [];
      return {
        entityType: "product",
        status: res.status,
        brands: res.items,
        catalogProducts,
        note: PRODUCT_NOTE,
      };
    } catch {
      return { status: "unavailable", items: [] };
    }
  }
}