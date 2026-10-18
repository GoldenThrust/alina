import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ScanFace,
  Sparkles,
  Waves,
} from "lucide-react";
import { Link } from "react-router";
import PageHeading from "../components/PageHeading";
import { getDateInfo } from "../utils/date";
import {
  useAuthStore,
  useLatestScan,
  useScans,
  useScoreDeltaPercent,
  useSortedAnalysisDelta,
} from "../stores";
import { useState } from "react";
import {
  ANALYSIS_DIRECTION,
  analysisMeta,
  getAnalysisNote,
} from "../utils/analysis";

const { date, period } = getDateInfo();

export default function Dashboard() {
  const user = useAuthStore((state: AuthState) => state.user);
  const latestScan = useLatestScan();
  const recentScans = useScans();
  const sortedAnalysisDelta = useSortedAnalysisDelta();
  const scoreDeltaPercent = useScoreDeltaPercent();
  const [currentAnalysisDisplay, setCurrentAnalysisDisplay] =
    useState<number>(0);
  const score = latestScan?.score ?? 0;
  const scoreColor =
    score >= 80
      ? ["#7051eb", "#eeeafc"]
      : score >= 60
        ? ["#f59e0b", "#fef3c7"]
        : ["#ef4444", "#fee2e2"];

  return (
    <div className="page-content dashboard-page">
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
      <section className="overview-grid">
        <div className="panel skin-summary">
          <div className="section-kicker">
            <span className="status-dot" /> YOUR SKIN TODAY{" "}
            {/* <span className="demo-label">Latest SNAPSHOT</span> */}
          </div>
          <div className="summary-main">
            <div>
              <h2>
                {latestScan?.aiShortObservation
                  ? latestScan.aiShortObservation
                  : "No recent observations"}
              </h2>
              <p>
                {latestScan?.aiSummary
                  ? latestScan.aiSummary
                  : "No detailed Summary available."}
              </p>
            </div>
            <div
              className="score-ring"
              aria-label={`Skin score ${score}`}
              style={{
                background: `conic-gradient(${scoreColor[0]} 0 ${score}%, ${scoreColor[1]} ${score}% 100%)`,
              }}
            >
              <div>
                <strong>{score}</strong>
                <span>SKIN SCORE</span>
              </div>
            </div>
          </div>
          <div className="summary-foot">
            <span>
              {scoreDeltaPercent ? (
                <>
                  {scoreDeltaPercent.score && scoreDeltaPercent.score >= 0 ? (
                    <ArrowUpRight size={15} />
                  ) : (
                    <ArrowDownRight size={15} /> 
                  )} {scoreDeltaPercent.score} points{" "}
                  <small>vs. previous sample</small>
                </>
              ) : null}
            </span>
            <Link to="/scan-result">
              View last result <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <div className="panel next-step-panel">
          <div className="section-kicker">A THOUGHTFUL NEXT STEP</div>
          <div className="next-step-icon">
            <Sparkles size={19} />
          </div>
          <h2>Keep the routine simple.</h2>
          <p>
            Consistency gives you a clearer picture than changing everything at
            once.
          </p>
          <Link className="quiet-link" to="/routine">
            Review your routine <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <section className="quick-actions-section">
        <div className="section-heading">
          <div>
            <p className="page-eyebrow">PICK UP WHERE YOU LEFT OFF</p>
            <h2>Quick actions</h2>
          </div>
          <Link className="quiet-link" to="/chat">
            Ask Alina <ArrowRight size={15} />
          </Link>
        </div>
        <div className="quick-actions-grid">
          <Link className="quick-action" to="/scan">
            <span className="quick-icon violet">
              <ScanFace size={19} />
            </span>
            <span>
              <strong>Scan again</strong>
              <small>Start a sample check-in</small>
            </span>
            <ArrowRight className="quick-arrow" size={16} />
          </Link>
          <Link className="quick-action" to="/progress">
            <span className="quick-icon blue">
              <Waves size={19} />
            </span>
            <span>
              <strong>View progress</strong>
              <small>Explore the sample timeline</small>
            </span>
            <ArrowRight className="quick-arrow" size={16} />
          </Link>
          <Link className="quick-action" to="/recommendations">
            <span className="quick-icon rose">
              <Sparkles size={19} />
            </span>
            <span>
              <strong>Recommendations</strong>
              <small>See a sample match</small>
            </span>
            <ArrowRight className="quick-arrow" size={16} />
          </Link>
        </div>
      </section>
      <section className="dashboard-lower-grid">
        <div className="panel timeline-panel">
          <div className="section-heading">
            <div>
              <p className="page-eyebrow">YOUR RECENT CHECK-INS</p>
              <h2>Skin journey</h2>
            </div>
            <Link className="quiet-link" to="/progress">
              See all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="timeline-list">
            {recentScans.length > 0 ? (
              recentScans.map((scan, index) => {
                if (index > 4) return null;
                return (
                  <div className="timeline-row" key={scan.id}>
                    <span
                      className={`timeline-marker ${index === 0 ? "current" : ""}`}
                    />
                    <span className="timeline-date">
                      <strong>{scan.createdAt.getDay()}</strong>
                      <small>{scan.createdAt.getDate()}</small>
                    </span>
                    <span className="timeline-note">{scan.aiShortSummary}</span>
                    <span
                      className={`timeline-score`}
                      style={{
                        backgroundColor: scan?.score
                          ? scan.score > 80
                            ? "#7051eb"
                            : scan.score > 60
                              ? "#f59e0b"
                              : "#ef4444"
                          : "#eeeafc",
                      }}
                    >
                      {scan.score ?? 0}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="timeline-empty">
                <span className="timeline-label">No recent scans</span>
              </div>
            )}
          </div>
        </div>
        <div className="panel attribute-panel">
          <div className="section-heading">
            <div>
              <p className="page-eyebrow">SIGNALS</p>
              <h2>In focus</h2>
            </div>
            <Link to="/scan-result" aria-label="View sample scan result">
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="attribute-list">
            {sortedAnalysisDelta.length > 0 ? (
              sortedAnalysisDelta.map((item, index) => {
                if (index > 2) return null;
                const isPositive = item.value > 0;
                const isNegative = item.value < 0;
                const isNeutral = item.value === 0;
                const itemLabel = item.key.split(".")[0];
                const metaData = analysisMeta[itemLabel];
                const analysisDirection = ANALYSIS_DIRECTION[itemLabel];
                const isImprovement =
                  (analysisDirection === "higher" && isPositive) ||
                  (analysisDirection === "lower" && isNegative);

                if (
                  (item.key.split(".")[1] &&
                    item.key.split(".")[1] !== "whole") ||
                  currentAnalysisDisplay >= 3
                )
                  return null;
                else setCurrentAnalysisDisplay((val) => val++);

                return (
                  <div>
                    <span className={`quick-icon ${metaData.color}`}>
                      <metaData.icon size={16} />
                    </span>
                    <span>
                      <strong>{metaData.label}</strong>
                      <small>
                        {getAnalysisNote(item.value, analysisDirection)}
                      </small>
                    </span>
                    <span
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
                      {item.value}%
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="absolute text-slate-600">No data available</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
