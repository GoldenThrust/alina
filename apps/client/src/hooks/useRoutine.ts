import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";
import {
  acceptRoutine,
  createRoutine,
  createRoutineLog,
  createRoutineStep,
  deleteRoutine,
  deleteRoutineStep,
  getRoutineLogs,
  getRoutines,
  reorderRoutineSteps,
} from "../services/api/routine";
import { addDays, localDateKey } from "../utils/dates";
import { selectAll } from "../utils/entities";
import { isAbort } from "../utils/signal";
import { selectRoutines, useRoutineStore } from "../stores/routine.store";
import {
  selectRecommendations,
  useRecommendationStore,
} from "../stores/recommendation.store";
import { useProduct } from "./useProduct";
import { useRecommendations } from "./useRecommendations";
import { useProductStore } from "../stores/product.store";
import { acceptedRecommendation } from "../utils/recommendation";

export const ROUTINE_PERIODS: RoutinePeriod[] = [
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "NIGHT",
  "HABIT",
];

/** How far back to load logs. Streaks longer than this will be capped. */
const LOG_WINDOW_DAYS = 90;

// NewStep, StepSuggestion, CATEGORY_PERIODS, firstSentence, useStepSuggestions, useRoutineDay: unchanged


const firstSentence = (text: string, max = 60) => {
  const s = text.split(/(?<=[.!?])\s/)[0].trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/* ------------------------------ suggestions ------------------------------ */

const CATEGORY_PERIODS: Record<ProductCategory, RoutinePeriod[]> = {
  CLEANSER: ["MORNING", "EVENING"],
  TONER: ["MORNING", "EVENING"],
  SERUM: ["MORNING", "EVENING"],
  MOISTURIZER: ["MORNING", "EVENING", "NIGHT"],
  SUNSCREEN: ["MORNING", "AFTERNOON"],
  TREATMENT: ["EVENING", "NIGHT"],
  OTHER: ["MORNING", "AFTERNOON", "EVENING", "NIGHT"],
};



/** Which steps are ticked off today. Resets each day, kept per routine. */
export function useRoutineDay(routineId?: string) {
  const dayKey = localDateKey(new Date());
  const storageKey = routineId ? `routine-day:${routineId}:${dayKey}` : null;
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!storageKey) return setDone(new Set());
    try {
      setDone(new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]")));
    } catch {
      setDone(new Set());
    }
  }, [storageKey]);

  const commit = useCallback(
    (next: Set<string>) => {
      setDone(next);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* storage unavailable: state still works for this session */
      }
    },
    [storageKey],
  );

  const isDone = useCallback((id: string) => done.has(id), [done]);
  const toggle = useCallback(
    (id: string) => {
      const next = new Set(done);
      next.has(id) ? next.delete(id) : next.add(id);
      commit(next);
    },
    [done, commit],
  );
  const markAll = useCallback((ids: string[]) => commit(new Set([...done, ...ids])), [done, commit]);
  const clear = useCallback(
    (ids: string[]) => commit(new Set([...done].filter((id) => !ids.includes(id)))),
    [done, commit],
  );

  return { isDone, toggle, markAll, clear };
}

/* ------------------------------ loading ------------------------------ */

/** Loads routines and recent logs on every visit. Cached data keeps showing while it refreshes. */
export function useRoutineSync() {
  const hasRoutines = useRoutineStore((s) => s.routines.ids.length > 0);
  const [status, setStatus] = useState<Status>(
    hasRoutines ? "ready" : "loading",
  );
  /** True once this visit has fresh data from the server (guards against double-logging a day). */
  const [synced, setSynced] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setStatus((current) => (current === "ready" ? current : "loading"));
    try {
      const startDate = localDateKey(addDays(new Date(), -LOG_WINDOW_DAYS));
      const [page, logs] = await Promise.all([
        getRoutines({ signal }),
        getRoutineLogs({ startDate, signal }),
      ]);

      // Suggested routines arrive with their recommendations, so the step suggestions can use them
      useRecommendationStore
        .getState()
        .upsertRecommendations(page.recommendations);
      const routineStore = useRoutineStore.getState();
      routineStore.setRoutines(page.routines);
      routineStore.upsertLogs(logs);

      setStatus("ready");
      setSynced(true);
    } catch (err) {
      if (isAbort(err)) return;
      setStatus("loadError");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const retry = useCallback(() => void load(), [load]);

  return { status, synced, retry };
}

/** Loads the pending recommendations the "Add a step" modal suggests from. */
export function useSuggestionSources() {
  useProduct(); // PRODUCT recommendations and their products
  useRecommendations({ type: "HABIT", accepted: false });
  // useRecommendations({ type: "ROUTINE", accepted: false });
}

export function useStepSuggestions(
  period: RoutinePeriod,
  existingTitles: string[],
  activeRoutineId?: string,
): StepSuggestion[] {
  const recommendations = useRecommendationStore(useShallow(selectRecommendations));
  const routinesById = useRoutineStore((s) => s.routines.byId);
  const productsById = useProductStore((s) => s.products.byId);

  return useMemo(() => {
    const taken = new Set(existingTitles.map((t) => t.toLowerCase()));
    const out: StepSuggestion[] = [];
    const push = (s: StepSuggestion) => {
      const k = s.title.toLowerCase();
      if (taken.has(k)) return;
      taken.add(k);
      out.push(s);
    };

    for (const rec of recommendations) {
      if (rec.accepted) continue;

      if (rec.type === "PRODUCT" && rec.productId) {
        const product = productsById[rec.productId];
        if (!product || !CATEGORY_PERIODS[product.category].includes(period)) continue;
        push({
          key: rec.id,
          title: product.name,
          instruction: rec.explanation || product.description,
          recommendationId: rec.id,
          consumeRecommendation: true,
          source: "Product",
        });
      } else if (rec.type === "HABIT" && period === "HABIT") {
        push({
          key: rec.id,
          title: firstSentence(rec.explanation),
          instruction: rec.explanation,
          recommendationId: rec.id,
          consumeRecommendation: true,
          source: "Habit",
        });
      } else if (rec.type === "ROUTINE" && rec.routineId && rec.routineId !== activeRoutineId) {
        routinesById[rec.routineId]?.steps
          .filter((s) => s.period === period)
          .forEach((s) =>
            push({
              key: `${rec.id}:${s.id}`,
              title: s.title,
              instruction: s.instruction,
              recommendationId: rec.id,
              consumeRecommendation: false, // the routine itself stays suggested
              source: "Routine",
            }),
          );
      }
    }
    return out;
  }, [recommendations, routinesById, productsById, period, existingTitles, activeRoutineId]);
}


/* ------------------------------ active routine ------------------------------ */

export function useActiveRoutine() {
  const routines = useRoutineStore(useShallow(selectRoutines));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const routine =
    routines.find((r) => r.id === selectedId) ??
    routines.find((r) => r.recommendation) ??
    routines[0];

  /** Optimistic: flips immediately, rolls back if the server refuses. */
  const accept = useCallback(async () => {
  if (!routine || busy) return;
  const routineId = routine.id;
  const recStore = useRecommendationStore.getState();
  const rec = routine.recommendation ? recStore.recommendations.byId[routine.recommendation.id] : undefined;
  const flipRec = !!rec && !rec.accepted;

  setBusy(true);
  useRoutineStore.getState().setAccepted(routineId, true);
  if (flipRec) recStore.setAccepted(rec.id, true);
  try {
    await acceptRoutine(routineId);
  } catch {
    useRoutineStore.getState().setAccepted(routineId, false);
    if (flipRec) useRecommendationStore.getState().setAccepted(rec.id, false);
    toast.error("Couldn’t accept this routine. Please try again.");
  } finally {
    setBusy(false);
  }
}, [routine, busy]);


  /** Waits for the server so the new routine has its real id. Resolves true on success. */
  const create = useCallback(async (title: string): Promise<boolean> => {
    const clean = title.trim();
    if (!clean) return false;
    try {
      const created = await createRoutine(clean);
      useRoutineStore.getState().upsertRoutine(created);
      setSelectedId(created.id);
      return true;
    } catch {
      toast.error("Couldn’t create the routine. Please try again.");
      return false;
    }
  }, []);

  /** Deletes the routine (or dismisses a suggested one) and its linked recommendations. */
  const remove = useCallback(async () => {
    if (!routine) return;
    const snapshot = routine;
    const recStore = useRecommendationStore.getState();
    const linked = selectAll(recStore.recommendations).filter(
      (r) => r.routineId === snapshot.id,
    );

    useRoutineStore.getState().removeRoutine(snapshot.id);
    linked.forEach((r) => recStore.remove(r.id));
    setSelectedId(null);

    try {
      await deleteRoutine(snapshot.id);
    } catch {
      useRoutineStore.getState().upsertRoutine(snapshot);
      useRecommendationStore.getState().upsertRecommendations(linked);
      setSelectedId(snapshot.id);
      toast.error("Couldn’t delete the routine. Please try again.");
    }
  }, [routine]);

  return {
    routine,
    routines,
    selectRoutine: setSelectedId,
    accept,
    create,
    remove,
    busy,
  };
}

/* ---------------------------------- steps ---------------------------------- */

export function useRoutineSteps(routine: Routine | undefined) {
  const routineId = routine?.id;
  const accepted = acceptedRecommendation(routine);
  const steps = useMemo(() => routine?.steps ?? [], [routine]);

  // Accepted routines show every period so a step can be added anywhere.
  const periods = useMemo(
    () =>
      accepted
        ? ROUTINE_PERIODS
        : ROUTINE_PERIODS.filter((p) => steps.some((s) => s.period === p)),
    [accepted, steps],
  );

  const stepsFor = useCallback(
    (period: RoutinePeriod) => steps.filter((s) => s.period === period),
    [steps],
  );

  /** Waits for the server. Passing the recommendation id lets it mark that recommendation accepted. */
  const addStep = useCallback(
    async (input: NewStep): Promise<boolean> => {
      if (!routineId || !input.title.trim()) return false;
      const position =
        steps.reduce((max, s) => Math.max(max, s.position), -1) + 1;
      const consumed = input.consumeRecommendation
        ? input.recommendationId
        : undefined;

      try {
        const step = await createRoutineStep(routineId, {
          period: input.period,
          title: input.title.trim(),
          instruction: input.instruction.trim(),
          position,
          ...(consumed ? { recommendationId: consumed } : {}),
        });
        useRoutineStore.getState().upsertStep(step);
        if (consumed)
          useRecommendationStore.getState().setAccepted(consumed, true);
        return true;
      } catch {
        toast.error("Couldn’t add that step. Please try again.");
        return false;
      }
    },
    [routineId, steps],
  );

  const removeStep = useCallback(
    async (stepId: string) => {
      const snapshot = steps.find((s) => s.id === stepId);
      if (!routineId || !snapshot) return;

      useRoutineStore.getState().removeStep(routineId, stepId);
      try {
        await deleteRoutineStep(routineId, stepId);
      } catch {
        useRoutineStore.getState().upsertStep(snapshot);
        toast.error("Couldn’t remove that step.");
      }
    },
    [routineId, steps],
  );

  /** Swaps with the neighbour inside the same period. Optimistic, with rollback. */
  const moveStep = useCallback(
    async (stepId: string, direction: -1 | 1) => {
      const current = steps.find((s) => s.id === stepId);
      if (!routineId || !current) return;
      const siblings = steps.filter((s) => s.period === current.period);
      const target =
        siblings[siblings.findIndex((s) => s.id === stepId) + direction];
      if (!target) return;

      const { upsertStep } = useRoutineStore.getState();
      upsertStep({ ...current, position: target.position });
      upsertStep({ ...target, position: current.position });
      try {
        await reorderRoutineSteps(routineId, [
          { id: current.id, position: target.position },
          { id: target.id, position: current.position },
        ]);
      } catch {
        upsertStep(current);
        upsertStep(target);
        toast.error("Couldn’t reorder those steps.");
      }
    },
    [routineId, steps],
  );

  return { steps, periods, stepsFor, addStep, removeStep, moveStep };
}

/* ------------------------------ streak & logs ------------------------------ */

export function useRoutineLogs(routine: Routine | undefined) {
  const routineId = routine?.id;
  const logs = useRoutineStore((s) => s.logs);
  const logging = useRef(false);

  const days = useMemo(() => {
    const set = new Set<string>();
    for (const log of selectAll(logs)) {
      if (routineId && log.routineId !== routineId) continue;
      set.add(localDateKey(log.createdAt));
    }
    return set;
  }, [logs, routineId]);

  const todayKey = localDateKey(new Date());
  const loggedToday = days.has(todayKey);

  const streak = useMemo(() => {
    let cursor = new Date();
    if (!days.has(localDateKey(cursor))) cursor = addDays(cursor, -1);
    let n = 0;
    while (days.has(localDateKey(cursor))) {
      n++;
      cursor = addDays(cursor, -1);
    }
    return n;
  }, [days]);

  const completionRate = useMemo(() => {
    const today = new Date();
    let hit = 0;
    for (let i = 0; i < 30; i++)
      if (days.has(localDateKey(addDays(today, -i)))) hit++;
    return hit / 30;
  }, [days]);

  const week = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      const key = localDateKey(date);
      return {
        key,
        label: date
          .toLocaleDateString(undefined, { weekday: "short" })
          .slice(0, 1),
        hit: days.has(key),
        today: key === todayKey,
      };
    });
  }, [days, todayKey]);

  /** Records today's completion once. The ref stops overlapping requests. */
  const logToday = useCallback(async () => {
    if (!routine || loggedToday || logging.current) return;
    logging.current = true;
    try {
      const log = await createRoutineLog(routine.id);
      useRoutineStore.getState().addLog(log);
    } catch {
      toast.error("Couldn’t save today’s progress.", { id: "routine-log" });
    } finally {
      logging.current = false;
    }
  }, [routine, loggedToday]);

  return { streak, completionRate, loggedToday, week, logToday };
}
