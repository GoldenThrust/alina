import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Droplets,
  ScanFace,
  Sparkles,
  Sun,
  Waves,
} from "lucide-react";
import { Link } from "react-router";
import PageHeading from "../components/PageHeading";
import { getDateInfo } from "../util/date";
import { useSessionStore } from "../stores/session";

const recentScans = [
  {
    day: "Today",
    date: "Oct 09",
    score: 82,
    note: "Hydration is trending up",
    tone: "positive",
  },
  {
    day: "Monday",
    date: "Oct 06",
    score: 79,
    note: "A steady baseline",
    tone: "neutral",
  },
  {
    day: "Thursday",
    date: "Oct 02",
    score: 76,
    note: "Your first check-in",
    tone: "neutral",
  },
];

const { date, period } = getDateInfo();

export default function Dashboard() {
  const session = useSessionStore((state) => state.session);
  
  return (
    <div className="page-content dashboard-page">
      <PageHeading
        eyebrow={date}
        title={`Good ${period}, ${session?.name?.split(" ")[0] || "there"}!`}
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
            <span className="demo-label">DEMO SNAPSHOT</span>
          </div>
          <div className="summary-main">
            <div>
              <h2>Feeling balanced, with room to replenish.</h2>
              <p>
                Hydration looks steadier in this sample timeline. Keep your
                routine gentle and check in again when it feels useful.
              </p>
            </div>
            <div className="score-ring" aria-label="Sample skin score 82">
              <div>
                <strong>82</strong>
                <span>SKIN SCORE</span>
              </div>
            </div>
          </div>
          <div className="summary-foot">
            <span>
              <ArrowUpRight size={15} /> +4 points{" "}
              <small>vs. previous sample</small>
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
            {recentScans.map((scan, index) => (
              <div className="timeline-row" key={scan.date}>
                <span
                  className={`timeline-marker ${index === 0 ? "current" : ""}`}
                />
                <span className="timeline-date">
                  <strong>{scan.day}</strong>
                  <small>{scan.date}</small>
                </span>
                <span className="timeline-note">{scan.note}</span>
                <span className={`timeline-score ${scan.tone}`}>
                  {scan.score}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel attribute-panel">
          <div className="section-heading">
            <div>
              <p className="page-eyebrow">SAMPLE SIGNALS</p>
              <h2>In focus</h2>
            </div>
            <Link to="/scan-result" aria-label="View sample scan result">
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="attribute-list">
            <div>
              <span className="quick-icon blue">
                <Droplets size={16} />
              </span>
              <span>
                <strong>Hydration</strong>
                <small>More balanced</small>
              </span>
              <span className="attribute-change positive">
                <ArrowUpRight size={14} /> 4%
              </span>
            </div>
            <div>
              <span className="quick-icon amber">
                <Sun size={16} />
              </span>
              <span>
                <strong>Texture</strong>
                <small>Looking steady</small>
              </span>
              <span className="attribute-change neutral">
                <ArrowDownRight size={14} /> 1%
              </span>
            </div>
            <div>
              <span className="quick-icon mint">
                <Waves size={16} />
              </span>
              <span>
                <strong>Oil balance</strong>
                <small>Similar to last check</small>
              </span>
              <span className="attribute-change neutral">0%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
