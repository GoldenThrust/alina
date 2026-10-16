import type z from "zod";
import type { CreateMessageBody } from "./messages.schema";

export type CreateMessageBody = z.infer<typeof CreateMessageBody>;