import { useEffect } from "react";
import socket from "../services/api/socket";
import { useNavigate } from "react-router";
import { toast } from "react-hot-toast";

// interface StreamPayload {
//   sessionId: string;
//   data?: unknown;
// }

export function useSocketEvents() {
  const navigate = useNavigate();

  useEffect(() => {
    function onNotification({
      notification,
      type,
    }: {
      notification: string;
      type: "success" | "error";
    }) {
      toast[type](notification);
    }

    function onNavigation({ route }: { route: string }) {
      toast(`Navigating to ${route} in 2 seconds...`, { duration: 2000 });
      setTimeout(() => {
        navigate(route);
      }, 2000);
    }

    socket.on("notification", onNotification);
    socket.on("navigation", onNavigation);

    return () => {
      socket.off("notification", onNotification);
      socket.off("navigation", onNavigation);
    };
  }, []);
}
