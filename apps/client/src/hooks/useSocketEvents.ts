import { useEffect } from "react";
import socket from "../lib/socket";
import { useNavigate } from "react-router";
import { toast } from "react-hot-toast";

// interface StreamPayload {
//   sessionId: string;
//   data?: unknown;
// }

export function useSocketEvents() {
  const navigate = useNavigate();

  useEffect(() => {
    function onNotification(notification: unknown) {
      toast(notification as string);
    }

    function onNavigation({ route }: { route: string }) {
        navigate(route);
    }

    // function onMessage({ message }: { message: string }) {
    //   console.log("Message:", message);
    // }

    // function onStreamStart({ sessionId }: StreamPayload) {
    //   console.log("Stream started:", sessionId);
    // }

    // function onStreamData(payload: StreamPayload) {
    //   console.log("Stream data:", payload.data);
    // }

    // function onStreamEnd({ sessionId }: StreamPayload) {
    //   console.log("Stream ended:", sessionId);
    // }

    socket.on("notification", onNotification);
    socket.on("navigation", onNavigation);
    // socket.on("message", onMessage);
    // socket.on("stream:start", onStreamStart);
    // socket.on("stream:data", onStreamData);
    // socket.on("stream:end", onStreamEnd);

    return () => {
      socket.off("notification", onNotification);
      socket.off("navigation", onNavigation);
    //   socket.off("message", onMessage);
    //   socket.off("stream:start", onStreamStart);
    //   socket.off("stream:data", onStreamData);
    //   socket.off("stream:end", onStreamEnd);
    };
  }, []);
}
