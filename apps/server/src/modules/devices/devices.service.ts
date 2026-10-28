import path from "path";
import { createOwnedService } from "../../lib/crud";
import { ORM } from "../../prisma/db";


/* ===================== ConnectedDevice ===================== */
export const deviceService = createOwnedService({
  label: "Device",
  model: ORM.Device,
  createFields: ["type", "externalId", "name"],
  updateFields: ["externalId", "name"],
  filterFields: ["type"],
});
