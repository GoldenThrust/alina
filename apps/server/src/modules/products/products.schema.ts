import { z } from "zod";
import { PaginationQuery } from "../../lib/schemas";

export const ProductCategory = z.enum([
  "CLEANSER", "TONER", "SERUM", "MOISTURIZER", "SUNSCREEN", "TREATMENT", "OTHER",
]);

/* ---------- Product (public read, admin write) ---------- */
export const CreateProductBody = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  category: ProductCategory,
  description: z.string().min(1),
  image: z.url().optional(),
  affiliateUrl: z.url().optional(),
  price: z.number().nonnegative().optional(),
});
export const UpdateProductBody = CreateProductBody.partial();
export const ListProductsQuery = PaginationQuery.extend({
  category: ProductCategory.optional(),
  brand: z.string().optional(),
});

export const ProductIdsQuery = z.object({
  q: z.string().min(1),
});