import { stringToDate } from "../../stores";
import { get } from "./api";

type response = { items: SkinScan[] };
export async function getSkinScan(params?: object) {
  const response = (await get<response>("/scans", params)).items;

  const { first, last } = await getFirstAndLastScan(params);

  const data = stringToDate<SkinScan[]>(response);

  data.push(first);
  data.push(last);
  return data;
}

export async function getSkinScanHistory(params?: object) {
  const response = (await get<response>("/scans/history", params)).items;

  return stringToDate<SkinScan[]>(response);
}

export async function getFirstAndLastScan(params?: object) {
  const response = await get<{ first: SkinScan; last: SkinScan }>(
    "/scans/first-and-last",
    params,
  );
  const firstScan = response.first;
  const lastScan = response.last;

  firstScan.createdAt = new Date(firstScan.createdAt);
  lastScan.createdAt = new Date(lastScan.createdAt);

  return {
    first: firstScan,
    last: lastScan,
  };
}

export async function fetchSkinScanById(id: string, params: {signal: AbortSignal}) {
  const response = await get<SkinScan>(`/scans/${id}`, params);

  response.createdAt = new Date(response.createdAt);

  return response;
}
