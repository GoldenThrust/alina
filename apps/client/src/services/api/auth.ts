import axios, { AxiosError } from "axios";

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