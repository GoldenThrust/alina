import {
  Activity,
  Bot,
  ChartNoAxesCombined,
  CreditCard,
  House,
  LogOut,
  ScanFace,
  Settings2,
  Sparkles,
} from "lucide-react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router";
import { useEffect } from "react";
import { useLocation } from "react-router";
import { useSessionStore } from "../stores/session";

import { logout } from "../lib/api";

const navigation = [
  { to: "/dashboard", label: "Home", icon: House },
  { to: "/scan", label: "Scan", icon: ScanFace },
  { to: "/progress", label: "Progress", icon: ChartNoAxesCombined },
  { to: "/recommendations", label: "Recommendations", icon: Sparkles },
  { to: "/chat", label: "Chat", icon: Bot },
  { to: "/routine", label: "Routine", icon: Activity },
  { to: "/profile", label: "Profile", icon: Settings2 },
  { to: "/subscription", label: "Plans", icon: CreditCard },
];

export default function AppLayout() {
  const session = useSessionStore((state) => state.session);
  const clearSession = useSessionStore((state) => state.clearSession);
  const navigate = useNavigate();
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

  console.log("Dashboard session:", session, !session);
  if (!session) return <Navigate to="/login" replace />;

  async function signOut() {
    if (session?.mode === "account") await logout();
    else clearSession();
    navigate("/");
  }

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <NavLink className="wordmark sidebar-brand" to="/dashboard">
          <img src="/alina.svg" alt="" />
          <span>Alina</span>
        </NavLink>
        <p className="sidebar-label">YOUR SPACE</p>
        <nav className="app-navigation" aria-label="Your skin journal">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                `side-link${isActive ? " active" : ""}`
              }
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <span className="avatar avatar-small">
              {session.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="sidebar-profile-copy">
              <strong>{session.name}</strong>
              <small>
                {session.mode === "demo" ? "Sample profile" : session.email}
              </small>
            </span>
          </div>
          <button
            className="side-link sign-out"
            type="button"
            onClick={signOut}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div>
            <span className="topbar-kicker">YOUR SKIN JOURNAL</span>
            <span className="topbar-location">
              A little more in tune, every day.
            </span>
          </div>
          <div className="topbar-user">
            {session.mode === "demo" ? (
              <span className="demo-chip">
                <span /> Demo mode
              </span>
            ) : null}
            <button
              className="avatar"
              type="button"
              aria-label="Open profile"
              onClick={() => navigate("/profile")}
            >
              {session.name.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main className="workspace">
          {session.mode === "demo" ? (
            <div className="demo-banner">
              <Sparkles size={15} />
              <span>
                <strong>Sample workspace</strong> · Results and conversations
                here are illustrative, not live analysis.
              </span>
              <button type="button" onClick={() => navigate("/scan")}>
                Try the scan flow <span aria-hidden="true">↗</span>
              </button>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
