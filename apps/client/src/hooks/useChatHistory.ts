import { useCallback, useEffect } from "react";
import { CHAT_PAGE_SIZE, fetchMessages } from "../data/chat";
import { useChatStore } from "../stores/chat.store";

const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

export function useChatHistory() {
  const initialized = useChatStore((s) => s.initialized);
  const hasMore = useChatStore((s) => s.hasMore);
  const loadingOlder = useChatStore((s) => s.loadingOlder);

  const loadInitial = useCallback(async (signal?: AbortSignal) => {
    useChatStore.getState().setError(null);
    try {
      const page = await fetchMessages({ limit: CHAT_PAGE_SIZE, signal });
      useChatStore.getState().applyHistoryPage(page.messages, page.nextCursor);
    } catch (err) {
      if (isAbort(err)) return;
      useChatStore.getState().setError("Couldn't load your conversation.");
    }
  }, []);

  // Only fetch once. Coming back to the page reuses what the store already has.
  useEffect(() => {
    if (useChatStore.getState().initialized) return;
    const controller = new AbortController();
    void loadInitial(controller.signal);
    return () => controller.abort();
  }, [loadInitial]);

  /** Fetches the next older page. Safe to call repeatedly: it guards against overlap. */
  const loadOlder = useCallback(async () => {
    const { initialized, hasMore, loadingOlder, nextCursor } = useChatStore.getState();
    if (!initialized || !hasMore || loadingOlder || !nextCursor) return;

    const store = useChatStore.getState();
    store.setLoadingOlder(true);
    try {
      const page = await fetchMessages({ before: nextCursor, limit: CHAT_PAGE_SIZE });
      useChatStore.getState().applyHistoryPage(page.messages, page.nextCursor);
    } catch {
      useChatStore.getState().setError("Couldn't load earlier messages.");
    } finally {
      useChatStore.getState().setLoadingOlder(false);
    }
  }, []);

  const retry = useCallback(() => void loadInitial(), [loadInitial]);

  return { initialized, hasMore, loadingOlder, loadOlder, retry };
}