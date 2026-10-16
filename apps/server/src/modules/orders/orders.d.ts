import type z from "zod";
import type { CreateOrderBody, UpdateOrderBody } from "./orders.schema";

export type CreateOrderBody = z.infer<typeof CreateOrderBody>;
export type UpdateOrderBody = z.infer<typeof UpdateOrderBody>;