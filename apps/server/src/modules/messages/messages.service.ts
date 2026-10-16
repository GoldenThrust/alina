import path from "path";
import { createOwnedService } from "../../lib/crud";
import { ORM } from "../../prisma/db";

const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");


/* ===================== Message ===================== */
export const messageService = createOwnedService({
  label: "Message",
  model: ORM.Message,
  createFields: ["content"],
  updateFields: [],
  prepareCreate: async (_userId, data) => ({ ...data, sender: "USER" }),
});
