import { del, get, post, put } from "../../lib/api";

/* =====================================================================
 * Scans  —  /scans
 * ===================================================================== */
 
export const listScans = (params?: ListScansParams) => get<Paginated<SkinScan>>("/scans", params);
export const getScan = (id: ID) => get<SkinScan>(`/scans/${id}`);
 
/** Multipart upload: backend expects the file under the field name "image". */
export function createScan(image: File | Blob, filename = "scan.jpg") {
  const form = new FormData();
  form.append("image", image, image instanceof File ? image.name : filename);
  return post<SkinScan>("/scans", form, { headers: { "Content-Type": "multipart/form-data" } });
}
 
export const deleteScan = (id: ID) => del(`/scans/${id}`);
 
/* ---------- Skin analysis (1:1 with scan) ---------- */
 
export const getAnalysis = (scanId: ID) => get<SkinAnalysis>(`/scans/${scanId}/analysis`);
export const upsertAnalysis = (scanId: ID, body: UpsertAnalysisBody) =>
  put<SkinAnalysis>(`/scans/${scanId}/analysis`, body);
export const deleteAnalysis = (scanId: ID) => del(`/scans/${scanId}/analysis`);
 