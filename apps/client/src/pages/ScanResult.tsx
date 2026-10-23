import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ScanFace,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import CountUp from "../components/CountUp";
import PageHeading from "../components/PageHeading";
import SkinRadarPanel from "../components/SkinRadarPanel";
import { useSkinScan, useSkinScanById } from "../hooks/useSkinScan";
// import { useSkinScanById } from "../hooks/useSkinScanById";
import { useScanStore } from "../stores";
import {
  ANALYSIS_DIRECTION,
  analysisMeta,
  getAnalysisNote,
} from "../utils/analysis";
import { EASE, container, item } from "../utils/motion";

/** Adjust to your router's path for this page. */
const resultPath = (id: string) => `/scan-result/${id}`;

const formatInt = (v: number) => String(Math.round(v));

const toneFor = (score: number) =>
  score >= 80 ? "tone-high" : score >= 60 ? "tone-mid" : "tone-low";

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

/* ---------- metrics ---------- */

type MetricFilter = "all" | "improving" | "attention";

const FILTERS: { id: MetricFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "improving", label: "Improving" },
  { id: "attention", label: "Needs attention" },
];

interface Metric {
  key: string;
  meta: (typeof analysisMeta)[string];
  direction: (typeof ANALYSIS_DIRECTION)[string];
  /** current value from this scan */
  value: number;
  /** percent change vs. the previous scan, null when there is no previous value */
  delta: number | null;
  /** null when unchanged or unknown */
  improving: boolean | null;
}

/** Reads a plain number, or the `whole` value of region scores such as pore / wrinkle. */
function readValue(raw: unknown): number | null {
  const value =
    typeof raw === "number" ? raw : (raw as { whole?: unknown } | null)?.whole;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildMetrics(
  current: SkinScan["analysis"],
  previous: SkinScan["analysis"] | null | undefined,
): Metric[] {
  if (!current) return [];
  const prev = (previous ?? {}) as Record<string, unknown>;

  return Object.entries(current).flatMap(([key, raw]): Metric[] => {
    const meta = analysisMeta[key];
    if (!meta) return [];
    const value = readValue(raw);
    if (value === null) return [];

    const before = readValue(prev[key]);
    const delta =
      before !== null && before !== 0
        ? ((value - before) / Math.abs(before)) * 100
        : null;

    const direction = ANALYSIS_DIRECTION[key];
    const improving =
      delta === null || delta === 0
        ? null
        : (direction === "higher" && delta > 0) ||
          (direction === "lower" && delta < 0);

    return [{ key, meta, direction, value, delta, improving }];
  });
}

/* ---------- small components ---------- */

function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

function ScoreRing({ score }: { score: number | null }) {
  if (score == null)
    return (
      <div className="sr-ring tone-mid">
        <strong className="stat-empty">–</strong>
        <span>skin score</span>
      </div>
    );
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className={`sr-ring ${toneFor(clamped)}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r="44" />
        <motion.circle
          className="ring-fill"
          cx="50"
          cy="50"
          r="44"
          transform="rotate(-90 50 50)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamped / 100 }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
        />
      </svg>
      <CountUp value={clamped} format={formatInt} />
      <span>skin score</span>
    </div>
  );
}

/* ---------- page ---------- */

export default function ScanResult() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // Makes sure the full history is in the store (no-op when it already is).
  useSkinScan();
  const { scan, status, retry } = useSkinScanById(id);

  // No id in the URL: once the latest scan is known, put its id in the URL.
  useEffect(() => {
    if (!id && scan) navigate(resultPath(scan.id), { replace: true });
  }, [id, scan, navigate]);

  const ids = useScanStore((s) => s.scans.ids);
  const byId = useScanStore((s) => s.scans.byId);
  const [filter, setFilter] = useState<MetricFilter>("all");

  /** Scans oldest -> newest, and the one right before the scan being viewed. */
  const previous = useMemo(() => {
    if (!scan) return null;
    const sorted = ids
      .map((k) => byId[k])
      .filter(Boolean)
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const index = sorted.findIndex((s) => s.id === scan.id);
    return index > 0 ? sorted[index - 1] : null;
  }, [scan, ids, byId]);

  /** Radar range: the scan before this one -> this scan, by createdAt. */
  const range = useMemo(() => {
    if (!scan) return null;
    return {
      start: new Date((previous ?? scan).createdAt).toISOString(),
      end: new Date(scan.createdAt).toISOString(),
    };
  }, [scan, previous]);

  const metrics = useMemo(
    () => buildMetrics(scan?.analysis as SkinAnalysis, previous?.analysis).sort(
      (a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0),
    ),
    [scan, previous],
  );

  const counts = useMemo(
    () => ({
      all: metrics.length,
      improving: metrics.filter((m) => m.improving === true).length,
      attention: metrics.filter((m) => m.improving === false).length,
    }),
    [metrics],
  );

  const visibleMetrics = useMemo(
    () =>
      metrics.filter((m) =>
        filter === "all"
          ? true
          : filter === "improving"
            ? m.improving === true
            : m.improving === false,
      ),
    [metrics, filter],
  );

  const maxMagnitude = useMemo(
    () => Math.max(1, ...metrics.map((m) => Math.abs(m.delta ?? 0))),
    [metrics],
  );

  const heading = (
    <motion.div variants={item}>
      <PageHeading
        eyebrow={scan ? `Check-in · ${formatDate(scan.createdAt)}` : "Check-in"}
        title="Scan result"
        description="What this scan found, and how it compares with your previous one."
        action={
          <Link className="button button-secondary" to="/scan">
            <ArrowLeft size={16} /> Back to scan
          </Link>
        }
      />
    </motion.div>
  );

  /* ----- non-ready states ----- */
  if (!scan) {
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          className="page-content result-page"
          variants={container}
          initial="hidden"
          animate="show"
          aria-busy={status === "loading"}
        >
          {heading}
          {status === "loading" ? (
            <motion.div className="panel sr-hero" variants={item}>
              <Skeleton className="sr-photo" />
              <div className="sr-body">
                <Skeleton className="skeleton-ring" />
                <Skeleton className="skeleton-title" />
                <Skeleton className="skeleton-line" />
                <Skeleton className="skeleton-line short" />
              </div>
            </motion.div>
          ) : (
            <motion.div className="panel empty-panel" variants={item}>
              <span className="empty-panel-icon">
                {status === "error" ? (
                  <AlertTriangle size={17} />
                ) : (
                  <ScanFace size={17} />
                )}
              </span>
              <strong>
                {status === "error"
                  ? "We couldn’t load this scan"
                  : status === "notFound"
                    ? "This scan doesn’t exist"
                    : "No scans yet"}
              </strong>
              <small>
                {status === "error"
                  ? "Check your connection and try again."
                  : "Take a scan to see your results here."}
              </small>
              {status === "error" ? (
                <button
                  className="button button-secondary retry-button"
                  type="button"
                  onClick={retry}
                >
                  Try again
                </button>
              ) : (
                <Link className="quiet-link" to="/scan">
                  Start a scan <ArrowRight size={14} />
                </Link>
              )}
            </motion.div>
          )}
        </motion.div>
      </MotionConfig>
    );
  }

  /* ----- ready ----- */
  const summary = scan.aiSummary ?? scan.aiShortSummary;
  const observation = scan.aiObservation ?? scan.aiShortObservation;
  const zones = scan.analysis?.skinType;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        key={scan.id}
        className="page-content result-page"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {heading}

        <div className="sr-stack">
          {/* Hero: the scan photo next to the result */}
          <motion.section variants={item} className="panel sr-hero">
            <motion.div
              className="sr-photo"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              {scan.image ? (
                <img
                  src={scan.image}
                  alt={`Face scan from ${formatDate(scan.createdAt)}`}
                />
              ) : (
                <div className="sr-photo-empty">
                  <ScanFace size={28} />
                  <small>No image saved for this scan</small>
                </div>
              )}
            </motion.div>

            <div className="sr-body">
              <div className="sr-headline">
                <ScoreRing score={scan.score} />
                <div className="sr-facts">
                  {scan.skinAge != null && (
                    <div>
                      <small>Skin age</small>
                      <CountUp value={scan.skinAge} format={formatInt} />
                    </div>
                  )}
                  {typeof scan.skinType === "string" && (
                    <div>
                      <small>Skin type</small>
                      <strong className="sr-cap">{scan.skinType}</strong>
                    </div>
                  )}
                </div>
              </div>

              {summary && <p className="sr-summary">{summary}</p>}
              {observation && <p className="sr-observation">{observation}</p>}

              {zones && (
                <div className="sr-zones">
                  {(
                    [
                      ["Overall", zones.whole],
                      ["T-zone", zones.t_zone],
                      ["U-zone", zones.u_zone],
                    ] as const
                  ).map(([label, value]) => (
                    <span key={label} className="zone-chip">
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </span>
                  ))}
                </div>
              )}

              <div className="result-actions">
                <Link className="button button-primary" to="/progress">
                  See your progress <ArrowRight size={16} />
                </Link>
                <Link className="quiet-link" to="/chat">
                  Ask about this result
                </Link>
              </div>
              <span className="confidence-note">
                A scan is one data point, not medical advice.
              </span>
            </div>
          </motion.section>

          {/* Radar and metrics side by side */}
          <motion.div variants={item} className="sr-split">
            {range && (
              <div className="sr-split-radar">
                <SkinRadarPanel startDate={range.start} endDate={range.end} />
              </div>
            )}

            {metrics.length > 0 && (
              <section className="panel metric-panel">
                <div className="section-heading">
                  <div>
                    <p className="page-eyebrow">Supporting signals</p>
                    <h2>
                      {previous ? "What changed since last scan" : "Skin metrics"}
                    </h2>
                  </div>
                </div>

                <div
                  className="movement-filters"
                  role="tablist"
                  aria-label="Filter signals"
                >
                  {FILTERS.map(({ id: filterId, label }) => (
                    <button
                      key={filterId}
                      type="button"
                      role="tab"
                      aria-selected={filter === filterId}
                      className={`filter-btn ${filter === filterId ? "selected" : ""}`}
                      onClick={() => setFilter(filterId)}
                    >
                      {filter === filterId ? (
                        <motion.span
                          layoutId="scan-metric-filter-pill"
                          className="filter-pill"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 34,
                          }}
                        />
                      ) : null}
                      <span className="filter-label">
                        {label} <i>{counts[filterId]}</i>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="movement-list">
                  {visibleMetrics.length > 0 ? (
                    <AnimatePresence mode="popLayout" initial={false}>
                      {visibleMetrics.map((metric) => {
                        const Icon = metric.meta.icon;
                        const tone =
                          metric.improving === null
                            ? "neutral"
                            : metric.improving
                              ? "positive"
                              : "negative";
                        const delta = metric.delta;

                        return (
                          <motion.div
                            key={metric.key}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.28, ease: EASE }}
                          >
                            <span className={`quick-icon ${metric.meta.color}`}>
                              <Icon size={16} />
                            </span>
                            <span>
                              <strong>{metric.meta.label}</strong>
                              <small>
                                {delta === null
                                  ? `Current value ${Math.round(metric.value)}`
                                  : getAnalysisNote(delta, metric.direction)}
                              </small>
                            </span>
                            <span className="movement-bar" aria-hidden="true">
                              <motion.i
                                className={tone}
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${
                                    delta === null
                                      ? Math.max(0, Math.min(100, metric.value))
                                      : Math.max(
                                          6,
                                          (Math.abs(delta) / maxMagnitude) * 100,
                                        )
                                  }%`,
                                }}
                                transition={{ duration: 0.6, ease: EASE }}
                              />
                            </span>
                            <b className={`attribute-change ${tone}`}>
                              {delta === null ? (
                                Math.round(metric.value)
                              ) : (
                                <>
                                  {delta > 0 && <ArrowUpRight size={14} />}
                                  {delta < 0 && <ArrowDownRight size={14} />}
                                  {Math.abs(delta).toFixed(1)}%
                                </>
                              )}
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
                      <strong>Nothing in this group</strong>
                      <small>Try another filter.</small>
                    </div>
                  )}
                </div>
              </section>
            )}
          </motion.div>

          <motion.section variants={item} className="panel result-next-panel">
            <div className="next-step-icon">
              <ScanFace size={18} />
            </div>
            <div>
              <p className="page-eyebrow">What’s next</p>
              <h2>Keep your routine consistent.</h2>
              <p>Scan again in a few days to build a clearer timeline.</p>
            </div>
            <Link className="quiet-link" to="/recommendations">
              See care picks <ArrowRight size={15} />
            </Link>
          </motion.section>
        </div>
      </motion.div>
    </MotionConfig>
  );
}