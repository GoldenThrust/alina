import { useCallback, useEffect, useRef, useState } from "react";
import { getSkinScan, getSkinScanHistory } from "../services/api/skinScan";
import { isAbort } from "../utils/signal";
import type { HistoryRequest } from "../utils/historyRequest";
import { useScanStore } from "../stores";

export type HistoryStatus = "idle" | "loading" | "error";

const DAY_MS = 86_400_000;

/** Timestamp of the second to the last oldest scan currently in the store (Infinity if none). */
function oldestLoadedMs(): number {
  const { ids, byId } = useScanStore.getState().scans;
  let oldest = Infinity;
  let prevOldest = oldest;

  for (const id of ids) {
    const createdAt = byId[id]?.createdAt;
    const time = createdAt ? new Date(createdAt).getTime() : NaN;
    if (time < oldest) {
      prevOldest = oldest;
      oldest = time;
    }
  }
  return prevOldest;
}

export function useSkinScan() {
  const hasScans = useScanStore((s) => s.scans.ids.length > 0);
  const [status, setStatus] = useState<Status>(hasScans ? "ready" : "loading");
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("idle");

  /**
   * How far back we've already fetched, as a timestamp.
   * -Infinity means "everything" (an all-time fetch succeeded).
   */
  const coveredFrom = useRef<number | null>(null);
  const lastRequest = useRef<HistoryRequest>(null);
  const historyAbort = useRef<AbortController | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const loaded = await getSkinScan({ signal });
      useScanStore.getState().setScans(loaded);
      coveredFrom.current = null; // the store was replaced, so recompute coverage
      setStatus("ready");
    } catch (err) {
      if (isAbort(err)) return;
      setStatus("loadError");
    }
  }, []);

  /**
   * Fetches history for a period. The request is skipped when the store already covers it,
   * so calling this on every period change is cheap.
   */
  const loadHistory = useCallback(async (request: HistoryRequest) => {
    if (!request) return;
    lastRequest.current = request;

    // No startDate means all time, which is older than any date.
    const requested = request.startDate
      ? Date.parse(request.startDate)
      : -Infinity;
    if (Number.isNaN(requested)) return;

    const covered = Math.min(coveredFrom.current ?? Infinity, oldestLoadedMs());
    const coveredDay =
      covered === -Infinity
        ? -Infinity
        : Number.isFinite(covered)
          ? covered - (covered % DAY_MS)
          : Infinity;

    if (requested >= coveredDay) {
      if (!historyAbort.current) setHistoryStatus("idle");
      return;
    }

    historyAbort.current?.abort(); // a newer period supersedes an in-flight request
    const controller = new AbortController();
    historyAbort.current = controller;
    setHistoryStatus("loading");

    try {
      const data = await getSkinScanHistory({
        // all time sends no date at all
        ...(request.startDate ? { startDate: request.startDate } : {}),
        signal: controller.signal,
      });
      useScanStore.getState().upsertScans(data);
      coveredFrom.current = requested;
      setHistoryStatus("idle");
    } catch (err) {
      if (isAbort(err)) return;
      setHistoryStatus("error");
    } finally {
      if (historyAbort.current === controller) historyAbort.current = null;
    }
  }, []);

  // Load once. Coming back to the page reuses what the store already has.
  useEffect(() => {
    if (useScanStore.getState().scans.ids.length > 0) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Cancel any in-flight history request on unmount
  useEffect(() => () => historyAbort.current?.abort(), []);

  const retryLoad = useCallback(() => void load(), [load]);
  const retryHistory = useCallback(
    () => void loadHistory(lastRequest.current),
    [loadHistory],
  );

  return { status, historyStatus, loadHistory, retryLoad, retryHistory };
}
