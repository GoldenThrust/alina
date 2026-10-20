import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useAverageScore,
  useLatestScan,
  useScanHistoryInRange,
} from "../stores";
import { buildRows } from "../utils/chart/rows";
import { periods, type Period, type PeriodState } from "../utils/chart/period";
import { METRICS, OVERALL_KEY } from "../utils/constants";

/* ---------- Shared constants & types (also used by the page) ---------- */

export const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const PALETTE = [
  "#e5645a",
  "#c98a3f",
  "#d4b72f",
  "#7fb069",
  "#3fae8c",
  "#2fa3b8",
  "#4a8fe0",
  "#6a74e0",
  "#8b63d6",
  "#b258c8",
  "#d9569c",
  "#9c6b4e",
  "#6f8a99",
  "#5c9e4f",
  "#c46f7a",
];

const fmtPct = (n: number) => `${Math.abs(Math.round(n))}%`;

/* ---------- Tooltip ---------- */

type TipEntry = {
  dataKey?: string | number;
  name?: string;
  value?: number | string | null;
  color?: string;
  payload?: ChartRow;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TipEntry[];
}) {
  if (!active || !payload?.length) return null;
  const entries = [...payload]
    .filter((p) => isNum(p.value))
    .sort((a, b) => (b.value as number) - (a.value as number));
  return (
    <div className="chart-tooltip">
      <strong>{payload[0].payload?.fullLabel}</strong>
      {entries.map((p) => (
        <div className="chart-tooltip-row" key={String(p.dataKey)}>
          <i style={{ background: p.color }} />
          <span>{p.name}</span>
          <b>{p.value}</b>
        </div>
      ))}
    </div>
  );
}

/* ---------- Component ---------- */

type Props = {
  startDate: string | null;
  endDate: string | null;
  period: PeriodState;
  onSelectPeriod: (period: Period) => void;
};

export default function SkinTrendPanel({
  startDate,
  endDate,
  period,
  onSelectPeriod,
}: Props) {
  const [overallOnly, setOverallOnly] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const scans = useScanHistoryInRange(startDate, endDate);
  const rows = useMemo(() => buildRows(scans), [scans]);
  const latestScan = useLatestScan();
  const averageScore = useAverageScore(startDate, endDate);

  const toggleSeries = useCallback(
    (label: string) =>
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        return next;
      }),
    [],
  );

  const showAllSeries = () => setHidden(new Set());
  const hideAllSeries = () => setHidden(new Set(METRICS.map((m) => m.label)));

  const overallScore =
    averageScore && latestScan?.score && latestScan.score > 0
      ? ((averageScore - latestScan.score) / latestScan.score) * 100
      : 0;

  const trendPositive = overallScore >= 0;
  const TrendIcon = trendPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="panel progress-chart-panel">
      <div className="section-heading">
        <div>
          <p className="page-eyebrow">TREND</p>
          <h2>{overallOnly ? "Overall score" : "All analysis trends"}</h2>
          <p className="muted-copy">
            A gentle signal to explore, not a diagnosis.
          </p>
        </div>
        <span
          className={`trend-pill ${trendPositive ? "positive" : "neutral"}`}
        >
          <TrendIcon size={15} /> {trendPositive ? "+" : "-"}
          {fmtPct(overallScore)} <small>overall score</small>
        </span>
      </div>

      <div className="chart-controls">
        <div className="chart-tabs" role="tablist" aria-label="Trend period">
          {periods.map((item) => (
            <button
              className={period === item ? "selected" : ""}
              type="button"
              role="tab"
              aria-selected={period === item}
              key={item}
              onClick={() => onSelectPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`button button-secondary overall-toggle${overallOnly ? " active" : ""}`}
          aria-pressed={overallOnly}
          onClick={() => setOverallOnly((v) => !v)}
        >
          Overall score only
        </button>
      </div>

      {!overallOnly && (
        <div className="series-chips" role="group" aria-label="Metrics shown">
          {METRICS.map((m, i) => {
            const on = !hidden.has(m.label);
            return (
              <button
                key={m.label}
                type="button"
                className={`series-chip${on ? " on" : ""}`}
                aria-pressed={on}
                onClick={() => toggleSeries(m.label)}
                style={{ color: PALETTE[i % PALETTE.length] }}
              >
                {m.label}
              </button>
            );
          })}
          <button
            type="button"
            className="series-chip-action"
            onClick={showAllSeries}
          >
            Show all
          </button>
          <button
            type="button"
            className="series-chip-action"
            onClick={hideAllSeries}
          >
            Hide all
          </button>
        </div>
      )}

      <div className="chart-area" style={{ width: "100%", height: 280 }}>
        {rows.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              responsive
              data={rows}
              margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                strokeOpacity={0.12}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<ChartTooltip />} />
              {!overallOnly &&
                METRICS.map((m, i) =>
                  hidden.has(m.label) ? null : (
                    <Line
                      key={m.label}
                      type="monotone"
                      dataKey={m.label}
                      name={m.label}
                      stroke={PALETTE[i % PALETTE.length]}
                      strokeWidth={1.5}
                      strokeOpacity={0.85}
                      dot={false}
                      activeDot={{ r: 3 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ),
                )}
              <Line
                type="monotone"
                dataKey={OVERALL_KEY}
                name={OVERALL_KEY}
                stroke="var(--chart-color, #4f9d8f)"
                strokeWidth={3.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted-copy">No check-ins in this range.</p>
        )}
      </div>
      {/* <p className="chart-footnote">
        Illustrative values · no real scans are stored yet
      </p> */}
    </section>
  );
}
