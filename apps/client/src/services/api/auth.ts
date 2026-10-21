import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../../stores";

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
      const { session } = useAuthStore.getState();
      if (session?.accessToken) {
        scheduleRefresh(session.accessToken, RETRY_DELAY_MS);
      }
    }
  }, delay);
}

/** Single-flight refresh: concurrent callers share one request. */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const startedWith = useAuthStore.getState().session;
    const stored = localStorage.getItem("refreshToken");

    refreshPromise = authClient
      .post<RefreshResponse>(
        "/auth/refresh",
        {},
        { headers: stored ? { Authorization: `Bearer ${stored}` } : undefined },
      )
      .then(({ data }) => {
        const { session, setSession } = useAuthStore.getState();
        if (session) {
          setSession({ ...session, accessToken: data.accessToken });
        }
        return data.accessToken;
      })
      .catch((error: AxiosError) => {
        const status = error.response?.status;
        // Only clear if nobody replaced the session while this was in flight.
        if (
          (status === 401 || status === 403) &&
          useAuthStore.getState().session === startedWith
        ) {
          useAuthStore.getState().signOut();
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
      const store = useAuthStore.getState();
      const stored = localStorage.getItem("refreshToken");
      if (store.session) return;
      try {
        const accessToken = await refreshAccessToken();
        const { data } = await axios.get<UserResponse>("/auth/user", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const user = ("user" in data ? data.user : data) as User;
        useAuthStore.getState().setUser({ ...user });
        useAuthStore.getState().setSession({
          refreshToken: stored as string,
          accessToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
      } catch {
        // Not signed in (or server unreachable): stay logged out.
      }
    })().finally(() => {
      useAuthStore.getState().setAuthReady();
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
  useAuthStore.getState().signOut();
}

// Shared request interceptor: attaches the access token if signed in.
const attachAccessToken = (config: InternalAxiosRequestConfig) => {
  const { session } = useAuthStore.getState();
  // console.log(session);

  if (
    session?.accessToken &&
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

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
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
useAuthStore.subscribe((state, prev) => {
  const token =
     state.session?.accessToken ;
  const prevToken = prev.session?.accessToken;
  if (!token) {
    clearTimeout(timer);
  } else if (token !== prevToken) {
    scheduleRefresh(token);
  }
});



// Timers are throttled/paused in sleeping tabs; re-check when the tab returns.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const { session } = useAuthStore.getState();
  if (!session?.accessToken) return;
  const exp = getTokenExpiry(session.accessToken);
  if (exp && exp - Date.now() < REFRESH_MARGIN_MS) {
    void refreshAccessToken().catch(() => {});
  }
});

export type AuthPayload = {
  name?: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  message?: string;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
};

async function submitAuth(path: 'login' | 'register', payload: AuthPayload): Promise<AuthResponse> {
  try {
    // console.log(`Submitting auth request to /auth/${path} with payload:`, payload);
    const response = await axios.post(`/auth/${path}`, payload);

    const data = response.data as AuthResponse | undefined;
    
    return data as AuthResponse;
  } catch (error: AxiosError | any) {
    console.error('Auth request failed', error.response?.data?.message ?? error.message);
    throw new Error(error?.response?.data?.message ?? error?.message ?? `Request failed (${error.status})`);
    
  }

}

export function login(payload: AuthPayload) {
  return submitAuth('login', payload);
}

export function register(payload: AuthPayload) {
  return submitAuth('register', payload);
}

export async function verifyAccount(token: string): Promise<AuthResponse> {
  try {
    console.log(`Verifying account with token: ${token}`);
    const response = await axios.get(`/auth/verify-account/${token}`);
    return response.data as AuthResponse;
  } catch (error: AxiosError | any) {
    console.error('Account verification failed', error.response?.data?.message ?? error.message);
    throw new Error(error?.response?.data?.message ?? error?.message ?? `Request failed (${error.status})`);
  }
}