import path from "path";
import { ORM } from "../../prisma/db";
import { pick } from "../../lib/crud";
import type { CreateProductBody, ListProductsQuery, UpdateProductBody } from "./products";
import APIError from "../../errors/APIError";

const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");


/* ===================== Product (global catalogue) ===================== */
const PRODUCT_FIELDS = [
  "name", "brand", "category", "description", "image", "affiliateUrl", "price",
] as const;

export const productService = {
  async list(query: ListProductsQuery) {
    const { page, limit } = query;
    if (page < 1 || limit < 1) {
      throw new APIError("Invalid page or limit", 400);
    }
    return ORM.Product()
      .where(pick(query, ["category", "brand"]))
      .offset((page - 1) * limit)
      .limit(limit)
      .all();
  },
  async get(id: string) {
    const product = await ORM.Product().where({ id }).first();
    if (!product) throw new APIError("Product not found", 404);
    return product;
  },
async create(payload: CreateProductBody) {
  return ORM.Product().create({
    name: payload.name,
    brand: payload.brand,
    category: payload.category,
    description: payload.description,
    image: payload.image ?? null,
    affiliateUrl: payload.affiliateUrl ?? null,
    price: payload.price ?? null,
  });
},
  async update(id: string, payload: UpdateProductBody) {
    const data = pick(payload, PRODUCT_FIELDS);
    if (Object.keys(data).length === 0) {
      throw new APIError("No valid fields to update", 400);
    }
    const product = await ORM.Product().where({ id }).update(data);
    if (!product) throw new APIError("Product not found", 404);
    return product;
  },
  async remove(id: string) {
    await productService.get(id);
    await ORM.Product().where({ id }).delete();
    return { message: "Product deleted successfully" };
  },
};
