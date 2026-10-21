import path from "path";
import { ORM } from "../../prisma/db";
import { assertOwned, createOwnedService, pick } from "../../lib/crud";
import type {
  CreateProductBody,
  ListProductsQuery,
  UpdateProductBody,
} from "./products";
import APIError from "../../errors/APIError";
import assert from "assert";
import { decodeCursor, encodeCursor } from "../../common/utils/crypto";

const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");

/* ===================== Product (global catalogue) ===================== */
const PRODUCT_FIELDS = [
  "name",
  "brand",
  "category",
  "description",
  "image",
  "affiliateUrl",
  "price",
] as const;

const productBase = createOwnedService({
  label: "Product",
  model: ORM.Product,
  createFields: PRODUCT_FIELDS,
  updateFields: PRODUCT_FIELDS,
  filterFields: ["category", "brand"],
});

export const productService = {
  ...productBase,
  // async list(userId: string, query: ListProductsQuery) {
  //   const { page, limit } = query;
  //   if (page < 1 || limit < 1) {
  //     throw new APIError("Invalid page or limit", 400);
  //   }
  //   const products = await ORM.Product()
  //     .include("recommendation")
  //     .where({ ...pick(query, ["category", "brand"]), userId })
  //     .offset((page - 1) * limit)
  //     .limit(limit)
  //     .all();

  //   return { items: products, nextCursor: products.length === limit ? encodeCursor(products[products.length - 1]) : null };
  // },
  async get(id: string) {
    const product = await ORM.Product().where({ id }).first();
    if (!product) throw new APIError("Product not found", 404);
    return product;
  },
  async create(userId: string, payload: CreateProductBody) {
    return ORM.Product().create({
      userId,
      name: payload.name,
      brand: payload.brand,
      category: payload.category,
      description: payload.description,
      image: payload.image ?? null,
      affiliateUrl: payload.affiliateUrl ?? null,
      price: payload.price ?? null,
    });
  },
  async update(userId: string, id: string, payload: UpdateProductBody) {
    const data = pick(payload, PRODUCT_FIELDS);
    if (Object.keys(data).length === 0) {
      throw new APIError("No valid fields to update", 400);
    }
    const product = await ORM.Product().where({ id, userId }).update(data);
    if (!product) throw new APIError("Product not found", 404);
    return product;
  },
  async remove(userId: string, id: string) {
    await assertOwned(ORM.Product, id, userId, "Product");
    await ORM.Product().where({ userId, id }).delete();
    return { message: "Product deleted successfully" };
  },

  async recommended(userId: string, query: ListProductsQuery) {
    const { limit = 10, cursor } = query;

    let rows = await ORM.Product()
      .where({ ...pick(query, PRODUCT_FIELDS), userId })
      .where((p) => p.recommendation.some({ userId }))
      .include("recommendation")
      .orderBy([(r: any) => r.createdAt.desc(), (r: any) => r.id.desc()])
      .cursor(cursor ? decodeCursor(cursor) : {})
      .limit(limit + 1)
      .all();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
    };
  },
};
