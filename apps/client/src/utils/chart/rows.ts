import { isNum } from "../../components/SkinTrendPanel";
import { MAX_POINTS, METRICS, OVERALL_KEY } from "../constants";
import { dayKey, fmtLong, fmtShort, toUTC } from "../dateRange";

const round1 = (n: number) => Math.round(n * MAX_POINTS) / MAX_POINTS;
const avg = (vals: (number | null | undefined)[]) => {
  const nums = vals.filter(isNum);
  return nums.length ? round1(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
};

export function buildRows(slice: SkinScan[]): ChartRow[] {
  if (!slice.length) return [];
  const n = Math.min(slice.length, MAX_POINTS);
  return Array.from({ length: n }, (_, i) => {
    const from = Math.floor((i * slice.length) / n);
    const to = Math.floor(((i + 1) * slice.length) / n);
    const bucket = slice.slice(from, Math.max(to, from + 1));
    const firstMs = toUTC(dayKey(bucket[0].createdAt));
    const lastMs = toUTC(dayKey(bucket[bucket.length - 1].createdAt));
    const row: ChartRow = {
      label: fmtShort(lastMs),
      fullLabel:
        firstMs === lastMs
          ? fmtLong(firstMs)
          : `${fmtShort(firstMs)} – ${fmtLong(lastMs)}`,
    };
    row[OVERALL_KEY] = avg(bucket.map((s) => s.score));
    for (const metric of METRICS) {
      row[metric.label] = avg(
        bucket.map((s) =>
          s.analysis ? metric.pick(s.analysis as SkinAnalysis) : null,
        ),
      );
    }
    return row;
  });
}