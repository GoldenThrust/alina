import { getUserId, handle } from "../../lib/crud";
import { ORM } from "../../prisma/db";
import * as S from "./products.service";


/* ---------- Product (no userId scoping) ---------- */
export const productController = {
  list: handle("Failed to fetch products", (req: any) => S.productService.list(getUserId(req),req.query)),
  recommended: handle("Failed to fetch recommended products", (req: any) => S.productService.recommended(getUserId(req), req.query)),
  getByIds: handle("Failed to fetch product", async (req: any) => {
    const ids = req.query.q.split(",");

    return { 
      items: await ORM.Product().where((p) => p.id.in(ids)).all()
    }
  }),
  get: handle("Failed to fetch product", (req: any) => S.productService.get(req.params.id)),
  create: handle("Failed to create product", (req: any) => S.productService.create(getUserId(req), req.body), 201),
  update: handle("Failed to update product", (req: any) =>
    S.productService.update(getUserId(req), req.params.id, req.body),
  ),
  remove: handle("Failed to delete product", (req: any) => S.productService.remove(getUserId(req), req.params.id)),
};
