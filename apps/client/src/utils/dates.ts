/** Run API JSON timestamps through this before they enter a store. */
export const toDate = (value: string | null | undefined): Date | null =>
  value ? new Date(value) : null;

export const now = () => new Date();

export const newestFirst =
  <T>(get: (item: T) => Date) =>
  (a: T, b: T) =>
    get(b).getTime() - get(a).getTime();

export const oldestFirst =
  <T>(get: (item: T) => Date) =>
  (a: T, b: T) =>
    get(a).getTime() - get(b).getTime();

/** Local calendar day as "YYYY-MM-DD" (device timezone). Used for streaks. */
export const localDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** New Date moved by `days` calendar days (negative goes back). */
export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const isFuture = (date: Date) => date.getTime() > Date.now();

export function getDateInfo() {
  const now = new Date();
  const hour = now.getHours();

  return {
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now),

    period: `${
      hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : "evening"
    }`,
  };
}







export function stringToDate<T extends Record<string, any>[]>(dto: T): T {
  return dto.map((item) => {
    item.createdAt = new Date(item.createdAt);
    return item;
  }) as T;
}