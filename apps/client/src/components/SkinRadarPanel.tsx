import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AXES } from "../utils/chart/chart";
import { useAuthStore, useScanComparison } from "../stores";
import SkinProfileSummary from "./SkinProfileSummary";
/* ---------- Axis definitions ---------- */

const VIEWS: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "pores", label: "Pores" },
  { id: "wrinkles", label: "Wrinkles" },
];

type Row = { axis: string; current: number; previous?: number };

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

type Props = {
  startDate: string | null;
  endDate: string | null;
};

export default function SkinRadarPanel({ startDate, endDate }: Props) {
  const { current: currentScan, previous: previousScan } = useScanComparison(
    startDate,
    endDate,
  );
  const user = useAuthStore((s) => s.user);

  const current = currentScan?.analysis;
  const previous = previousScan?.analysis;

  const [view, setView] = useState<View>("overview");
  const [compare, setCompare] = useState(false);

  const canCompare = !!previous;
  const showCompare = compare && canCompare;

  const rows = useMemo<Row[]>(() => {
    if (!current) return [];
    return AXES[view].flatMap((axis) => {
      const cur = axis.pick(current);
      if (!isNum(cur)) return []; // skip metrics the scan didn't return
      const prev = previous ? axis.pick(previous) : undefined;
      return [
        {
          axis: axis.label,
          current: cur,
          previous: isNum(prev) ? prev : undefined,
        },
      ];
    });
  }, [current, previous, view]);

  const average = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.current, 0) / rows.length)
    : null;

  // A radar needs at least 3 axes to form a polygon
  const hasEnough = rows.length >= 3;

  return (
    <section className="panel radar-panel  flex justify-between flex-col">
      <div className="section-heading">
        <div>
          <p className="page-eyebrow">SKIN PROFILE</p>
          <h2>All analysis at a glance</h2>
          <p className="muted-copy">Higher scores are better.</p>
        </div>
        {average !== null && (
          <span className="trend-pill positive">
            <Sparkles size={15} /> {average} <small>avg score</small>
          </span>
        )}
      </div>

      <div className="radar-controls">
        <div
          className="chart-tabs"
          role="tablist"
          aria-label="Radar chart view"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              className={view === v.id ? "selected" : ""}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`button button-secondary radar-compare${showCompare ? " active" : ""}`}
          aria-pressed={showCompare}
          disabled={!canCompare}
          onClick={() => setCompare((c) => !c)}
        >
          Compare with previous
        </button>
      </div>

      <div className="radar-area">
        {hasEnough ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={rows} outerRadius="68%" key={view}>
              <PolarGrid stroke="currentColor" strokeOpacity={0.15} />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tickCount={5}
                tick={{ fontSize: 10 }}
                axisLine={false}
              />
              {showCompare && (
                <Radar
                  name="Previous"
                  dataKey="previous"
                  stroke="#9aa5b1"
                  strokeDasharray="4 3"
                  strokeWidth={2}
                  fill="#9aa5b1"
                  fillOpacity={0.12}
                  isAnimationActive
                  animationDuration={400}
                />
              )}
              <Radar
                name="Current"
                dataKey="current"
                stroke="var(--chart-color, #4f9d8f)"
                strokeWidth={2.5}
                fill="var(--chart-color, #4f9d8f)"
                fillOpacity={0.3}
                dot={{ r: 3 }}
                isAnimationActive
                animationDuration={400}
              />
              <Tooltip
                // format/ter={(v: number, name: string) => [v, name]}
                contentStyle={{ borderRadius: 12, fontSize: 13 }}
              />
              {showCompare && <Legend wrapperStyle={{ fontSize: 12 }} />}
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted-copy radar-empty">
            Not enough analysis data for this view yet.
          </p>
        )}
      </div>
      
      <SkinProfileSummary
        skinType={view === "overview" ? current?.skinType : null}
        skinAge={currentScan?.skinAge}
        skinTone={user?.skinTone}
        fitzpatrick={user?.skinType}
      />
    </section>
  );
}
