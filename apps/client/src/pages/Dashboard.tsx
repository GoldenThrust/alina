import { useEffect } from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "motion/react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Minus,
  ScanFace,
  Sparkles,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import PageHeading from "../components/PageHeading";
import { getDateInfo } from "../utils/dates";
import {
  useAuthStore,
  useLatestScan,
  useScans,
  useScoreDeltaPercent,
  useSortedAnalysisDelta,
} from "../stores";
import {
  ANALYSIS_DIRECTION,
  analysisMeta,
  getAnalysisNote,
} from "../utils/analysis";

/* ---------- Motion presets ---------- */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Page-level choreography: children fade up one after another
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

// Lists inside a panel stagger a little faster
const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
};
const row: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } },
};

const MotionLink = motion.create(Link);

/* ---------- Helpers ---------- */

type Tone = "high" | "mid" | "low";
const scoreTone = (score: number): Tone => (score >= 80 ? "high" : score >= 60 ? "mid" : "low");

function timeAgo(value: Date | string): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

const QUICK_ACTIONS: { to: string; color: string; icon: LucideIcon; title: string; subtitle: string }[] = [
  { to: "/scan", color: "violet", icon: ScanFace, title: "Scan again", subtitle: "Start a sample check-in" },
  { to: "/progress", color: "blue", icon: Waves, title: "View progress", subtitle: "Explore the sample timeline" },
  { to: "/recommendations", color: "rose", icon: Sparkles, title: "Recommendations", subtitle: "See a sample match" },
];

/* ---------- Small components ---------- */

/** Counts up to `value`, and re-animates whenever it changes. */
function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: 1.1, ease: "easeOut" });
    return () => controls.stop();
  }, [value, reduce, motionValue]);

  return <motion.strong>{rounded}</motion.strong>;
}

function ScoreRing({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="score-ring empty" aria-label="No skin score yet">
        <ScanFace size={26} />
      </div>
    );
  }

  return (
    <div className={`score-ring tone-${scoreTone(score)}`} role="img" aria-label={`Skin score ${score} out of 100`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r="44" />
        <motion.circle
          className="ring-fill"
          cx="50"
          cy="50"
          r="44"
          transform="rotate(-90 50 50)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: score / 100, opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.25, ease: EASE }}
        />
      </svg>
      <div>
        <CountUp value={score} />
        <span>SKIN SCORE</span>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  to,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  to?: string;
  cta?: string;
}) {
  return (
    <div className="empty-panel">
      <span className="empty-panel-icon">
        <Icon size={18} />
      </span>
      <strong>{title}</strong>
      <small>{text}</small>
      {to && cta ? (
        <Link className="quiet-link" to={to}>
          {cta} <ArrowRight size={14} />
        </Link>
      ) : null}
    </div>
  );
}

/* ---------- Page ---------- */

export default function Dashboard() {
  const { date, period } = getDateInfo();
  const user = useAuthStore((state: AuthState) => state.user);
  const latestScan = useLatestScan();
  const recentScans = useScans();
  const sortedAnalysisDelta = useSortedAnalysisDelta();
  const scoreDeltaPercent = useScoreDeltaPercent();

  const score = latestScan?.score ?? null;
  const delta = scoreDeltaPercent?.score ?? null;
  const timeline = recentScans.slice(0, 5);

  const topItems = sortedAnalysisDelta
    .filter((entry) => {
      const region = entry.key.split(".")[1];
      return !region || region === "whole";
    })
    .slice(0, 5);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="page-content dashboard-page"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <PageHeading
            eyebrow={date}
            title={`Good ${period}, ${user?.fullName?.split(" ")[0] || "there"}!`}
            description="A small check-in can make your routine feel a little more personal."
            action={
              <Link className="button button-primary" to="/scan">
                <ScanFace size={17} /> Start a scan
              </Link>
            }
          />
        </motion.div>

        <section className="overview-grid">
          <motion.div className="panel skin-summary" variants={item}>
            <div className="section-kicker">
              <span className="status-dot" /> YOUR SKIN TODAY
            </div>

            <div className="summary-main">
              {/* Crossfades when a new scan arrives */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={latestScan?.id ?? "empty"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2>
                    {latestScan?.aiShortObservation ??
                      (latestScan ? "No recent observations" : "Your first scan is waiting")}
                  </h2>
                  <p>
                    {latestScan?.aiSummary ??
                      (latestScan
                        ? "No detailed summary available."
                        : "Take a scan and Alina will start tracking how your skin changes over time.")}
                  </p>
                </motion.div>
              </AnimatePresence>
              <ScoreRing score={score} />
            </div>

            <div className="summary-foot">
              <div className="summary-foot-left">
                {delta !== null ? (
                  <span
                    className={`delta-pill ${delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"}`}
                  >
                    {delta > 0 ? (
                      <ArrowUpRight size={14} />
                    ) : delta < 0 ? (
                      <ArrowDownRight size={14} />
                    ) : (
                      <Minus size={14} />
                    )}
                    {delta === 0 ? "No change" : `${Math.abs(delta).toFixed(1)} points`}
                    <small>vs. previous scan</small>
                  </span>
                ) : null}
                {latestScan ? <small className="last-scan">Last scan {timeAgo(latestScan.createdAt)}</small> : null}
              </div>
              {latestScan ? (
                <Link to="/scan-result">
                  View last result <ArrowRight size={15} />
                </Link>
              ) : (
                <Link to="/scan">
                  Start your first scan <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </motion.div>

          <motion.div className="panel next-step-panel" variants={item}>
            <div className="section-kicker">A THOUGHTFUL NEXT STEP</div>
            <motion.div
              className="next-step-icon"
              whileHover={{ rotate: 12, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
            >
              <Sparkles size={19} />
            </motion.div>
            <h2>Keep the routine simple.</h2>
            <p>
              Consistency gives you a clearer picture than changing everything at once.
            </p>
            <Link className="quiet-link" to="/routine">
              Review your routine <ArrowRight size={15} />
            </Link>
          </motion.div>
        </section>

        <section className="quick-actions-section">
          <motion.div className="section-heading" variants={item}>
            <div>
              <p className="page-eyebrow">PICK UP WHERE YOU LEFT OFF</p>
              <h2>Quick actions</h2>
            </div>
            <Link className="quiet-link" to="/chat">
              Ask Alina <ArrowRight size={15} />
            </Link>
          </motion.div>
          <div className="quick-actions-grid">
            {QUICK_ACTIONS.map(({ to, color, icon: Icon, title, subtitle }) => (
              <MotionLink
                key={to}
                to={to}
                className="quick-action"
                variants={item}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className={`quick-icon ${color}`}>
                  <Icon size={19} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{subtitle}</small>
                </span>
                <ArrowRight className="quick-arrow" size={16} />
              </MotionLink>
            ))}
          </div>
        </section>

        <section className="dashboard-lower-grid">
          <motion.div className="panel timeline-panel" variants={item}>
            <div className="section-heading">
              <div>
                <p className="page-eyebrow">YOUR RECENT CHECK-INS</p>
                <h2>Skin journey</h2>
              </div>
              <Link className="quiet-link" to="/progress">
                See all <ArrowRight size={15} />
              </Link>
            </div>

            {timeline.length > 0 ? (
              <motion.div className="timeline-list" variants={list}>
                {timeline.map((scan, index) => (
                  <motion.div className="timeline-row" key={scan.id} variants={row}>
                    <span className={`timeline-marker ${index === 0 ? "current" : ""}`} />
                    <span className="timeline-date">
                      <strong>{scan.createdAt.toLocaleDateString("en-US", { weekday: "long" })}</strong>
                      <small>{scan.createdAt.toLocaleString("en-US", { month: "short", day: "numeric" })}</small>
                    </span>
                    <span className="timeline-note">{scan.aiShortSummary}</span>
                    <span
                      className={`timeline-score ${scan.score != null ? `tone-${scoreTone(scan.score)}` : ""}`}
                    >
                      {scan.score ?? "–"}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={ScanFace}
                title="No check-ins yet"
                text="Your scans will show up here as a timeline."
                to="/scan"
                cta="Start a scan"
              />
            )}
          </motion.div>

          <motion.div className="panel attribute-panel" variants={item}>
            <div className="section-heading">
              <div>
                <p className="page-eyebrow">SIGNALS</p>
                <h2>In focus</h2>
              </div>
              <Link to="/scan-result" aria-label="View latest scan result">
                <ArrowRight size={16} />
              </Link>
            </div>

            {topItems.length > 0 ? (
              <motion.div className="attribute-list" variants={list}>
                {topItems.map((entry) => {
                  const [itemLabel] = entry.key.split(".");
                  const meta = analysisMeta[itemLabel];
                  if (!meta) return null;

                  const direction = ANALYSIS_DIRECTION[itemLabel];
                  const isPositive = entry.value > 0;
                  const isNegative = entry.value < 0;
                  const isImprovement =
                    (direction === "higher" && isPositive) || (direction === "lower" && isNegative);
                  const Icon = meta.icon;

                  return (
                    <motion.div key={entry.key} variants={row}>
                      <span className={`quick-icon ${meta.color}`}>
                        <Icon size={16} />
                      </span>
                      <span>
                        <strong>{meta.label}</strong>
                        <small>{getAnalysisNote(entry.value, direction)}</small>
                      </span>
                      <span
                        className={`attribute-change ${
                          entry.value === 0 ? "neutral" : isImprovement ? "positive" : "negative"
                        }`}
                      >
                        {isPositive && <ArrowUpRight size={14} />}
                        {isNegative && <ArrowDownRight size={14} />}
                        {Math.abs(entry.value)}%
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <EmptyState
                icon={Waves}
                title="Nothing in focus yet"
                text="Complete two scans and Alina will highlight what changed."
              />
            )}
          </motion.div>
        </section>
      </motion.div>
    </MotionConfig>
  );
}