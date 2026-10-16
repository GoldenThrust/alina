import { BaseRepository } from "./base.repository";
import type { NewOrderItem, OrderItem } from "./types";

export class OrderItemRepository extends BaseRepository<
  OrderItem,
  NewOrderItem
> {
  protected readonly model = "OrderItem";

  listByOrder(orderId: string) {
    return this.findMany({ orderId });
  }
}
