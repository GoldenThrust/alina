import { useCallback, useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

// Assumed endpoints (adjust to your backend):
//   GET   /api/routines/active            -> Routine (with steps) | 404/204 when none
//   PATCH /api/routines/:id/accept        -> Routine
//   GET   /api/routines/:id/logs          -> RoutineLog[]
//   POST  /api/routines/:id/logs          -> RoutineLog   (server sets userId, completedAt = now)

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export const dayKey = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function useRoutine() {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const active = await request<Routine>("/api/routines/active");
      setRoutine(active);
      if (active) {
        const history = await request<RoutineLog[]>(`/api/routines/${active.id}/logs`);
        setLogs(history ?? []);
      } else {
        setLogs([]);
      }
      setError(null);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = useCallback(async () => {
    if (!routine) return;
    setBusy(true);
    try {
      const updated = await request<Routine>(`/api/routines/${routine.id}/accept`, {
        method: "PATCH",
      });
      if (updated) setRoutine(updated);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept routine");
    } finally {
      setBusy(false);
    }
  }, [routine]);

  const logCompletion = useCallback(async () => {
    if (!routine) return;
    try {
      const log = await request<RoutineLog>(`/api/routines/${routine.id}/logs`, {
        method: "POST",
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
      if (log) setLogs((current) => [...current, log]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save progress");
    }
  }, [routine]);

  // POST /api/routines/:id/steps -> RoutineStep (server may override position)
  const addStep = useCallback(
    async (step: Pick<RoutineStep, "period" | "title" | "instruction">) => {
      if (!routine) return false;
      const position = routine.steps.reduce((max, s) => Math.max(max, s.position), 0) + 1;
      setBusy(true);
      try {
        const created = await request<RoutineStep>(`/api/routines/${routine.id}/steps`, {
          method: "POST",
          body: JSON.stringify({ ...step, position }),
        });
        if (created) {
          setRoutine((current) =>
            current ? { ...current, steps: [...current.steps, created] } : current,
          );
        }
        setError(null);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add step");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [routine],
  );

  const loggedDays = useMemo(() => new Set(logs.map((l) => dayKey(l.completedAt))), [logs]);

  const streak = useMemo(() => {
    const cursor = new Date();
    // Today not logged yet shouldn't break a running streak.
    if (!loggedDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (loggedDays.has(dayKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [loggedDays]);

  return {
    routine,
    logs,
    loggedDays,
    streak,
    status,
    error,
    busy,
    accept,
    addStep,
    logCompletion,
    reload: load,
  };
}