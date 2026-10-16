import type z from "zod";
import type { UpsertAnalysisBody } from "./scans.schema";

export type UpsertAnalysisBody = z.infer<typeof UpsertAnalysisBody>;