import { z } from "zod";
import { PaginationQuery } from "../../lib/schemas";

export const RoutinePeriod = z.enum([
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "NIGHT",
  "HABIT",
]);

/* ---------- Routine ---------- */
export const CreateRoutineBody = z.object({
  title: z.string().min(1).max(120),
  accepted: z.boolean().optional(),
});
export const UpdateRoutineBody = CreateRoutineBody.partial();

/* ---------- RoutineStep ---------- */
export const CreateStepBody = z.object({
  period: RoutinePeriod,
  title: z.string().min(1).max(120),
  instruction: z.string().min(1),
  position: z.number().int().min(0).optional(), // defaults to end of list
});
export const UpdateStepBody = CreateStepBody.partial();

/* ---------- RoutineLog ---------- */
export const CreateRoutineLogBody = z.object({
  routineStepId: z.uuid(),
  completedAt: z.coerce.date().optional(),
});

export const UpdateRoutineLogBody = z.object({ completedAt: z.coerce.date() });

export const ListRoutineLogsQuery = PaginationQuery.extend({
  routineId: z.uuid().optional(),
  startDate: z.coerce.date().optional(),
});

export const RoutineIdParams = z.object({ routineId: z.uuid() });

export const StepParams = z.object({
  routineId: z.uuid(),
  id: z.uuid(),
});
