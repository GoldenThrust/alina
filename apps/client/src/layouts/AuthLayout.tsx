import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useSessionStore } from "../stores/session";

export default function AuthLayout() {
    const session = useSessionStore((state) => state.session);
  const location = useLocation();
  const authReady = useSessionStore((state) => state.authReady);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!authReady) {
    return (
      <div className="app-frame" aria-busy="true">
        <div className="app-main">
          <main className="workspace">Loading your space…</main>
        </div>
      </div>
    );
  }
  if (session) return <Navigate to="/dashboard" replace />;


    return ( <div className="auth-layout"><Outlet /></div> );
}