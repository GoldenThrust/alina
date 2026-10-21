import path from "path";
import { assertOwned, createOwnedService } from "../../lib/crud";
import APIError from "../../errors/APIError";
import { ORM } from "../../prisma/db";

const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");

const recommendationBase = createOwnedService({
  label: "Recommendation",
  model: ORM.Recommendation,
  createFields: ["type", "explanation", "scanId", "productId", "routineId"],
  updateFields: ["accepted"],
  filterFields: ["type", "accepted"],
  prepareCreate: async (userId, data) => {
    if (data.scanId) await assertOwned(ORM.Scan, data.scanId, userId, "Scan");
    if (data.routineId) await assertOwned(ORM.Routine, data.routineId, userId, "Routine");
    if (data.productId) {
      const product = await ORM.Product().where({ id: data.productId }).first();
      if (!product) throw new APIError("Product not found", 404);
    }
    return data;
  },
});

/* ===================== Recommendation ===================== */
export const recommendationService =  {
  ...recommendationBase
}