import { del, get, post, put } from "../../lib/api";

/* =====================================================================
 * Routines  —  /routines
 * ===================================================================== */
 
export const listRoutines = (params?: PaginationParams) =>
  get<Paginated<Routine>>("/routines", params);
export const getRoutine = (id: ID) => get<Routine>(`/routines/${id}`);
export const createRoutine = (body: CreateRoutineBody) => post<Routine>("/routines", body);
export const updateRoutine = (id: ID, body: UpdateRoutineBody) =>
  put<Routine>(`/routines/${id}`, body);
export const deleteRoutine = (id: ID) => del(`/routines/${id}`);
 
/* ---------- Routine steps ---------- */
 
export const listSteps = (routineId: ID) => get<RoutineStep[]>(`/routines/${routineId}/steps`);
export const getStep = (routineId: ID, id: ID) =>
  get<RoutineStep>(`/routines/${routineId}/steps/${id}`);
export const createStep = (routineId: ID, body: CreateStepBody) =>
  post<RoutineStep>(`/routines/${routineId}/steps`, body);
export const updateStep = (routineId: ID, id: ID, body: UpdateStepBody) =>
  put<RoutineStep>(`/routines/${routineId}/steps/${id}`, body);
export const deleteStep = (routineId: ID, id: ID) => del(`/routines/${routineId}/steps/${id}`);
 
/* ---------- Routine logs ---------- */
 
export const listRoutineLogs = (params?: ListRoutineLogsParams) =>
  get<Paginated<RoutineLog>>("/routines/logs", params);
export const getRoutineLog = (id: ID) => get<RoutineLog>(`/routines/logs/${id}`);
export const createRoutineLog = (body: CreateRoutineLogBody) =>
  post<RoutineLog>("/routines/logs", body);
export const updateRoutineLog = (id: ID, body: UpdateRoutineLogBody) =>
  put<RoutineLog>(`/routines/logs/${id}`, body);
export const deleteRoutineLog = (id: ID) => del(`/routines/logs/${id}`);
 