import { create } from "zustand";
import { usePreferenceStore } from "./preference.store";

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  authReady: false,
  setAuthReady: () => set({ authReady: true }),

  signIn: (user, session) => set({ user, session }),
  setUser: (user) => {
    set({ user });

    if (user.preferences) {
      usePreferenceStore.getState().setPreferences(user.preferences);
    }
  },
  patchUser: (patch) =>
    set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
  setSession: (session) => set({ session }),
  signOut: () => set({ user: null, session: null }),
}));

export const selectIsAuthenticated = (s: AuthState) => s.session !== null;
export const selectIsAdmin = (s: AuthState) => s.user?.role === "ADMIN";
export const selectIsEmailVerified = (s: AuthState) =>
  s.user?.emailVerifiedAt != null;

/** True if the access token expires within `skewMs` (default 30s). */
export function isSessionExpired(
  session: Session | null,
  skewMs = 30_000,
): boolean {
  if (!session) return true;
  return session.expiresAt.getTime() <= Date.now() + skewMs;
}


useAuthStore.subscribe((state) => {
  console.log("Auth store changed:", state.user?.avatar);
  if (!(state.user?.avatar?.includes("http"))) {
    useAuthStore.getState().patchUser({
      avatar: `${import.meta.env.VITE_SERVER_URL}\\${state.user?.avatar}`,
    })
  }
});