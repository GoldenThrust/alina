import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./lib/api";
import "./stores/index.ts";
import App from "./App.tsx";
import { SocketProvider } from "./context/SocketContext.tsx";
import { AppToaster } from "./components/ui/toaster.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SocketProvider>
       <AppToaster />
      <App />
    </SocketProvider>
  </StrictMode>,
);
