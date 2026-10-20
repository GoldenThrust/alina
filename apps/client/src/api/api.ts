/* =====================================================================
 * Request helper (same error behaviour as the auth module)
 * ===================================================================== */

import type { AxiosError, AxiosRequestConfig } from "axios";
import axios from "axios";

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await axios.request<T>(config);
    return response.data;
  } catch (error: AxiosError | any) {
    const message = error?.response?.data?.message ?? error?.message;
    // console.error(`${config.method?.toUpperCase()} ${config.url} failed`, message);
    throw new Error(message ?? `Request failed (${error?.status})`);
  }
}

export const get = <T>(url: string, params?: object) => request<T>({ method: "GET", url, params });
export const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  request<T>({ method: "POST", url, data, ...config });
export const put = <T>(url: string, data?: unknown) => request<T>({ method: "PUT", url, data });
export const del = <T = MessageResponse>(url: string) => request<T>({ method: "DELETE", url });
 