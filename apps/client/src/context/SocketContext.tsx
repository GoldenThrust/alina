import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import socket from "../services/api/socket";
import { attachChatListeners } from "../services/chatSocket";
import { useAuthStore } from "../stores";

interface SocketContextType {
  connected: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({ connected: false, error: null });

/** Keeps the chat listeners attached for as long as the user is signed in. */
function ChatStreamListener() {
  useEffect(() => attachChatListeners(), []);
  return null;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state: AuthState) => state.session !== null);
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const onConnect = () => {
      setConnected(true);
      setError(null);
    };
    const onDisconnect = () => setConnected(false);
    const onError = (err: Error) => {
      setConnected(false);
      setError(err.message); // e.g. "Invalid or expired token"
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);
      socket.disconnect();
      setConnected(false);
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ connected, error }}>
      {isAuthenticated ? <ChatStreamListener /> : null}
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}