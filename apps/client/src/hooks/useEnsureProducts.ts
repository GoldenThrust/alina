import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { getProductsByIds } from "../services/api/product";
import { useProductStore } from "../stores";
import { isAbort } from "../utils/signal";

const CHUNK = 50;

/** Fetches any of `ids` that aren't in the product store yet. */
export function useEnsureProducts(ids: string[]) {
  const missing = useProductStore(
    useShallow((s) => ids.filter((id) => !s.products.byId[id])),
  );

  // Ids that were already requested (in flight, finished, or failed). Prevents refetch loops.
  const requested = useRef(new Set<string>());
  const lifetime = useRef<AbortController | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const toFetch = missing.filter((id) => !requested.current.has(id));
    if (toFetch.length === 0) return;
    toFetch.forEach((id) => requested.current.add(id));

    const signal = lifetime.current?.signal;
    const run = async (batch: string[]) => {
      setInFlight((n) => n + 1);
      try {
        const products = await getProductsByIds(batch, signal);
        useProductStore.getState().upsertProducts(products);
        const got = new Set(products.map((p) => p.id));
        const notFound = batch.filter((id) => !got.has(id));
        if (notFound.length) setFailedIds((prev) => new Set([...prev, ...notFound]));
      } catch (err) {
        if (isAbort(err)) return;
        setFailedIds((prev) => new Set([...prev, ...batch]));
      } finally {
        setInFlight((n) => n - 1);
      }
    };

    for (let i = 0; i < toFetch.length; i += CHUNK) void run(toFetch.slice(i, i + CHUNK));
  }, [missing, retryTick]);

  /** Allows failed ids to be requested again. */
  const retry = useCallback(() => {
    failedIds.forEach((id) => requested.current.delete(id));
    setFailedIds(new Set());
    setRetryTick((t) => t + 1);
  }, [failedIds]);

  return { fetching: inFlight > 0, failedIds, retry };
}