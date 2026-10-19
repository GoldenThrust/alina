export const periods = [
  "7 days",
  "30 days",
  "90 days",
  "All time",
] as const;

export type Period = (typeof periods)[number];

export type PeriodState = Period | "Custom";