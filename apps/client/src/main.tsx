import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./services/api/auth.ts";
import "./stores/index.ts";
import App from "./App.tsx";
import { SocketProvider } from "./context/SocketContext.tsx";
import { AppToaster } from "./components/ui/toaster.tsx";
import "./utils/img.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SocketProvider>
       <AppToaster />
      <App />
    </SocketProvider>
  </StrictMode>,
);
