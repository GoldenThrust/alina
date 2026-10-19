import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { now, oldestFirst } from "../utils/dates";
import {
  emptyEntities, removeOne, replaceOne, selectAll, setAll, upsertMany, upsertOne,
  type Entities,
} from "../utils/entities.store";

interface ChatState {
  messages: Entities<Message>;
  draft: string;
  /** True while waiting for Alina's reply. */
  awaitingReply: boolean;
  error: string | null;

  setMessages: (messages: Message[]) => void;
  upsertMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  /** Adds the user's message immediately and returns its temporary id. */
  addPendingUserMessage: (userId: string, content: string) => string;
  /** Swap the temporary message for the server's saved one. */
  confirmMessage: (tempId: string, saved: Message) => void;
  discardMessage: (id: string) => void;
  setDraft: (draft: string) => void;
  setAwaitingReply: (awaiting: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: emptyEntities(),
  draft: "",
  awaitingReply: false,
  error: null,

  setMessages: (messages) => set({ messages: setAll(messages) }),
  upsertMessages: (messages) => set((s) => ({ messages: upsertMany(s.messages, messages) })),
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
  setDraft: (draft) => set({ draft }),
  setAwaitingReply: (awaitingReply) => set({ awaitingReply }),
  setError: (error) => set({ error }),
  clear: () => set({ messages: emptyEntities(), draft: "", awaitingReply: false, error: null }),
}));

/** Oldest first, the order a chat list renders in. */
export const selectConversation = (s: ChatState) =>
  selectAll(s.messages).sort(oldestFirst((m) => m.createdAt));

export const selectLastMessage = (s: ChatState): Message | null =>
  selectConversation(s).at(-1) ?? null;

export const useConversation = () => useChatStore(useShallow(selectConversation));
