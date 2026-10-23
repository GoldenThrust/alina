import { useCallback, useEffect, useRef, useState } from "react";
import {
  addRecommendationToRoutine,
  getRecommendations,
  type RecommendationPage,
} from "../services/api/recommendation";
import { useRecommendationStore } from "../stores";
import { isAbort } from "../utils/signal";

const PAGE_SIZE = 20;

function applyPage(page: RecommendationPage) {
  useRecommendationStore.getState().upsertRecommendations(page.recommendations);
}

export function useRecommendations({
  type,
  accepted,
}: { type?: RecommendationType; accepted?: boolean } = {}) {
  const [status, setStatus] = useState<Status>("loading");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  /** Recommendation ids currently being added to the routine. */
  const [addingIds, setAddingIds] = useState<ReadonlySet<string>>(() => new Set());

  const cursor = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);
  const adding = useRef(new Set<string>());
  const lifetime = useRef<AbortController | null>(null);

  /** First page. Cached recommendations in the store keep showing while this runs. */
const loadFirstPage = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const page = await getRecommendations({ type, accepted, limit: PAGE_SIZE, signal });
      applyPage(page);
      cursor.current = page.nextCursor;

      setHasMore(page.nextCursor !== null);
      setStatus("ready");
    } catch (err) {
      if (isAbort(err)) return;
      setStatus("loadError");
    }
}, [type, accepted]);


  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    void loadFirstPage(controller.signal);
    return () => controller.abort();
  }, [loadFirstPage]);

  /** Next page using the server's cursor. Safe to call repeatedly: overlapping calls are ignored. */
const loadMore = useCallback(async () => {
    const next = cursor.current;
    if (!next || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const page = await getRecommendations({
        type,
        accepted,
        cursor: next,
        limit: PAGE_SIZE,
        signal: lifetime.current?.signal,
      });
      applyPage(page);
      cursor.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
    } catch (err) {
      if (!isAbort(err)) setMoreError(true);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
}, [type, accepted]);

  /** Sends the recommendation id to the backend. Resolves true on success. */
  const addToRoutine = useCallback(async (recommendationId: string) => {
    if (adding.current.has(recommendationId)) return false;

    const setBusy = (busy: boolean) => {
      if (busy) adding.current.add(recommendationId);
      else adding.current.delete(recommendationId);
      setAddingIds(new Set(adding.current));
    };

    setBusy(true);
    try {
      const updated = await addRecommendationToRoutine(recommendationId);
      // Marking it accepted removes it from the "pending" list the page reads from
      useRecommendationStore.getState().patchRecommendation(recommendationId, { ...updated, accepted: true });
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const retry = useCallback(() => void loadFirstPage(), [loadFirstPage]);

  return { status, hasMore, loadingMore, moreError, addingIds, loadMore, retry, addToRoutine };
}

