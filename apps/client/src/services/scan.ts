import type { AxiosError } from "axios";
import axios from "axios";

export async function requestScan(blob: Blob) {
  try {
    const formData = new FormData();
    formData.append("image", blob);

    const response = await axios.post(`/scans`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error: AxiosError | any) {
    throw new Error(error?.response?.data?.message ?? error?.message ?? `Request failed (${error.status})`);
  }
}