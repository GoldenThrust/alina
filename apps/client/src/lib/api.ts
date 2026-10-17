import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useSessionStore } from "../stores/session";

const API_URL = `${import.meta.env.VITE_SERVER_URL}/api`;

// Global defaults so every existing `axios.get(...)` in your pages keeps working.
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Bare client (no interceptors) used for refresh/logout to avoid retry loops.
const authClient = axios.create({ baseURL: API_URL, withCredentials: true });

const REFRESH_MARGIN_MS = 60_000; // refresh 60s before expiry
const FALLBACK_INTERVAL_MS = 10 * 60_000; // if token isn't a decodable JWT
const RETRY_DELAY_MS = 30_000; // after a network failure

type RefreshResponse = { accessToken: string };
type UserPayload = { fullName: string; email: string };
type UserResponse = UserPayload | { user: UserPayload };

let refreshPromise: Promise<string> | null = null;
let bootstrapPromise: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function scheduleRefresh(token: string, overrideDelay?: number) {
  clearTimeout(timer);
  const exp = getTokenExpiry(token);
  const delay =
    overrideDelay ??
    (exp
      ? Math.max(exp - Date.now() - REFRESH_MARGIN_MS, 5_000)
      : FALLBACK_INTERVAL_MS);
  timer = setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch (error) {
      // Real auth failures already cleared the session. For network errors, retry.
      const { session } = useSessionStore.getState();
      if (session?.mode === "account" && session.accessToken) {
        scheduleRefresh(session.accessToken, RETRY_DELAY_MS);
      }
    }
  }, delay);
}

/** Single-flight refresh: concurrent callers share one request. */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const startedWith = useSessionStore.getState().session;
    const stored = localStorage.getItem("refreshToken");

    refreshPromise = authClient
      .post<RefreshResponse>(
        "/auth/refresh",
        {},
        { headers: stored ? { Authorization: `Bearer ${stored}` } : undefined },
      )
      .then(({ data }) => {
        const { session, setSession } = useSessionStore.getState();
        if (session?.mode === "account") {
          setSession({ ...session, accessToken: data.accessToken });
        }
        return data.accessToken;
      })
      .catch((error: AxiosError) => {
        const status = error.response?.status;
        // Only clear if nobody replaced the session while this was in flight.
        if (
          (status === 401 || status === 403) &&
          useSessionStore.getState().session === startedWith
        ) {
          useSessionStore.getState().clearSession();
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** On app load: restore the session from the refresh cookie, then fetch the user. */
export function bootstrapAuth(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const store = useSessionStore.getState();
      if (store.session) return;
      try {
        const accessToken = await refreshAccessToken();
        const { data } = await axios.get<UserResponse>("/auth/user", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const user = "user" in data ? data.user : data;
        useSessionStore.getState().setSession({
          name: user.fullName,
          email: user.email,
          accessToken,
          mode: "account",
        });
      } catch {
        // Not signed in (or server unreachable): stay logged out.
      }
    })().finally(() => {
      useSessionStore.getState().setAuthReady();
    });
  }
  return bootstrapPromise;
}

export async function logout() {
  try {
    await authClient.post("/auth/logout");
  } catch {
    // Best effort: still clear local state.
  }

  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  useSessionStore.getState().clearSession();
}

// Shared request interceptor: attaches the access token if signed in.
const attachAccessToken = (config: InternalAxiosRequestConfig) => {
  const { session } = useSessionStore.getState();
  console.log(session);

  if (
    session?.mode === "account" &&
    session.accessToken &&
    !config.headers.Authorization
  ) {
    config.headers.Authorization = `Bearer ${config.url !== "/auth/logout" ? session.accessToken : localStorage.getItem("refreshToken")}`;
  }

  return config;
};

axios.interceptors.request.use(attachAccessToken);
authClient.interceptors.request.use(attachAccessToken);

// On 401, refresh once and retry the original request.
axios.interceptors.response.use(
  (response) => {
    if (
      response.status === 200 &&
      response.data?.refreshToken &&
      response.data?.accessToken
    ) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const { session } = useSessionStore.getState();

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      session?.mode === "account" &&
      !/\/auth\/(login|register|refresh|logout)/.test(original.url ?? "")
    ) {
      original._retry = true;
      const token = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${token}`;
      return axios(original);
    }

    return Promise.reject(error);
  },
);

// Background refresh scheduling follows the session: start on sign-in / new token, stop on sign-out or demo.
useSessionStore.subscribe((state, prev) => {
  const token =
    state.session?.mode === "account" ? state.session.accessToken : undefined;
  const prevToken =
    prev.session?.mode === "account" ? prev.session.accessToken : undefined;
  if (!token) {
    clearTimeout(timer);
  } else if (token !== prevToken) {
    scheduleRefresh(token);
  }
});

// Timers are throttled/paused in sleeping tabs; re-check when the tab returns.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const { session } = useSessionStore.getState();
  if (session?.mode !== "account" || !session.accessToken) return;
  const exp = getTokenExpiry(session.accessToken);
  if (exp && exp - Date.now() < REFRESH_MARGIN_MS) {
    void refreshAccessToken().catch(() => {});
  }
});
