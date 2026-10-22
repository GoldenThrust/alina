import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { addDays, localDateKey, newestFirst } from "../utils/dates";
import {
  emptyEntities,
  patchOne,
  removeMany,
  removeOne,
  selectAll,
  setAll,
  upsertMany,
  upsertOne,
} from "../utils/entities";
import { MOCK_ROUTINE_LOGS, MOCK_ROUTINES } from "../data/routine";

const byPosition = (a: RoutineStep, b: RoutineStep) => a.position - b.position;

export const useRoutineStore = create<RoutineState>()((set) => ({
  routines: emptyEntities(),
  logs: emptyEntities(),

  setRoutines: (routines) => set({ routines: setAll(routines) }),
  upsertLogs: (logs) =>
    set((s) => ({ logs: upsertMany(s.logs, logs) })),
  upsertRoutine: (routine) =>
    set((s) => ({
      routines: upsertOne(s.routines, {
        ...routine,
        steps: [...routine.steps].sort(byPosition),
      }),
    })),
  removeRoutine: (routineId) =>
    set((s) => ({
      routines: removeOne(s.routines, routineId),
      logs: removeMany(
        s.logs,
        selectAll(s.logs)
          .filter((l) => l.routineId === routineId)
          .map((l) => l.id),
      ),
    })),
  setAccepted: (routineId, accepted) =>
    set((s) => ({ routines: patchOne(s.routines, routineId, { accepted }) })),
  upsertStep: (step) =>
    set((s) => {
      const routine = s.routines.byId[step.routineId];
      if (!routine) return s;
      const steps = [
        ...routine.steps.filter((x) => x.id !== step.id),
        step,
      ].sort(byPosition);
      return { routines: patchOne(s.routines, routine.id, { steps }) };
    }),
  removeStep: (routineId, stepId) =>
    set((s) => {
      const routine = s.routines.byId[routineId];
      if (!routine) return s;
      return {
        routines: patchOne(s.routines, routineId, {
          steps: routine.steps.filter((x) => x.id !== stepId),
        }),
      };
    }),

  setLogs: (logs) => set({ logs: setAll(logs) }),
  addLog: (log) => set((s) => ({ logs: upsertOne(s.logs, log) })),
  removeLog: (logId) => set((s) => ({ logs: removeOne(s.logs, logId) })),
  clear: () => set({ routines: emptyEntities(), logs: emptyEntities() }),
  setDemoRoutines: () => {
    useRoutineStore.getState().setRoutines(MOCK_ROUTINES);
    useRoutineStore.getState().setLogs(MOCK_ROUTINE_LOGS);
  },
}));

/* ------------------------------ selectors ------------------------------ */

export const selectRoutines = (s: RoutineState) =>
  selectAll(s.routines).sort(newestFirst((r) => r.createdAt));

export const selectAcceptedRoutines = (s: RoutineState) =>
  selectRoutines(s).filter((r) => r.accepted);

export const selectSuggestedRoutines = (s: RoutineState) =>
  selectRoutines(s).filter((r) => !r.accepted);

export const selectRoutinesByPeriod = (
  s: RoutineState,
  period: RoutinePeriod,
) =>
  selectAcceptedRoutines(s).filter((r) =>
    r.steps.some((step) => step.period === period),
  );

const loggedDays = (s: RoutineState, routineId?: string): Set<string> => {
  const days = new Set<string>();
  for (const log of selectAll(s.logs)) {
    if (routineId && log.routineId !== routineId) continue;
    days.add(localDateKey(log.createdAt));
  }
  return days;
};

export const selectLoggedToday = (s: RoutineState, routineId?: string) =>
  loggedDays(s, routineId).has(localDateKey(new Date()));

/** Consecutive days with a log, counting back from today (or yesterday). */
export function selectStreak(s: RoutineState, routineId?: string): number {
  const days = loggedDays(s, routineId);
  let cursor = new Date();
  if (!days.has(localDateKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Share of the last `window` days with at least one log, 0 to 1. */
export function selectCompletionRate(
  s: RoutineState,
  routineId?: string,
  window = 30,
): number {
  const days = loggedDays(s, routineId);
  const today = new Date();
  let hit = 0;
  for (let i = 0; i < window; i++) {
    if (days.has(localDateKey(addDays(today, -i)))) hit++;
  }
  return hit / window;
}

/* ------------------------------ hooks ------------------------------ */

export const useAcceptedRoutines = () =>
  useRoutineStore(useShallow(selectAcceptedRoutines));
export const useSuggestedRoutines = () =>
  useRoutineStore(useShallow(selectSuggestedRoutines));
export const useStreak = (routineId?: string) =>
  useRoutineStore((s) => selectStreak(s, routineId));
