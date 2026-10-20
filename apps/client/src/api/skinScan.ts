import { get } from "./api";

type response = { items: SkinScan[] }
export async function getSkinScan(params?: object) {
  const response = (await get<response>("/scans", params)).items;

  response.map((scan) => {
    scan.createdAt = new Date(scan.createdAt);
  });

  return response;
}

export async function getSkinScanHistory(params?: object) {
  const response = (await get<response>("/scans/history", params)).items;

  response.map((scan) => {
    scan.createdAt = new Date(scan.createdAt);
  });

  return response;
}
