import type { Period } from "./chart/period";

export type Range = { start: string; end: string };

const DAY_MS = 86_400_000;

export const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
export const toISO = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** YYYY-MM-DD (UTC) for a scan timestamp. */
export const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

const shortFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
});
const longFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
export const fmtShort = (ms: number) => shortFmt.format(ms);
export const fmtLong = (ms: number) => longFmt.format(ms);

/** Works for any "N days" period; anything else (e.g. "All time") is the full bounds. */
export function presetRange(period: Period, bounds: Range): Range {
  const days = Number.parseInt(period, 10);
  if (!Number.isFinite(days)) return bounds;
  const endMs = toUTC(bounds.end);
  const startMs = Math.max(toUTC(bounds.start), endMs - (days - 1) * DAY_MS);
  return { start: toISO(startMs), end: bounds.end };
}

/** Inclusive on both ends, compared by calendar day so the end date includes the whole day. */
export function filterByRange<T extends { createdAt: Date | string }>(
  items: T[],
  start: string | null,
  end: string | null,
): T[] {
  return items.filter((item) => {
    const key = dayKey(item.createdAt);
    return (!start || key >= start.slice(0, 10)) && (!end || key <= end.slice(0, 10));
  });
}