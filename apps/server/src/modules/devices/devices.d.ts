import type z from "zod";
import type { CreateDeviceBody, UpdateDeviceBody } from "./devices.schema";

export type CreateDeviceBody = z.infer<typeof CreateDeviceBody>;
export type UpdateDeviceBody = z.infer<typeof UpdateDeviceBody>;
