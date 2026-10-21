import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const TOP_THRESHOLD = 150; // px from the top that triggers loading older messages
const BOTTOM_THRESHOLD = 80; // px from the bottom that still counts as "at the bottom"

interface Options {
  messages: { id: string; sender: string }[];
  hasMore: boolean;
  loadingOlder: boolean;
  error: string | null;
  loadOlder: () => void | Promise<void>;
}

export function useChatScroll({
  messages,
  hasMore,
  loadingOlder,
  error,
  loadOlder,
}: Options) {
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const prev = useRef({
    first: null as string | null,
    last: null as string | null,
    height: 0,
    ready: false,
  });

  // Runs after every commit, before paint, so scroll fixes never flash.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const p = prev.current;
    const first = messages[0]?.id ?? null;
    const lastMessage = messages.at(-1);
    const last = lastMessage?.id ?? null;

    if (!p.ready) {
      // First time there is something to show: start at the newest message.
      if (messages.length > 0) {
        el.scrollTop = el.scrollHeight;
        p.ready = true;
      }
    } else if (first !== p.first && last === p.last) {
      // An older page was prepended: keep the same message under the viewport.
      el.scrollTop += el.scrollHeight - p.height;
    } else if (last !== p.last) {
      // A new message at the bottom: follow it if the user is there, or if they just sent it.
      if (lastMessage?.sender === "USER") stickToBottom.current = true;
      if (stickToBottom.current) el.scrollTop = el.scrollHeight;
    } else if (stickToBottom.current && el.scrollHeight !== p.height) {
      // The last message grew (streaming) or the typing dots appeared: keep following it
      el.scrollTop = el.scrollHeight;
    }

    p.first = first;
    p.last = last;
    p.height = el.scrollHeight;
  });

  // If a page doesn't fill the list there is nothing to scroll, so scrolling can't
  // trigger the next load. Keep fetching until it overflows or history runs out.
  useEffect(() => {
    const el = listRef.current;
    if (!el || error || loadingOlder || !hasMore || messages.length === 0)
      return;
    if (el.scrollHeight <= el.clientHeight + TOP_THRESHOLD) void loadOlder();
  }, [messages.length, hasMore, loadingOlder, error, loadOlder]);

  const [atBottom, setAtBottom] = useState(true);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
    stickToBottom.current = nearBottom;
    setAtBottom(nearBottom);
    if (el.scrollTop < TOP_THRESHOLD) void loadOlder();
  }, [loadOlder]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  return { listRef, onScroll, atBottom, scrollToBottom };
}
