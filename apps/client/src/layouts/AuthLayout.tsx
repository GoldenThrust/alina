import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { selectIsAuthenticated, useAuthStore } from "../stores";
import Splash from "../pages/Splash";

export default function AuthLayout() {
  const isAuthed = useAuthStore(selectIsAuthenticated);
  const location = useLocation();
  const AuthReady = useAuthStore((s: AuthState) => s.authReady);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!AuthReady) {
    return <Splash />
  }
  if (isAuthed) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-layout">
      <Outlet />
    </div>
  );
}
