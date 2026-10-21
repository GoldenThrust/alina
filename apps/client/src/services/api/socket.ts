import { io } from "socket.io-client";
import { useAuthStore } from "../../stores";

const socket = io(import.meta.env.VITE_SERVER_URL, {
  withCredentials: true,
  autoConnect: false,
  auth: async (callback) => {
    //   if (isSessionExpired(useAuthStore.getState().session)) await refreshSession();
    callback({ token: useAuthStore.getState().session?.accessToken });
  },
});

export default socket;
