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
  user?: { name?: string; email?: string };
};

async function submitAuth(path: 'login' | 'register', payload: AuthPayload): Promise<AuthResponse> {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as AuthResponse;

  if (!response.ok) {
    throw new Error(result.message ?? result.error ?? `Request failed (${response.status})`);
  }

  return result;
}

export function login(payload: AuthPayload) {
  return submitAuth('login', payload);
}

export function register(payload: AuthPayload) {
  return submitAuth('register', payload);
}