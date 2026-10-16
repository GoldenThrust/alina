import { handle } from "../../lib/crud";
import * as S from "./products.service";


/* ---------- Product (no userId scoping) ---------- */
export const productController = {
  list: handle("Failed to fetch products", (req: any) => S.productService.list(req.query)),
  get: handle("Failed to fetch product", (req: any) => S.productService.get(req.params.id)),
  create: handle("Failed to create product", (req: any) => S.productService.create(req.body), 201),
  update: handle("Failed to update product", (req: any) =>
    S.productService.update(req.params.id, req.body),
  ),
  remove: handle("Failed to delete product", (req: any) => S.productService.remove(req.params.id)),
};
