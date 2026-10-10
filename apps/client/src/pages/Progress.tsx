import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Droplets,
  Sparkles,
  Waves,
} from "lucide-react";
import { useState } from "react";
import PageHeading from "../components/PageHeading";

const periods = ["30 days", "90 days", "All time"] as const;
type Period = (typeof periods)[number];
const values: Record<Period, number[]> = {
  "30 days": [48, 56, 52, 68, 63, 82],
  "90 days": [35, 49, 45, 64, 72, 82],
  "All time": [28, 41, 55, 51, 70, 82],
};

export default function Progress() {
  const [period, setPeriod] = useState<Period>("30 days");
  return (
    <div className="page-content progress-page">
      <PageHeading
        eyebrow="Patterns, not perfection"
        title="Your skin journey"
        description="A sample view of how check-ins can make gradual changes easier to notice."
        action={
          <button
            className="button button-secondary period-action"
            type="button"
          >
            <CalendarDays size={16} /> Oct 01 - Oct 09
          </button>
        }
      />
      <section className="panel progress-chart-panel">
        <div className="section-heading">
          <div>
            <p className="page-eyebrow">SAMPLE TREND</p>
            <h2>Skin score</h2>
            <p className="muted-copy">
              A gentle signal to explore, not a diagnosis.
            </p>
          </div>
          <span className="trend-pill positive">
            <ArrowUpRight size={15} /> +12% <small>sample period</small>
          </span>
        </div>
        <div
          className="chart-tabs"
          role="tablist"
          aria-label="Sample trend period"
        >
          {periods.map((item) => (
            <button
              className={period === item ? "selected" : ""}
              type="button"
              role="tab"
              aria-selected={period === item}
              key={item}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="chart-area">
          <div className="chart-y-axis">
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
          </div>
          <div className="chart-plot">
            <div className="chart-gridlines">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="chart-bars">
              {values[period].map((value, index) => (
                <div className="chart-column" key={`${period}-${index}`}>
                  <div className="chart-bar-track">
                    <span style={{ height: `${value}%` }} />
                  </div>
                  <small>
                    {
                      [
                        "Sep 12",
                        "Sep 18",
                        "Sep 24",
                        "Sep 29",
                        "Oct 04",
                        "Oct 09",
                      ][index]
                    }
                  </small>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="chart-footnote">
          Illustrative values · no real scans are stored yet
        </p>
      </section>
      <div className="progress-detail-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="page-eyebrow">A FEW SAMPLE SIGNALS</p>
              <h2>What's moving</h2>
            </div>
          </div>
          <div className="movement-list">
            <div>
              <span className="quick-icon blue">
                <Droplets size={16} />
              </span>
              <span>
                <strong>Hydration</strong>
                <small>Sample trend is improving</small>
              </span>
              <b className="positive">
                <ArrowUpRight size={14} /> 8%
              </b>
            </div>
            <div>
              <span className="quick-icon mint">
                <Waves size={16} />
              </span>
              <span>
                <strong>Texture</strong>
                <small>Sample trend looks steady</small>
              </span>
              <b className="neutral">
                <ArrowDownRight size={14} /> 1%
              </b>
            </div>
            <div>
              <span className="quick-icon rose">
                <Sparkles size={16} />
              </span>
              <span>
                <strong>Overall balance</strong>
                <small>Small changes over time</small>
              </span>
              <b className="positive">
                <ArrowUpRight size={14} /> 4%
              </b>
            </div>
          </div>
        </section>
        <section className="panel milestone-panel">
          <span className="milestone-icon">
            <Sparkles size={20} />
          </span>
          <p className="page-eyebrow">YOUR FIRST MILESTONE</p>
          <h2>Two more check-ins to a fuller picture.</h2>
          <p>
            More consistent samples can help distinguish a one-day change from a
            longer pattern.
          </p>
          <div className="milestone-progress">
            <span style={{ width: "50%" }} />
          </div>
          <small>2 of 4 sample check-ins</small>
        </section>
      </div>
    </div>
  );
}
