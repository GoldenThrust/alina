import path from "path";
import { createOwnedService } from "../../lib/crud";
import { ORM } from "../../prisma/db";


/* ===================== Message ===================== */
export const messageService = createOwnedService({
  label: "Message",
  model: ORM.Message,
  createFields: ["content"],
  updateFields: [],
  prepareCreate: async (_userId, data) => ({ ...data, sender: "USER" }),
});
