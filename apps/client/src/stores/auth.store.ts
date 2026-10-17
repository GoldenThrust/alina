import { create } from "zustand";

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  authReady: false,
  setAuthReady: () => set({ authReady: true }),

  signIn: (user, session) => set({ user, session }),
  setUser: (user) => set({ user }),
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
