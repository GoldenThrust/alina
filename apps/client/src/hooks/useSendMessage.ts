import { useCallback } from "react";
import { sendChatMessage } from "../services/chatSocket";

export function useSendMessage(userId: string) {
  return useCallback((content: string) => sendChatMessage(userId, content), [userId]);
}