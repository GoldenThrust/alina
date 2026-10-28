import { z } from "zod";
import { PaginationQuery } from "../../lib/schemas";
const score = z.number().min(0).max(100);

/* ---------- enums (match prisma enums) ---------- */
export const ScanStatus = z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);

export const ListScansQuery = PaginationQuery.extend({ status: ScanStatus.optional() });
export const historyQuery =  z.object({ startDate: z.date().optional() });
export const UpsertAnalysisBody = z.object({
  redness: score.optional(),
  ageSpot: score.optional(),
  radiance: score.optional(),
  moisture: score.optional(),
  oiliness: score.optional(),
  darkCircle: score.optional(),
  eyeBag: score.optional(),
  droopyUpperEyelid: score.optional(),
  droopyLowerEyelid: score.optional(),
  firmness: score.optional(),
  acne: score.optional(),
  tearTrough: score.optional(),
  texture: z.record(z.any(), z.number().min(0).max(100)).optional(),
  pore: z.record(z.any(), z.number().min(0).max(100)).optional(),
  wrinkle: z.record(z.any(), z.number().min(0).max(100)).optional(),
  skinType: z.record(z.any(), z.number().min(0).max(100)).optional(),
});

export const ScanIdParams = z.object({ scanId: z.uuid() });