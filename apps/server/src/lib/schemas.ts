import { z } from "zod";

/* ---------- shared ---------- */
export const IdParams = z.object({ id: z.uuid() });
export const ScanIdParams = z.object({ scanId: z.uuid() });
export const RoutineIdParams = z.object({ routineId: z.uuid() });
export const StepParams = z.object({
  routineId: z.uuid(),
  id: z.uuid(),
});

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});