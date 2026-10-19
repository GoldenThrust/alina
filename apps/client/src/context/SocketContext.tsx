import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import socket from "../api/socket";

interface SocketContextType {
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  connected: false,
});

export function SocketProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}