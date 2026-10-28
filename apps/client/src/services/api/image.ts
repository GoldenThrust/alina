import axios, { AxiosError } from "axios";

export async function uploadTemporalImage(image?: File) {
  try {
    if (!image) return;
    const formData = new FormData();
    formData.append("image", image);

    const response = await axios.post(`/scans/upload/temporal`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.image as string;
  } catch (error: AxiosError | any) {
    throw new Error(
      error?.response?.data?.message ??
        error?.message ??
        `Request failed (${error.status})`,
    );
  }
}
