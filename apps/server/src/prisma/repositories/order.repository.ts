import { BaseRepository } from "./base.repository";
import { OrderItemRepository } from "./order-item.repository";
import { ProductRepository } from "./product.repository";
import type { NewOrder, Order, OrderItem, Product } from "./types";

export type OrderWithItems = Order & {
  items: (OrderItem & { product: Product | null })[];
};

export class OrderRepository extends BaseRepository<Order, NewOrder> {
  protected readonly model = "Order";

  constructor(
    private readonly items: OrderItemRepository = new OrderItemRepository(),
    private readonly products: ProductRepository = new ProductRepository(),
  ) {
    super();
  }

  /** Creates an order and its items. The total is computed from product prices. */
  async createWithItems(data: {
    userId: string;
    items: { productId: string; quantity: number }[];
    paypalOrderId?: string | null;
  }): Promise<OrderWithItems> {
    let total = 0;
    const resolved: { product: Product; quantity: number }[] = [];
    for (const item of data.items) {
      const product = await this.products.findById(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found.`);
      total += (product.price ?? 0) * item.quantity;
      resolved.push({ product, quantity: item.quantity });
    }

    const order = await this.create({
      userId: data.userId,
      total: Number(total.toFixed(2)),
      paypalOrderId: data.paypalOrderId ?? null,
    });

    const items = await this.items.createMany(
      resolved.map(({ product, quantity }) => ({
        orderId: order.id,
        productId: product.id,
        quantity,
      })),
    );
    return {
      ...order,
      items: items.map((item) => ({
        ...item,
        product: resolved.find((r) => r.product.id === item.productId)!
          .product,
      })),
    };
  }

  async findWithItems(id: string): Promise<OrderWithItems | null> {
    const order = await this.findById(id);
    return order ? this.attachItems(order) : null;
  }

  async listForUser(userId: string, limit = 20): Promise<OrderWithItems[]> {
    const orders = await this.findMany(
      { userId },
      { limit, orderBy: { field: "createdAt" } },
    );
    return Promise.all(orders.map((order) => this.attachItems(order)));
  }

  findByPaypalOrderId(paypalOrderId: string) {
    return this.findOne({ paypalOrderId });
  }

  async deleteWithItems(id: string): Promise<void> {
    await this.items.deleteWhere({ orderId: id });
    await this.delete(id);
  }

  private async attachItems(order: Order): Promise<OrderWithItems> {
    const items = await this.items.listByOrder(order.id);
    return {
      ...order,
      items: await Promise.all(
        items.map(async (item) => ({
          ...item,
          product: await this.products.findById(item.productId),
        })),
      ),
    };
  }
}
