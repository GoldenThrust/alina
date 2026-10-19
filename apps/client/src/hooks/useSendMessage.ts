import { useCallback } from "react";
import { sendMessage } from "../data/chat";
import { useChatStore } from "../stores/chat.store";

export function useSendMessage(userId: string) {
  return useCallback(
    async (raw: string) => {
      const content = raw.trim();
      const store = useChatStore.getState();
      if (!content || store.awaitingReply) return;

      const tempId = store.addPendingUserMessage(userId, content);
      store.setAwaitingReply(true);

      try {
        const { message, reply } = await sendMessage({ userId, content });
        const s = useChatStore.getState();
        s.confirmMessage(tempId, message);
        s.addMessage(reply);
      } catch {
        const s = useChatStore.getState();
        s.discardMessage(tempId);
        s.setDraft(content); // give the text back so nothing is lost
        s.setError("Your message couldn't be sent. Please try again.");
      } finally {
        useChatStore.getState().setAwaitingReply(false);
      }
    },
    [userId],
  );
}