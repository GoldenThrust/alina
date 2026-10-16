import type z from "zod";
import type { CreateRoutineBody, CreateRoutineLogBody, CreateStepBody, UpdateRoutineBody, UpdateRoutineLogBody, UpdateStepBody } from "./routines.schema";

export type CreateRoutineBody = z.infer<typeof CreateRoutineBody>;
export type UpdateRoutineBody = z.infer<typeof UpdateRoutineBody>;

export type CreateStepBody = z.infer<typeof CreateStepBody>;
export type UpdateStepBody = z.infer<typeof UpdateStepBody>;
export type CreateRoutineLogBody = z.infer<typeof CreateRoutineLogBody>;
export type UpdateRoutineLogBody = z.infer<typeof UpdateRoutineLogBody>;