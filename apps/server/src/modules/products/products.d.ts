import type z from "zod";
import type { CreateProductBody, ListProductsQuery, UpdateProductBody } from "./products.schema";

export type CreateProductBody = z.infer<typeof CreateProductBody>;
export type UpdateProductBody = z.infer<typeof UpdateProductBody>;
export type ListProductsQuery = z.infer<typeof ListProductsQuery>;