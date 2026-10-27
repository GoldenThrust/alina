import { del, get, post, put } from "./api";


type RecommendationDTO = Omit<Recommendation, "createdAt"> & {
  createdAt: string;
};

type LogDTO = Omit<RoutineLog, "completedAt"> & { completedAt: string };
const toLog = (dto: LogDTO): RoutineLog => ({ ...dto, completedAt: new Date(dto.completedAt) });

const LOG_PAGE_SIZE = 100;
const LOG_MAX_PAGES = 10;

const toRecommendation = (
  dto: RecommendationDTO,
  routineId: string,
): Recommendation => ({
  ...dto,
  routineId: dto.routineId ?? routineId, // make sure the link back to the routine always exists
  createdAt: new Date(dto.createdAt),
});

export interface NewStepInput {
  period: RoutinePeriod;
  title: string;
  instruction: string;
  position: number;
  recommendationId?: string;
}

type RoutineDTO = Omit<Routine, "createdAt" | "recommendations"> & {
  createdAt: string;
  recommendations: RecommendationDTO[];
};

const toRoutine = (dto: RoutineDTO): Routine => ({
  ...dto,
  createdAt: new Date(dto.createdAt),
  steps: [...(dto.steps ?? [])].sort((a, b) => a.position - b.position),
  recommendations: (dto.recommendations ?? []).map((r) =>
    toRecommendation(r, dto.id),
  ),
});

export async function createRoutine(title: string): Promise<Routine> {
  return toRoutine(await post<RoutineDTO>("/routines", { title }));
}

export async function acceptRoutine(routineId: string): Promise<void> {
  await post(`/routines/${routineId}/accept`, {});
}

export async function deleteRoutine(routineId: string): Promise<void> {
  await del(`/routines/${routineId}`);
}

export async function createRoutineStep(
  routineId: string,
  input: NewStepInput,
): Promise<RoutineStep> {
  return post<RoutineStep>(`/routines/${routineId}/steps`, input);
}

export async function deleteRoutineStep(
  routineId: string,
  stepId: string,
): Promise<void> {
  await del(`/routines/${routineId}/steps/${stepId}`);
}

export async function reorderRoutineSteps(
  routineId: string,
  steps: { id: string; position: number }[],
): Promise<void> {
  await put(`/routines/${routineId}/steps/reorder`, steps);
}


export interface RoutinePage {
  routines: Routine[];
  /** The recommendations that were nested inside the routines. */
  recommendations: Recommendation[];
}

/** All routines for the user, including suggested (not yet accepted) ones. */
export async function getRoutines(
  options: { signal?: AbortSignal } = {},
): Promise<RoutinePage> {
  const res = await get<{ items: RoutineDTO[] }>("/routines", {
    signal: options.signal,
    limit: 100,
  });
  const routines = res.items.map(toRoutine);
  return {
    routines,
    recommendations: routines.flatMap((r) =>
      r.recommendations.length > 0 ? r.recommendations : [],
    ),
  };
}


/** Logs from `startDate` (YYYY-MM-DD) onward. Follows the cursor until the window is loaded. */
export async function getRoutineLogs(
  options: { startDate?: string; routineId?: string; signal?: AbortSignal } = {},
): Promise<RoutineLog[]> {
  const { startDate, routineId, signal } = options;
  const logs: RoutineLog[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < LOG_MAX_PAGES; page++) {
    const res = await get<{ items: LogDTO[]; nextCursor?: string | null }>("/routines/logs", {
      limit: LOG_PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
      ...(startDate ? { startDate } : {}),
      ...(routineId ? { routineId } : {}),
      signal,
    });
    logs.push(...res.items.map(toLog));
    if (!res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return logs;
}

/** Marks a step as done. */
export async function createRoutineLog(
  routineStepId: string,
  completedAt: Date = new Date(),
): Promise<RoutineLog> {
  return toLog(
    await post<LogDTO>("/routines/logs", {
      routineStepId,
      completedAt: completedAt.toISOString(),
    }),
  );
}

/** Un-marks a step. Takes the log's id, not the step's. */
export async function deleteRoutineLog(logId: string): Promise<void> {
  await del(`/routines/logs/${logId}`);
}