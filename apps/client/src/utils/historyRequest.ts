import type { PeriodState } from "./chart/period";
import type { Range } from "./dateRange";

/**
 * What to ask the history endpoint for:
 *  - `{}`                  all time (no date is sent)
 *  - `{ startDate: "…" }`  everything from that day (YYYY-MM-DD) onward
 *  - `null`                nothing to load yet (e.g. a custom range that hasn't been applied)
 */
export type HistoryRequest = { startDate?: string } | null;

// Understands "7 days", "2 weeks", "3 months", "1 year" and short forms like "7D", "3M", "1Y"
const AMOUNT_UNIT = /^(\d+)\s*([dwmy])[a-z]*$/i;

export function periodToHistoryRequest(
  period: PeriodState,
  customRange: Range | null,
  now: Date = new Date(),
): HistoryRequest {
  if (period === "Custom") {
    return customRange?.start ? { startDate: customRange.start } : null;
  }

  if (/^all/i.test(period)) return {}; // "All", "All time", …

  const match = AMOUNT_UNIT.exec(period.trim());
  if (!match) return null;

  const amount = Number(match[1]);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  switch (match[2].toLowerCase()) {
    case "d":
      start.setUTCDate(start.getUTCDate() - amount);
      break;
    case "w":
      start.setUTCDate(start.getUTCDate() - amount * 7);
      break;
    case "m":
      start.setUTCMonth(start.getUTCMonth() - amount);
      break;
    case "y":
      start.setUTCFullYear(start.getUTCFullYear() - amount);
      break;
  }

  return { startDate: start.toISOString().slice(0, 10) };
}