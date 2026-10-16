import path from "path";
import { assertOwned, createOwnedService } from "../../lib/crud";
import { ORM } from "../../prisma/db";
import type { CreateOrderBody } from "./orders";
import APIError from "../../errors/APIError";

const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");



/* ===================== Order ===================== */
const orderBase = createOwnedService({
  label: "Order",
  model: ORM.Order,
  createFields: [],
  updateFields: ["paypalOrderId"],
});

export const orderService = {
  list: orderBase.list,

  async get(userId: string, id: string) {
    const order = await assertOwned(ORM.Order, id, userId, "Order");
    const items = await ORM.OrderItem().where({ orderId: id }).all();
    return { ...order, items };
  },

  /** Total is computed server-side from Product.price - never trust a client total. */
  async create(userId: string, payload: CreateOrderBody) {
    const ids = [...new Set(payload.items.map((i) => i.productId))];
    const products = await Promise.all(
      ids.map((id) => ORM.Product().where({ id }).first()),
    );
    const priceById = new Map<string, number>();
    products.forEach((p: any, i: number) => {
      if (!p) throw new APIError(`Product ${ids[i]} not found`, 404);
      if (p.price == null) throw new APIError(`${p.name} is not purchasable`, 400);
      priceById.set(p.id, p.price);
    });

    const total = payload.items.reduce(
      (sum, i) => sum + priceById.get(i.productId)! * i.quantity,
      0,
    );

    // TODO: wrap in a transaction if your ORM supports it
    const order = await ORM.Order().create({
      userId,
      total: Math.round(total * 100) / 100,
    });
    const items = await Promise.all(
      payload.items.map((i) =>
        ORM.OrderItem().create({
          orderId: order.id,
          productId: i.productId,
          quantity: i.quantity,
        }),
      ),
    );
    return { ...order, items };
  },

  /** Attach the PayPal order id. TODO: verify it with PayPal's API before saving. */
  update: orderBase.update,

  async remove(userId: string, id: string) {
    const order = await assertOwned(ORM.Order, id, userId, "Order");
    if (order.paypalOrderId) {
      throw new APIError("Paid orders can't be deleted", 409);
    }
    await ORM.OrderItem().where({ orderId: id }).delete();
    await ORM.Order().where({ id, userId }).delete();
    return { message: "Order deleted successfully" };
  },
};
