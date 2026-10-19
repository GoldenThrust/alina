import { ArrowDownRight, ArrowUpRight, CalendarDays } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeading from "../components/PageHeading";
import SkinRadarPanel from "../components/SkinRadarPanel";
import SkinTrendPanel from "../components/SkinTrendPanel";
import { useScanHistory, useScoreDeltaPercent } from "../stores";
import { periods, type Period, type PeriodState } from "../utils/chart/period";
import {
  fmtLong,
  fmtShort,
  presetRange,
  dayKey,
  toUTC,
  type Range,
} from "../utils/dateRange";
import {
  ANALYSIS_DIRECTION,
  analysisMeta,
  getAnalysisNote,
} from "../utils/analysis";

const DEFAULT_PERIOD: Period = "7 days";

export default function Progress() {
  const history = useScanHistory();
  const scoreDeltaPercent = useScoreDeltaPercent();

  const [period, setPeriod] = useState<PeriodState>(DEFAULT_PERIOD);
  const [customRange, setCustomRange] = useState<Range | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<Range>({ start: "", end: "" });
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const bounds = useMemo<Range | null>(() => {
    if (!history.length) return null;
    return {
      start: dayKey(history[0].createdAt),
      end: dayKey(history[history.length - 1].createdAt),
    };
  }, [history]);

  const range = useMemo<Range | null>(() => {
    if (!bounds) return null;
    if (period === "Custom" && customRange) return customRange;
    return presetRange(period === "Custom" ? DEFAULT_PERIOD : period, bounds);
  }, [bounds, period, customRange]);

  // Close picker on outside click / Escape
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const selectPeriod = (p: Period) => {
    setPeriod(p);
    setCustomRange(null);
    setError(null);
  };

  const togglePicker = () => {
    if (!pickerOpen && range) {
      setDraft(range);
      setError(null);
    }
    setPickerOpen((o) => !o);
  };

  const applyDraft = () => {
    if (!bounds) return;
    if (!draft.start || !draft.end) {
      setError("Choose both a start and an end date.");
      return;
    }
    if (toUTC(draft.start) > toUTC(draft.end)) {
      setError("Start date must be on or before the end date.");
      return;
    }
    if (
      toUTC(draft.start) < toUTC(bounds.start) ||
      toUTC(draft.end) > toUTC(bounds.end)
    ) {
      setError(
        `Pick dates between ${fmtLong(toUTC(bounds.start))} and ${fmtLong(toUTC(bounds.end))}.`,
      );
      return;
    }
    const match = periods.find((p) => {
      const r = presetRange(p, bounds);
      return r.start === draft.start && r.end === draft.end;
    });
    if (match) {
      setPeriod(match);
      setCustomRange(null);
    } else {
      setPeriod("Custom");
      setCustomRange(draft);
    }
    setPickerOpen(false);
  };

  const resetPicker = () => {
    selectPeriod(DEFAULT_PERIOD);
    setPickerOpen(false);
  };

  const rangeLabel = range
    ? `${fmtShort(toUTC(range.start))} - ${fmtShort(toUTC(range.end))}`
    : "Select dates";

  const visibleItems = Object.entries(scoreDeltaPercent?.analysis ?? {})
    .map(([key, value]: [string, number | PoreScores | WrinkleScores]) => ({ key, value }))
    .filter((item) => {
      const [label, region] = item.key.split(".");
      return (!region || region === "whole") && analysisMeta[label];
    });

  return (
    <div className="page-content progress-page">
      <PageHeading
        eyebrow="Patterns, not perfection"
        title="Your skin journey"
        description="A sample view of how check-ins can make gradual changes easier to notice."
        action={
          <div className="period-picker" ref={pickerRef}>
            <button
              className="button button-secondary period-action"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              disabled={!range}
              onClick={togglePicker}
            >
              <CalendarDays size={16} /> {rangeLabel}
            </button>

            {pickerOpen && bounds && (
              <div
                className="period-popover"
                role="dialog"
                aria-label="Choose date range"
              >
                <label>
                  <span>From</span>
                  <input
                    type="date"
                    value={draft.start}
                    min={bounds.start}
                    max={draft.end || bounds.end}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, start: e.target.value }));
                      setError(null);
                    }}
                  />
                </label>
                <label>
                  <span>To</span>
                  <input
                    type="date"
                    value={draft.end}
                    min={draft.start || bounds.start}
                    max={bounds.end}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, end: e.target.value }));
                      setError(null);
                    }}
                  />
                </label>
                {error && (
                  <p className="period-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="period-popover-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={resetPicker}
                  >
                    Reset
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setPickerOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={applyDraft}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        }
      />

      <SkinTrendPanel
        startDate={range?.start ?? null}
        endDate={range?.end ?? null}
        period={period}
        onSelectPeriod={selectPeriod}
      />

      <div className="progress-detail-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="page-eyebrow">A FEW SIGNALS</p>
              <h2>What's moving</h2>
            </div>
          </div>
          <div className="movement-list">
            {visibleItems.length ? (
              visibleItems.map((item) => {
                console.log("item", item);
                const [itemLabel, _] = item.key.split(".");
                const metaData = analysisMeta[itemLabel];
                const analysisDirection = ANALYSIS_DIRECTION[itemLabel];

                if (typeof item.value !== "number") item.value = item.value["whole"] as number;
              
                const isPositive = item.value > 0;
                const isNegative = item.value < 0;
                const isNeutral = item.value === 0;
                const isImprovement =
                  (analysisDirection === "higher" && isPositive) ||
                  (analysisDirection === "lower" && isNegative);

                return (
                  <div key={item.key}>
                    <span className={`quick-icon ${metaData.color}`}>
                      <metaData.icon size={16} />
                    </span>
                    <span>
                      <strong>{metaData.label}</strong>
                      <small>
                        {getAnalysisNote(item.value, analysisDirection)}
                      </small>
                    </span>
                    <b
                      className={`attribute-change ${
                        isNeutral
                          ? "neutral"
                          : isImprovement
                            ? "positive"
                            : "negative"
                      }`}
                    >
                      {isPositive && <ArrowUpRight size={14} />}
                      {isNegative && <ArrowDownRight size={14} />}
                      {item.value.toPrecision(3)}%
                    </b>
                  </div>
                );
              })
            ) : (
              <div className="absolute text-slate-600">No data available</div>
            )}
          </div>
        </section>

        <SkinRadarPanel
          startDate={range?.start ?? null}
          endDate={range?.end ?? null}
        />
      </div>
    </div>
  );
}
