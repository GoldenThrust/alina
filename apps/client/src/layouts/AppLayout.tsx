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

import { logout } from "../api/auth";
import { selectIsAuthenticated, useAuthStore } from "../stores";
import Splash from "../pages/Splash";

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
  const user = useAuthStore((state: AuthState) => state.user);
  const logOut = useAuthStore((state: AuthState) => state.signOut);
  const navigate = useNavigate();
  const location = useLocation();
  const AuthReady = useAuthStore((s: AuthState) => s.authReady);
  const isAuthed = useAuthStore(selectIsAuthenticated);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if ( !AuthReady) {
    return <Splash />
  }

  if (!isAuthed || !user) return <Navigate to="/login" replace />;

  async function signOut() {
    await logout();
    logOut();
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
              {user.avatar ? <img src={user.avatar} alt="Avatar" className="rounded" /> : user.fullName.slice(0, 1).toUpperCase()}
            </span>
            <span className="sidebar-profile-copy">
              <strong>{user.fullName}</strong>
              <small>
                {user.email}
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
            <button
              className="avatar"
              type="button"
              aria-label="Open profile"
              onClick={() => navigate("/profile")}
            >
              {user.avatar ? <img src={user.avatar} alt="Avatar" className="rounded-full" /> : user.fullName.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main className="workspace">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
