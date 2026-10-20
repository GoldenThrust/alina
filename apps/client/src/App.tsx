import { useEffect } from "react";
import { bootstrapAuth } from "./api/auth";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AppLayout from "./layouts/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Recommendation from "./pages/Recomendation";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import Routine from "./pages/Routine";
import Scan from "./pages/Scan";
import ScanResult from "./pages/ScanResult";
import Subscription from "./pages/Subscription";
import AccountVerification from "./pages/AccountVerification";
import AuthLayout from "./layouts/AuthLayout";
// import { useProductStore, useRecommendationStore, useRoutineStore, useScanStore } from "./stores";
// import { useSocket } from "./context/SocketContext";

function App() {
  // const _ = useSocket();
  useEffect(() => {
    void bootstrapAuth();
  }, []);

  // useScanStore.getState().setDemoScans();
  // useRecommendationStore.getState().setDemoRecommendations();
  // useProductStore.getState().setDemoProducts();
  // useRoutineStore.getState().setDemoRoutines();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/account-verification/:token"
            element={<AccountVerification />}
          />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} index />
          <Route path="/scan" element={<Scan />} />
          <Route path="/scan-result" element={<ScanResult />} />
          <Route path="/scan-result/:scanId" element={<ScanResult />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/recommendations" element={<Recommendation />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/subscription" element={<Subscription />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
