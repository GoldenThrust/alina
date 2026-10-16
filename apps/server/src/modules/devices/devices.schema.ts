import { z } from "zod";

export const DeviceType = z.enum(["RING", "MOBILE", "WEB"]);

/* ---------- ConnectedDevice ---------- */
export const CreateDeviceBody = z.object({
  type: DeviceType,
  externalId: z.string().min(1),
  name: z.string().min(1),
});
export const UpdateDeviceBody = z.object({
  externalId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
});