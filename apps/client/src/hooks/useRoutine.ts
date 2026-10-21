import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { addDays, localDateKey } from "../utils/dates";
import { selectAll } from "../utils/entities";
import { selectRoutines, useRoutineStore } from "../stores/routine.store";
import { selectRecommendations, useRecommendationStore } from "../stores/recommendation.store";
import { useAuthStore } from "../stores/auth.store";
import { useProductStore } from "../stores/product.store";

export const ROUTINE_PERIODS: RoutinePeriod[] = ["MORNING", "AFTERNOON", "EVENING", "NIGHT", "HABIT"];

const uid = () => crypto.randomUUID();

export interface NewStep {
  period: RoutinePeriod;
  title: string;
  instruction: string;
  recommendationId?: string;
  consumeRecommendation?: boolean;
}

export interface StepSuggestion {
  key: string;
  title: string;
  instruction: string;
  recommendationId: string;
  consumeRecommendation: boolean;
  source: "Product" | "Habit" | "Routine";
}

/* ------------------------------ active routine ------------------------------ */

export function useActiveRoutine() {
  const routines = useRoutineStore(useShallow(selectRoutines));
  const userId = useAuthStore((s) => s.user?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const routine =
    routines.find((r) => r.id === selectedId) ??
    routines.find((r) => r.accepted) ??
    routines[0];

  const accept = useCallback(() => {
    if (!routine) return;
    // TODO(api): persist, roll back with setAccepted(id, false) on failure.
    useRoutineStore.getState().setAccepted(routine.id, true);
    const recs = selectAll(useRecommendationStore.getState().recommendations);
    recs
      .filter((r) => r.type === "ROUTINE" && r.routineId === routine.id)
      .forEach((r) => useRecommendationStore.getState().setAccepted(r.id, true));
  }, [routine]);

  const create = useCallback(
    (title: string) => {
      const clean = title.trim();
      if (!clean || !userId) return;
      const next: Routine = {
        id: uid(),
        userId,
        title: clean,
        accepted: true,
        createdAt: new Date(),
        steps: [],
      };
      // TODO(api): POST routine
      useRoutineStore.getState().upsertRoutine(next);
      setSelectedId(next.id);
    },
    [userId],
  );

  const rename = useCallback(
    (title: string) => {
      if (!routine || !title.trim()) return;
      useRoutineStore.getState().upsertRoutine({ ...routine, title: title.trim() });
    },
    [routine],
  );

  /** Deletes the routine (or dismisses a suggested one) and its linked recommendation. */
  const remove = useCallback(() => {
    if (!routine) return;
    // TODO(api): DELETE routine
    useRoutineStore.getState().removeRoutine(routine.id);
    const recStore = useRecommendationStore.getState();
    selectAll(recStore.recommendations)
      .filter((r) => r.routineId === routine.id)
      .forEach((r) => recStore.remove(r.id));
    setSelectedId(null);
  }, [routine]);

  return { routine, routines, selectRoutine: setSelectedId, accept, create, rename, remove };
}

/* ---------------------------------- steps ---------------------------------- */

export function useRoutineSteps(routine: Routine | undefined) {
  const routineId = routine?.id;
  const accepted = !!routine?.accepted;
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

  const addStep = useCallback(
    (input: NewStep) => {
      if (!routineId || !input.title.trim()) return;
      const position = steps.reduce((max, s) => Math.max(max, s.position), -1) + 1;
      const step: RoutineStep = {
        id: uid(),
        routineId,
        period: input.period,
        title: input.title.trim(),
        instruction: input.instruction.trim(),
        position,
      };
      // TODO(api): POST step
      useRoutineStore.getState().upsertStep(step);
      if (input.recommendationId && input.consumeRecommendation) {
        useRecommendationStore.getState().setAccepted(input.recommendationId, true);
      }
    },
    [routineId, steps],
  );

  const removeStep = useCallback(
    (stepId: string) => {
      if (!routineId) return;
      // TODO(api): DELETE step
      useRoutineStore.getState().removeStep(routineId, stepId);
    },
    [routineId],
  );

  /** Swap with the neighbour inside the same period. */
  const moveStep = useCallback(
    (stepId: string, direction: -1 | 1) => {
      const current = steps.find((s) => s.id === stepId);
      if (!current) return;
      const siblings = steps.filter((s) => s.period === current.period);
      const target = siblings[siblings.findIndex((s) => s.id === stepId) + direction];
      if (!target) return;
      const { upsertStep } = useRoutineStore.getState();
      upsertStep({ ...current, position: target.position });
      upsertStep({ ...target, position: current.position });
    },
    [steps],
  );

  return { steps, periods, stepsFor, addStep, removeStep, moveStep };
}

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

const firstSentence = (text: string, max = 60) => {
  const s = text.split(/(?<=[.!?])\s/)[0].trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/**
 * Step ideas for a period, built only from pending recommendations:
 *  - PRODUCT recommendations whose category fits the period
 *  - HABIT recommendations (HABIT period)
 *  - steps of other ROUTINE recommendations for that period
 */
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

/* ------------------------------ today's ticks ------------------------------ */

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

/* ------------------------------ streak & logs ------------------------------ */

export function useRoutineLogs(routine: Routine | undefined) {
  const routineId = routine?.id;
  const logs = useRoutineStore((s) => s.logs);

  const days = useMemo(() => {
    const set = new Set<string>();
    for (const log of selectAll(logs)) {
      if (routineId && log.routineId !== routineId) continue;
      set.add(localDateKey(log.completedAt));
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
    for (let i = 0; i < 30; i++) if (days.has(localDateKey(addDays(today, -i)))) hit++;
    return hit / 30;
  }, [days]);

  const week = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      const key = localDateKey(date);
      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1),
        hit: days.has(key),
        today: key === todayKey,
      };
    });
  }, [days, todayKey]);

  const logToday = useCallback(() => {
    if (!routine || loggedToday) return;
    // TODO(api): POST log
    useRoutineStore.getState().addLog({
      id: uid(),
      userId: routine.userId,
      routineId: routine.id,
      completedAt: new Date(),
    });
  }, [routine, loggedToday]);

  return { streak, completionRate, loggedToday, week, logToday };
}