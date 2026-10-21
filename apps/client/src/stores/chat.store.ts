import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { now, oldestFirst } from "../utils/dates";
import {
  emptyEntities, removeOne, replaceOne, selectAll, setAll, upsertMany, upsertOne,
} from "../utils/entities";

/** Id of the message a stream builds up. */
const streamMessageId = (sessionId: string) => `stream-${sessionId}`;

interface ChatState {
  messages: Entities<Message>;
  draft: string;
  /** True from sending until the reply's stream has ended. */
  awaitingReply: boolean;
  error: string | null;

  /** True once the first page of history has loaded. */
  initialized: boolean;
  nextCursor: string | null;
  hasMore: boolean;
  loadingOlder: boolean;

  /** Session id of the reply that is currently streaming in. */
  streamingSessionId: string | null;

  setMessages: (messages: Message[]) => void;
  upsertMessages: (messages: Message[]) => void;
  applyHistoryPage: (messages: Message[], nextCursor: string | null) => void;
  addMessage: (message: Message) => void;
  addPendingUserMessage: (userId: string, content: string) => string;
  confirmMessage: (tempId: string, saved: Message) => void;
  discardMessage: (id: string) => void;

  /** stream:start. Delivers the pending user message and opens an empty Alina message. */
  beginStream: (sessionId: string, userId: string) => void;
  /** stream:data. Appends a chunk to the streaming message. */
  appendStream: (sessionId: string, chunk: string) => void;
  /** stream:end (or a dropped connection). Finalizes the message and re-enables sending. */
  endStream: (sessionId?: string) => void;

  setDraft: (draft: string) => void;
  setAwaitingReply: (awaiting: boolean) => void;
  setLoadingOlder: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: emptyEntities(),
  draft: "",
  awaitingReply: false,
  error: null,
  initialized: false,
  nextCursor: null,
  hasMore: false,
  loadingOlder: false,
  streamingSessionId: null,

  setMessages: (messages) => set({ messages: setAll(messages) }),
  upsertMessages: (messages) => set((s) => ({ messages: upsertMany(s.messages, messages) })),
  applyHistoryPage: (messages, nextCursor) =>
    set((s) => ({
      messages: upsertMany(s.messages, messages),
      nextCursor,
      hasMore: nextCursor !== null,
      initialized: true,
    })),
  addMessage: (message) => set((s) => ({ messages: upsertOne(s.messages, message) })),
  addPendingUserMessage: (userId, content) => {
    const id = `temp-${crypto.randomUUID()}`;
    set((s) => ({
      messages: upsertOne(s.messages, {
        id,
        userId,
        sender: "USER",
        content,
        createdAt: now(),
        pending: true,
      }),
      draft: "",
      error: null,
    }));
    return id;
  },
  confirmMessage: (tempId, saved) =>
    set((s) => ({ messages: replaceOne(s.messages, tempId, { ...saved, pending: false }) })),
  discardMessage: (id) => set((s) => ({ messages: removeOne(s.messages, id) })),

  beginStream: (sessionId, userId) =>
    set((s) => {
      // The server acknowledging the message means it was delivered
      const delivered = selectAll(s.messages)
        .filter((m) => m.pending)
        .map((m) => ({ ...m, pending: false }));

      const messages = upsertOne(upsertMany(s.messages, delivered), {
        id: streamMessageId(sessionId),
        userId,
        sender: "ALINA",
        content: "",
        createdAt: now(),
        streaming: true,
      });

      return { messages, streamingSessionId: sessionId, awaitingReply: true, error: null };
    }),

  appendStream: (sessionId, chunk) =>
    set((s) => {
      const current = s.messages.byId[streamMessageId(sessionId)];
      if (!current) return s;
      return { messages: upsertOne(s.messages, { ...current, content: current.content + chunk }) };
    }),

  endStream: (sessionId) =>
    set((s) => {
      const id = sessionId ?? s.streamingSessionId;
      const current = id ? s.messages.byId[streamMessageId(id)] : undefined;
      const done = { streamingSessionId: null, awaitingReply: false };

      if (!current) return done;
      // A stream that produced nothing shouldn't leave an empty bubble behind
      if (!current.content) return { ...done, messages: removeOne(s.messages, current.id) };
      return { ...done, messages: upsertOne(s.messages, { ...current, streaming: false }) };
    }),

  setDraft: (draft) => set({ draft }),
  setAwaitingReply: (awaitingReply) => set({ awaitingReply }),
  setLoadingOlder: (loadingOlder) => set({ loadingOlder }),
  setError: (error) => set({ error }),
  clear: () =>
    set({
      messages: emptyEntities(),
      draft: "",
      awaitingReply: false,
      error: null,
      initialized: false,
      nextCursor: null,
      hasMore: false,
      loadingOlder: false,
      streamingSessionId: null,
    }),
}));

/** Oldest first, the order a chat list renders in. */
export const selectConversation = (s: ChatState) =>
  selectAll(s.messages).sort(oldestFirst((m) => m.createdAt));

export const selectLastMessage = (s: ChatState): Message | null =>
  selectConversation(s).at(-1) ?? null;

export const useConversation = () => useChatStore(useShallow(selectConversation));