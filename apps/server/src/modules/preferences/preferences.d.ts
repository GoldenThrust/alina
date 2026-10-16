import type z from "zod";
import type { UpsertPreferenceBody } from "./preferences.schema";

export type UpsertPreferenceBody = z.infer<typeof UpsertPreferenceBody>;