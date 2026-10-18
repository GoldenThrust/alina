export function percentageChange(
  latest: number,
  previous: number,
) {
  if (previous === 0) return 0;

  return ((latest - previous) / previous) * 100;
}