import path from "path";
import { createOwnedService } from "../../lib/crud";
import { ORM } from "../../prisma/db";

const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");


/* ===================== ConnectedDevice ===================== */
export const deviceService = createOwnedService({
  label: "Device",
  model: ORM.Device,
  createFields: ["type", "externalId", "name"],
  updateFields: ["externalId", "name"],
  filterFields: ["type"],
});
