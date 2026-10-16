import { z } from "zod";

/* ---------- Order ---------- */
export const CreateOrderBody = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1),
});
export const UpdateOrderBody = z.object({ paypalOrderId: z.string().min(1) });
