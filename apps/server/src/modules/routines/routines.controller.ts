import { createOwnedHandlers, getUserId, handle } from "../../lib/crud";
import * as S from "./routines.service"

/* ---------- plain owner-scoped CRUD ---------- */
export const routineController = createOwnedHandlers(S.routineService as any, "routine");
export const routineLogController = createOwnedHandlers(S.routineLogService, "routine log");


/* ---------- RoutineStep (nested under a routine) ---------- */
export const stepController = {
  list: handle("Failed to fetch steps", (req: any) =>
    S.stepService.list(getUserId(req), req.params.routineId),
  ),
  get: handle("Failed to fetch step", (req: any) =>
    S.stepService.get(getUserId(req), req.params.routineId, req.params.id),
  ),
  create: handle(
    "Failed to create step",
    (req: any) => S.stepService.create(getUserId(req), req.params.routineId, req.body),
    201,
  ),
  update: handle("Failed to update step", (req: any) =>
    S.stepService.update(getUserId(req), req.params.routineId, req.params.id, req.body),
  ),
  remove: handle("Failed to delete step", (req: any) =>
    S.stepService.remove(getUserId(req), req.params.routineId, req.params.id),
  ),
};
