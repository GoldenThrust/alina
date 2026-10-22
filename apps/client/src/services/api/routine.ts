import { del, get, post } from "./api";

const toLog = (dto: LogDTO): RoutineLog => ({ ...dto, createdAt: new Date(dto.createdAt) });


type RecommendationDTO = Omit<Recommendation, "createdAt"> & { createdAt: string };
type RoutineDTO = Omit<Routine, "createdAt" | "recommendation"> & {
  createdAt: string;
  recommendation: RecommendationDTO | null;
};
type LogDTO = Omit<RoutineLog, "createdAt"> & { createdAt: string };

const toRecommendation = (dto: RecommendationDTO, routineId: string): Recommendation => ({
  ...dto,
  routineId: dto.routineId ?? routineId, // make sure the link back to the routine always exists
  createdAt: new Date(dto.createdAt),
});

const toRoutine = (dto: RoutineDTO): Routine => ({
  ...dto,
  createdAt: new Date(dto.createdAt),
  steps: [...(dto.steps ?? [])].sort((a, b) => a.position - b.position),
  recommendation: dto.recommendation ? toRecommendation(dto.recommendation, dto.id) : null,
});


export interface NewStepInput {
  period: RoutinePeriod;
  title: string;
  instruction: string;
  position: number;
  recommendationId?: string;
}


/** Completion logs from `startDate` (YYYY-MM-DD) onward. */
export async function getRoutineLogs(
  options: { startDate?: string; signal?: AbortSignal } = {},
): Promise<RoutineLog[]> {
  const { startDate, signal } = options;
  const res = await get<{ items: LogDTO[] }>("/routines/logs", {
    ...(startDate ? { startDate } : {}),
    limit: 100,
    signal,
  });
  return res.items.map(toLog);
}

export async function createRoutine(title: string): Promise<Routine> {
  return toRoutine(await post<RoutineDTO>("/routines", { title }));
}

export async function acceptRoutine(routineId: string): Promise<void> {
  await post(`/routines/${routineId}/accept`, {});
}

export async function deleteRoutine(routineId: string): Promise<void> {
  await del(`/routines/${routineId}`);
}

export async function createRoutineStep(routineId: string, input: NewStepInput): Promise<RoutineStep> {
  return post<RoutineStep>(`/routines/${routineId}/steps`, input);
}

export async function deleteRoutineStep(routineId: string, stepId: string): Promise<void> {
  await del(`/routines/${routineId}/steps/${stepId}`);
}

export async function reorderRoutineSteps(
  routineId: string,
  steps: { id: string; position: number }[],
): Promise<void> {
  await post(`/routines/${routineId}/steps/reorder`, { steps });
}

/** Records that the routine was completed today. */
export async function createRoutineLog(routineId: string): Promise<RoutineLog> {
  return toLog(await post<LogDTO>(`/routines/${routineId}/logs`, {}));
}

export interface RoutinePage {
  routines: Routine[];
  /** The recommendations that were nested inside the routines. */
  recommendations: Recommendation[];
}

/** All routines for the user, including suggested (not yet accepted) ones. */
export async function getRoutines(options: { signal?: AbortSignal } = {}): Promise<RoutinePage> {
  const res = await get<{ items: RoutineDTO[] }>("/routines", { signal: options.signal });
  const routines = res.items.map(toRoutine);
  return {
    routines,
    recommendations: routines.flatMap((r) => (r.recommendation ? [r.recommendation] : [])),
  };
}

// createRoutine still returns toRoutine(...). A routine the user creates has recommendation: null.