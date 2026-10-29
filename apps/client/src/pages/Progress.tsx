import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Loader2,
  RefreshCw,
  ScanFace,
  Star,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import CountUp from "../components/CountUp";
import PageHeading from "../components/PageHeading";
import SkinRadarPanel from "../components/SkinRadarPanel";
import SkinTrendPanel from "../components/SkinTrendPanel";
import { useSkinScan } from "../hooks/useSkinScan";
import { useAuthStore, useScanHistory, useScoreDeltaPercent } from "../stores";
import {
  analysisMeta,
  getAnalysisNote,
} from "../utils/analysis";
import { periods, type Period, type PeriodState } from "../utils/chart/period";
import {
  dayKey,
  fmtLong,
  fmtShort,
  presetRange,
  toUTC,
  type Range,
} from "../utils/dateRange";
import { EASE, container, item } from "../utils/motion";
import { periodToHistoryRequest } from "../utils/historyRequest";

const DEFAULT_PERIOD: Period = "7 days";

/* ---------- Formatting (module-level so CountUp gets stable functions) ---------- */

const formatInt = (v: number) => String(Math.round(v));
const formatOneDecimal = (v: number) => v.toFixed(1);
const formatSigned = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;

/* ---------- Movement list ---------- */

type MovementFilter = "all" | "improving" | "attention";

const FILTERS: { id: MovementFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "improving", label: "Improving" },
  { id: "attention", label: "Needs attention" },
];

interface Movement {
  key: string;
  label: string;
  meta: (typeof analysisMeta)[string];
  value: number;
  /** null when nothing changed */
  improving: boolean | null;
}

/* ---------- Small components ---------- */

function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

function StatusBanner({
  title,
  text,
  onRetry,
}: {
  title: string;
  text: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      className="status-banner-wrap"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <div className="status-banner" role="alert">
        <span className="status-banner-icon">
          <AlertTriangle size={16} />
        </span>
        <p>
          <strong>{title}</strong>
          <small>{text}</small>
        </p>
        <button
          className="button button-secondary"
          type="button"
          onClick={onRetry}
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  format,
  hint,
  loading,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: number | null;
  format: (v: number) => string;
  hint: string;
  loading: boolean;
}) {
  return (
    <motion.div className="panel stat-card" variants={item}>
      <span className={`quick-icon ${tone}`}>
        <Icon size={17} />
      </span>
      <div>
        <small className="stat-label">{label}</small>
        {loading ? (
          <Skeleton className="skeleton-stat" />
        ) : value === null ? (
          <strong className="stat-empty">–</strong>
        ) : (
          <CountUp value={value} format={format} />
        )}
        <small className="stat-hint">{hint}</small>
      </div>
    </motion.div>
  );
}

/* ---------- Page ---------- */

export default function Progress() {
  const { status, historyStatus, loadHistory, retryLoad, retryHistory } =
    useSkinScan();
  const history = useScanHistory(); // oldest first
  const user = useAuthStore((state: AuthState) => state.user);
  const scoreDeltaPercent = useScoreDeltaPercent();

  const [period, setPeriod] = useState<PeriodState>(DEFAULT_PERIOD);
  const [customRange, setCustomRange] = useState<Range | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<Range>({ start: "", end: "" });
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MovementFilter>("all");
  const pickerRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "loading";
  const isEmpty = status === "ready" && history.length === 0;

  /**
   * The pickable window runs from the day the account was created (or the oldest loaded scan,
   * if earlier) to the newest scan. This lets the user pick ranges older than what is loaded,
   * which is what makes loadHistory useful.
   */
  const bounds = useMemo<Range | null>(() => {
    if (!history.length) return null;
    const oldest = dayKey(history[0].createdAt);
    const joined = user?.createdAt ? dayKey(new Date(user.createdAt)) : oldest;
    return {
      start: joined < oldest ? joined : oldest,
      end: dayKey(history[history.length - 1].createdAt),
    };
  }, [history, user?.createdAt]);

  const range = useMemo<Range | null>(() => {
    if (!bounds) return null;
    if (period === "Custom" && customRange) return customRange;
    return presetRange(period === "Custom" ? DEFAULT_PERIOD : period, bounds);
  }, [bounds, period, customRange]);

  const rangeLabel = range
    ? `${fmtShort(toUTC(range.start))} - ${fmtShort(toUTC(range.end))}`
    : "Select dates";

  /* ----- Backend: fetch older scans whenever the range reaches past what's loaded ----- */

  const historyRequest = useMemo(
    () => periodToHistoryRequest(period, customRange),
    [period, customRange],
  );

  useEffect(() => {
    // Wait for the initial /scans load so the two requests don't race
    if (status !== "ready") return;
    void loadHistory(historyRequest);
  }, [status, historyRequest, loadHistory]);

  /* ----- Stats for the selected range ----- */

  const stats = useMemo(() => {
    if (!range) return null;
    const inRange = history.filter((scan) => {
      const key = dayKey(scan.createdAt);
      return key >= range.start && key <= range.end;
    });
    const scored = inRange.filter(
      (scan): scan is typeof scan & { score: number } => scan.score != null,
    );
    const average = scored.length
      ? scored.reduce((sum, scan) => sum + scan.score, 0) / scored.length
      : null;
    const change =
      scored.length >= 2
        ? scored[scored.length - 1].score - scored[0].score
        : null;
    return { count: inRange.length, average, change };
  }, [history, range]);

  /* ----- "What's moving" ----- */

  const movements = useMemo<Movement[]>(() => {
    const analysis = (scoreDeltaPercent?.analysis ?? {}) as Record<
      string,
      number | PoreScores | WrinkleScores
    >;

    return Object.entries(analysis)
      .flatMap(([key, raw]): Movement[] => {
        const [label, region] = key.split(".");
        if (region && region !== "whole") return [];
        const meta = analysisMeta[label];
        if (!meta) return [];

        const value =
          typeof raw === "number"
            ? raw
            : (raw as { whole?: number } | undefined)?.whole;
        if (typeof value !== "number" || !Number.isFinite(value)) return [];

        const improved = value > 0;
        return [
          {
            key,
            label,
            meta,
            value,
            improving: value === 0 ? null : improved,
          },
        ];
      })
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [scoreDeltaPercent]);

  const counts = useMemo(
    () => ({
      all: movements.length,
      improving: movements.filter((m) => m.improving === true).length,
      attention: movements.filter((m) => m.improving === false).length,
    }),
    [movements],
  );

  const visibleMovements = useMemo(
    () =>
      movements.filter((m) =>
        filter === "all"
          ? true
          : filter === "improving"
            ? m.improving === true
            : m.improving === false,
      ),
    [movements, filter],
  );
  const maxMagnitude = useMemo(
    () => Math.max(1, ...movements.map((m) => Math.abs(m.value))),
    [movements],
  );

  /* ----- Picker handlers ----- */

  const selectPeriod = useCallback((next: Period) => {
    setPeriod(next);
    setCustomRange(null);
    setError(null);
  }, []);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const togglePicker = useCallback(() => {
    if (!pickerOpen && range) {
      setDraft(range);
      setError(null);
    }
    setPickerOpen((open) => !open);
  }, [pickerOpen, range]);

  const changeDraft = useCallback((field: keyof Range, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError(null);
  }, []);

  const applyDraft = useCallback(() => {
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
  }, [bounds, draft]);

  const resetPicker = useCallback(() => {
    selectPeriod(DEFAULT_PERIOD);
    setPickerOpen(false);
  }, [selectPeriod]);

  // Close the picker on outside click / Escape
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      )
        closePicker();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen, closePicker]);

  /* ----- Render ----- */

  const changeTone =
    stats?.change == null
      ? "slate"
      : stats.change > 0
        ? "mint"
        : stats.change < 0
          ? "rose"
          : "slate";

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="page-content progress-page"
        variants={container}
        initial="hidden"
        animate="show"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <p className="sr-only" role="status">
            Loading your scans…
          </p>
        ) : null}

        <motion.div variants={item}>
          <PageHeading
            eyebrow="Patterns, not perfection"
            title="Your skin journey"
            description="See how your check-ins add up, and which signals are shifting over time."
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

                <AnimatePresence>
                  {pickerOpen && bounds ? (
                    <motion.div
                      className="period-popover"
                      role="dialog"
                      aria-label="Choose date range"
                      style={{ transformOrigin: "top right" }}
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.18, ease: EASE }}
                    >
                      <label>
                        <span>From</span>
                        <input
                          type="date"
                          value={draft.start}
                          min={bounds.start}
                          max={draft.end || bounds.end}
                          onChange={(event) =>
                            changeDraft("start", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        <span>To</span>
                        <input
                          type="date"
                          value={draft.end}
                          min={draft.start || bounds.start}
                          max={bounds.end}
                          onChange={(event) =>
                            changeDraft("end", event.target.value)
                          }
                        />
                      </label>
                      <p className="period-hint">
                        Available: {fmtShort(toUTC(bounds.start))} -{" "}
                        {fmtShort(toUTC(bounds.end))}
                      </p>
                      {error ? (
                        <p className="period-error" role="alert">
                          {error}
                        </p>
                      ) : null}
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
                          onClick={closePicker}
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
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            }
          />
        </motion.div>

        <AnimatePresence initial={false}>
          {status === "loadError" ? (
            <StatusBanner
              key="load-error"
              title="We couldn’t load your scans."
              text="Check your connection and try again."
              onRetry={retryLoad}
            />
          ) : historyStatus === "error" ? (
            <StatusBanner
              key="history-error"
              title="We couldn’t load earlier check-ins."
              text="The charts may be missing some of this range."
              onRetry={retryHistory}
            />
          ) : null}
        </AnimatePresence>

        {isEmpty ? (
          <motion.div className="panel progress-empty" variants={item}>
            <span className="empty-panel-icon">
              <ScanFace size={20} />
            </span>
            <h2>Your journey starts with a first scan</h2>
            <p>
              Once you have a few check-ins, trends and changes will show up
              here.
            </p>
            <Link className="button button-primary" to="/scan">
              <ScanFace size={16} /> Start a scan
            </Link>
          </motion.div>
        ) : (
          <>
            <section
              className="progress-stats"
              aria-label="Summary for the selected range"
            >
              <StatCard
                icon={ScanFace}
                tone="violet"
                label="Check-ins"
                value={stats?.count ?? null}
                format={formatInt}
                hint={range ? "in this range" : "select a range"}
                loading={isLoading}
              />
              <StatCard
                icon={Star}
                tone="blue"
                label="Average score"
                value={stats?.average ?? null}
                format={formatOneDecimal}
                hint={
                  stats?.average == null
                    ? "no scored scans"
                    : "across check-ins"
                }
                loading={isLoading}
              />
              <StatCard
                icon={TrendingUp}
                tone={changeTone}
                label="Change"
                value={stats?.change ?? null}
                format={formatSigned}
                hint={
                  stats?.change == null
                    ? "needs two scored scans"
                    : "first to last, in points"
                }
                loading={isLoading}
              />
            </section>

            <AnimatePresence>
              {historyStatus === "loading" ? (
                <motion.div
                  className="history-chip"
                  role="status"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Loader2 size={13} className="spin" /> Loading earlier
                  check-ins…
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div variants={item}>
              <SkinTrendPanel
                startDate={range?.start ?? null}
                endDate={range?.end ?? null}
                period={period}
                onSelectPeriod={selectPeriod}
              />
            </motion.div>

            <div className="progress-detail-grid">
              <motion.section className="panel" variants={item}>
                <div className="section-heading">
                  <div>
                    <p className="page-eyebrow">A FEW SIGNALS</p>
                    <h2>What’s moving</h2>
                  </div>
                </div>

                <div
                  className="movement-filters"
                  role="tablist"
                  aria-label="Filter signals"
                >
                  {FILTERS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={filter === id}
                      className={`filter-btn ${filter === id ? "selected" : ""}`}
                      onClick={() => setFilter(id)}
                    >
                      {filter === id ? (
                        <motion.span
                          layoutId="movement-filter-pill"
                          className="filter-pill"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 34,
                          }}
                        />
                      ) : null}
                      <span className="filter-label">
                        {label} <i>{counts[id]}</i>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="movement-list">
                  {isLoading ? (
                    Array.from({ length: 4 }, (_, i) => (
                      <div key={i} aria-hidden="true">
                        <Skeleton className="skeleton-icon" />
                        <span className="skeleton-stack">
                          <Skeleton className="skeleton-line" />
                          <Skeleton className="skeleton-line short" />
                        </span>
                        <Skeleton className="skeleton-change" />
                      </div>
                    ))
                  ) : visibleMovements.length > 0 ? (
                    <AnimatePresence mode="popLayout" initial={false}>
                      {visibleMovements.map((movement) => {
                        const Icon = movement.meta.icon;
                        const tone =
                          movement.improving === null
                            ? "neutral"
                            : movement.improving
                              ? "positive"
                              : "negative";

                        return (
                          <motion.div
                            key={movement.key}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.28, ease: EASE }}
                          >
                            <span
                              className={`quick-icon ${movement.meta.color}`}
                            >
                              <Icon size={16} />
                            </span>
                            <span>
                              <strong>{movement.meta.label}</strong>
                              <small>
                                {getAnalysisNote(
                                  movement.value,
                                  movement.improving ? "higher" : "lower",
                                )}
                              </small>
                            </span>
                            <span className="movement-bar" aria-hidden="true">
                              <motion.i
                                className={tone}
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${Math.max(6, (Math.abs(movement.value) / maxMagnitude) * 100)}%`,
                                }}
                                transition={{ duration: 0.6, ease: EASE }}
                              />
                            </span>
                            <b className={`attribute-change ${tone}`}>
                              {movement.value > 0 && <ArrowUpRight size={14} />}
                              {movement.value < 0 && (
                                <ArrowDownRight size={14} />
                              )}
                              {Math.abs(movement.value).toFixed(1)}%
                            </b>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  ) : (
                    <div className="empty-panel">
                      <span className="empty-panel-icon">
                        <TrendingUp size={18} />
                      </span>
                      <strong>
                        {movements.length
                          ? "Nothing in this group"
                          : "No changes to show yet"}
                      </strong>
                      <small>
                        {movements.length
                          ? "Try another filter."
                          : "Signals appear after you have at least two check-ins."}
                      </small>
                      {!movements.length ? (
                        <Link className="quiet-link" to="/scan">
                          Start a scan <ArrowRight size={14} />
                        </Link>
                      ) : null}
                    </div>
                  )}
                </div>
              </motion.section>

              <SkinRadarPanel
                startDate={range?.start ?? null}
                endDate={range?.end ?? null}
              />
            </div>
          </>
        )}
      </motion.div>
    </MotionConfig>
  );
}
