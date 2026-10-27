import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";

/**
 * Optional startDate / endDate filtering, built on Temporal.Instant only.
 * Place at: src/lib/date-range.ts
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Temporal.Instant from a Temporal value, Date, epoch number or ISO string. Null if unusable. */
export const toInstant = (value: unknown): Temporal.Instant | null => {
  if (value === null || value === undefined) return null;
  try {
    if (value instanceof Date) {
      return Temporal.Instant.fromEpochMilliseconds(value.getTime());
    }
    if (typeof value === "number") {
      return Temporal.Instant.fromEpochMilliseconds(value);
    }
    // Going through the ISO string keeps this safe when the ORM's Temporal and
    // the polyfill are different implementations.
    return Temporal.Instant.from(String(value));
  } catch {
    return null;
  }
};

/**
 * YYYY-MM-DD is read as a UTC day: start = 00:00:00.000, end = 23:59:59.999.
 * A full datetime must carry Z or an offset (Temporal.Instant.from requires it).
 */
const parseBound = (v: string, edge: "start" | "end"): Temporal.Instant => {
  if (!DATE_ONLY.test(v)) return Temporal.Instant.from(v);
  const day = Temporal.PlainDate.from(v);
  return edge === "start"
    ? day.toZonedDateTime("UTC").toInstant()
    : day
        .add({ days: 1 })
        .toZonedDateTime("UTC")
        .toInstant()
        .subtract({ milliseconds: 1 });
};

const dateParam = z.string().refine((v) => {
  try {
    parseBound(v, "start");
    return true;
  } catch {
    return false;
  }
}, "Use YYYY-MM-DD, or an ISO 8601 datetime with Z or an offset");

/** Spread into any zod object: z.object({ ...dateRangeShape, limit: ... }) */
export const dateRangeShape = {
  startDate: dateParam.optional(),
  endDate: dateParam.optional(),
};

export interface DateRangeInput {
  startDate?: string;
  endDate?: string;
}

/** Both bounds are inclusive. Either can be undefined. */
export interface DateRange {
  from?: Temporal.Instant;
  to?: Temporal.Instant;
}

export function resolveDateRange(input: DateRangeInput): DateRange {
  return {
    from: input.startDate ? parseBound(input.startDate, "start") : undefined,
    to: input.endDate ? parseBound(input.endDate, "end") : undefined,
  };
}

/** Pass as the first argument to .refine() on any schema that includes dateRangeShape. */
export const rangeIsOrdered = (input: DateRangeInput): boolean => {
  const { from, to } = resolveDateRange(input);
  return !from || !to || Temporal.Instant.compare(from, to) <= 0;
};

/** Second argument to .refine(). */
export const rangeError = {
  message: "startDate must be on or before endDate",
  path: ["startDate"],
};

/** In-memory check, for data that is already loaded. */
export const inRange = (value: unknown, range: DateRange): boolean => {
  const at = toInstant(value);
  if (!at) return false;
  if (range.from && Temporal.Instant.compare(at, range.from) < 0) return false;
  if (range.to && Temporal.Instant.compare(at, range.to) > 0) return false;
  return true;
};

/** UTC calendar day of an instant, as YYYY-MM-DD. */
export const utcDay = (instant: Temporal.Instant): string =>
  instant.toZonedDateTimeISO("UTC").toPlainDate().toString();