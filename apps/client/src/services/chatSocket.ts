import { selectAll } from "../utils/entities";
import { useAuthStore } from "../stores";
import { useChatStore } from "../stores/chat.store";
import socket from "./api/socket";

const REPLY_TIMEOUT_MS = 20_000;

let watchdog: ReturnType<typeof setTimeout> | undefined;
const clearWatchdog = () => {
  clearTimeout(watchdog);
  watchdog = undefined;
};

/** Pulls text out of whatever the backend puts in `data`. */
function chunkText(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["text", "content", "delta", "chunk"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
  }
  return "";
}

/** Optimistically adds the message, then emits it. Alina's reply arrives as stream events. */
export function sendChatMessage(userId: string, raw: string): void {
  const content = raw.trim();
  const store = useChatStore.getState();
  if (!content || store.awaitingReply) return;

  if (!socket.connected) {
    store.setError("You’re not connected right now. Reconnecting…");
    return; // the draft is left untouched
  }

  const tempId = store.addPendingUserMessage(userId, content);
  store.setAwaitingReply(true);
  socket.emit("message", content);

  // If the server never starts a stream, give the text back instead of waiting forever
  clearWatchdog();
  watchdog = setTimeout(() => {
    const s = useChatStore.getState();
    if (!s.awaitingReply || s.streamingSessionId) return;
    s.discardMessage(tempId);
    s.setDraft(content);
    s.setAwaitingReply(false);
    s.setError("Alina didn’t respond. Please try again.");
  }, REPLY_TIMEOUT_MS);
}

/** Subscribes to the stream events. Returns a cleanup function. */
export function attachChatListeners(): () => void {
  const userId = () => useAuthStore.getState().user?.id ?? "";

  const onStart = ({ sessionId }: { sessionId: string }) => {
    clearWatchdog();
    useChatStore.getState().beginStream(sessionId, userId());
  };

  const onData = ({ sessionId, data }: { sessionId: string; data: unknown }) => {
    const text = chunkText(data);
    if (!text) return;
    const s = useChatStore.getState();
    if (s.streamingSessionId !== sessionId) s.beginStream(sessionId, userId()); // start event was missed
    useChatStore.getState().appendStream(sessionId, text);
  };

  const onEnd = ({ sessionId }: { sessionId: string }) => {
    clearWatchdog();
    useChatStore.getState().endStream(sessionId);
  };

  const onDisconnect = () => {
    clearWatchdog();
    const s = useChatStore.getState();
    if (!s.awaitingReply) return;

    if (s.streamingSessionId) {
      s.endStream(); // keep whatever already arrived
    } else {
      const pending = selectAll(s.messages).find((m) => m.pending);
      if (pending) {
        s.discardMessage(pending.id);
        s.setDraft(pending.content);
      }
      s.setAwaitingReply(false);
    }
    useChatStore.getState().setError("Connection lost. Please try again.");
  };

  socket.on("stream:start", onStart);
  socket.on("stream:data", onData);
  socket.on("stream:end", onEnd);
  socket.on("disconnect", onDisconnect);

  return () => {
    socket.off("stream:start", onStart);
    socket.off("stream:data", onData);
    socket.off("stream:end", onEnd);
    socket.off("disconnect", onDisconnect);
    clearWatchdog();
  };
}