import { useCallback } from "react";
import { sendChatMessage } from "../services/chatSocket";

export function useSendMessage(userId: string) {
  return useCallback(
    (content: string, attachments: File[]) =>
      sendChatMessage({ userId, content, attachments }),
    [userId],
  );
}
