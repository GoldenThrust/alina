import {
  CalendarCheck,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  Flame,
  Moon,
  Sparkles,
  Sun,
  MoonStar,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeading from "../components/PageHeading";
import { dayKey, useRoutine } from "../hooks/useRoutine";

const PERIOD_META: Record<RoutinePeriod, { label: string; short: string; icon: LucideIcon }> = {
  MORNING: { label: "Morning", short: "AM", icon: Sun },
  AFTERNOON: { label: "Afternoon", short: "PM", icon: Flame },
  EVENING: { label: "Evening", short: "PM", icon: Moon },
  NIGHT: { label: "Night", short: "NT", icon: MoonStar },
  HABIT: { label: "Habit", short: "H", icon: Sparkles },
};

// Step ticks are per-day, per-device. RoutineLog has no stepId/period, so a log
// is written once a whole period is finished.
const storageKey = (routineId: string) => `routine:${routineId}:${dayKey(new Date())}`;

interface DayState {
  done: string[]; // step ids
  logged: RoutinePeriod[]; // periods already logged today
}

function readDay(routineId: string): DayState {
  try {
    const raw = localStorage.getItem(storageKey(routineId));
    if (raw) return JSON.parse(raw) as DayState;
  } catch {
    /* ignore */
  }
  return { done: [], logged: [] };
}

function writeDay(routineId: string, state: DayState) {
  try {
    localStorage.setItem(storageKey(routineId), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

const weekDays = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      key: dayKey(d),
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      today: i === 6,
    };
  });

export default function Routine() {
  const { routine, loggedDays, streak, status, error, busy, accept, logCompletion, reload } =
    useRoutine();
  const [period, setPeriod] = useState<RoutinePeriod>("MORNING");
  const [day, setDay] = useState<DayState>({ done: [], logged: [] });
  const [expanded, setExpanded] = useState<string | null>(null);
  const hydratedFor = useRef<string | null>(null);

  const steps = useMemo(
    () => [...(routine?.steps ?? [])].sort((a, b) => a.position - b.position),
    [routine],
  );

  const periods = useMemo(
    () => (["MORNING", "EVENING"] as RoutinePeriod[]).filter((p) => steps.some((s) => s.period === p)),
    [steps],
  );

  // Hydrate today's ticks once the routine arrives and land on a period that exists.
  useEffect(() => {
    if (!routine || hydratedFor.current === routine.id) return;
    hydratedFor.current = routine.id;
    setDay(readDay(routine.id));
  }, [routine]);

  useEffect(() => {
    if (periods.length && !periods.includes(period)) setPeriod(periods[0]);
  }, [periods, period]);

  const periodSteps = steps.filter((s) => s.period === period);
  const doneCount = periodSteps.filter((s) => day.done.includes(s.id)).length;
  const percent = periodSteps.length ? (doneCount / periodSteps.length) * 100 : 0;
  const periodComplete = periodSteps.length > 0 && doneCount === periodSteps.length;

  const toggle = useCallback(
    (stepId: string) => {
      if (!routine || !routine.accepted) return;
      setDay((current) => {
        const done = current.done.includes(stepId)
          ? current.done.filter((id) => id !== stepId)
          : [...current.done, stepId];
        const next = { ...current, done };
        writeDay(routine.id, next);
        return next;
      });
    },
    [routine],
  );

  // Write a RoutineLog the first time a period is fully ticked today.
  useEffect(() => {
    if (!routine?.accepted || !periodComplete || day.logged.includes(period)) return;
    const next = { ...day, logged: [...day.logged, period] };
    setDay(next);
    writeDay(routine.id, next);
    void logCompletion();
  }, [routine, periodComplete, day, period, logCompletion]);

  const week = weekDays();

  if (status === "loading") {
    return (
      <div className="page-content routine-page">
        <PageHeading eyebrow="Your everyday rhythm" title="Your routine" description="Loading your routine…" />
        <div className="panel routine-skeleton" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="routine-skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page-content routine-page">
        <PageHeading eyebrow="Your everyday rhythm" title="Your routine" />
        <div className="panel empty-state">
          <h3>We couldn't load your routine.</h3>
          <p>{error}</p>
          <button className="button button-secondary" type="button" onClick={reload}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="page-content routine-page">
        <PageHeading
          eyebrow="Your everyday rhythm"
          title="Your routine"
          description="A simple routine can be easier to follow than a perfect one."
        />
        <div className="panel empty-state">
          <Sparkles size={20} />
          <h3>No routine yet.</h3>
          <p>Complete a skin scan and we'll suggest a routine built around your results.</p>
        </div>
      </div>
    );
  }

  const PeriodIcon = PERIOD_META[period].icon;

  return (
    <div className="page-content routine-page">
      <PageHeading
        eyebrow={routine.accepted ? "Your everyday rhythm" : "Suggested for you"}
        title={routine.title}
        description="A simple routine can be easier to follow than a perfect one."
        action={
          routine.accepted ? (
            <span className="routine-accepted-chip">
              <Check size={14} /> Active routine
            </span>
          ) : (
            <button className="button button-primary" type="button" disabled={busy} onClick={accept}>
              <Check size={16} /> {busy ? "Saving…" : "Accept routine"}
            </button>
          )
        }
      />

      {error ? <p className="form-message form-error">{error}</p> : null}

      {!routine.accepted ? (
        <div className="routine-proposal" role="status">
          <Sparkles size={16} />
          <p>
            <strong>This routine is a suggestion.</strong> Take a look at the steps below. Accept it
            to start ticking them off and tracking your progress.
          </p>
        </div>
      ) : null}

      <div className="routine-layout">
        <section className="panel routine-list-panel">
          <div className="routine-tabs" role="tablist">
            {periods.map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={period === p}
                className={period === p ? "selected" : ""}
                type="button"
                onClick={() => {
                  setPeriod(p);
                  setExpanded(null);
                }}
              >
                {PERIOD_META[p].label} <span>{PERIOD_META[p].short}</span>
              </button>
            ))}
          </div>

          <div className="routine-list-heading">
            <div>
              <p className="page-eyebrow">{PERIOD_META[period].label} routine</p>
              <h2>Your steps</h2>
            </div>
            <span className="text-muted routine-count">
              <PeriodIcon size={13} /> {periodSteps.length} steps
            </span>
          </div>

          <ol className="routine-items">
            {periodSteps.map((step, index) => {
              const isDone = day.done.includes(step.id);
              const isOpen = expanded === step.id;
              return (
                <li key={step.id} className={`${isDone ? "completed" : ""} ${isOpen ? "open" : ""}`}>
                  <button
                    className="routine-check"
                    type="button"
                    disabled={!routine.accepted}
                    aria-pressed={isDone}
                    aria-label={`${isDone ? "Unmark" : "Complete"} ${step.title}`}
                    onClick={() => toggle(step.id)}
                  >
                    {isDone ? <Check size={15} /> : <Circle size={15} />}
                  </button>
                  <span className="routine-step-number">{String(index + 1).padStart(2, "0")}</span>
                  <button
                    className="routine-step-body"
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : step.id)}
                  >
                    <span className="routine-item-copy">
                      <strong>{step.title}</strong>
                      <small className={isOpen ? "routine-instruction open" : "routine-instruction"}>
                        {step.instruction}
                      </small>
                    </span>
                    <ChevronDown size={16} className="routine-chevron" />
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="routine-progress">
            <div>
              <span>Today's {PERIOD_META[period].label.toLowerCase()} progress</span>
              <strong>
                {doneCount} of {periodSteps.length} complete
              </strong>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={periodSteps.length}
              aria-valuenow={doneCount}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            {periodComplete ? (
              <p className="routine-done-note">
                <Check size={13} /> {PERIOD_META[period].label} routine done. Nicely done.
              </p>
            ) : null}
          </div>
        </section>

        <aside className="routine-side">
          <section className="panel routine-streak">
            <div className="routine-streak-head">
              <span className="quick-icon rose">
                <Flame size={17} />
              </span>
              <div>
                <p className="page-eyebrow">CONSISTENCY</p>
                <h2>
                  {streak} day{streak === 1 ? "" : "s"} in a row
                </h2>
              </div>
            </div>
            <div className="routine-week" aria-label="Last seven days">
              {week.map((d) => {
                const hit = loggedDays.has(d.key) || (d.today && day.logged.length > 0);
                return (
                  <span key={d.key} className={`routine-day ${hit ? "hit" : ""} ${d.today ? "today" : ""}`}>
                    <i>{hit ? <Check size={11} /> : null}</i>
                    <small>{d.label}</small>
                  </span>
                );
              })}
            </div>
            <p className="routine-streak-note">
              <CalendarCheck size={13} /> A day counts once you finish a full morning or evening routine.
            </p>
          </section>

          <section className="panel routine-reminder">
            <span className="quick-icon amber">
              <Clock3 size={17} />
            </span>
            <p className="page-eyebrow">A GENTLE REMINDER</p>
            <h2>Keep it comfortable.</h2>
            <p>
              Stick with the order shown. If something stings or feels tight, skip that step and
              let it settle before trying again.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}