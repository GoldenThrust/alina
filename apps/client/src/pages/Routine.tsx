import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  Flame,
  Moon,
  MoonStar,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PageHeading from "../components/PageHeading";
import {
  ROUTINE_PERIODS,
  useActiveRoutine,
  useRoutineDay,
  useRoutineLogs,
  useRoutineSteps,
  useStepSuggestions,
  type NewStep,
} from "../hooks/routineHooks";

const PERIOD_META: Record<RoutinePeriod, { label: string; short: string; icon: LucideIcon }> = {
  MORNING: { label: "Morning", short: "AM", icon: Sun },
  AFTERNOON: { label: "Afternoon", short: "PM", icon: Flame },
  EVENING: { label: "Evening", short: "PM", icon: Moon },
  NIGHT: { label: "Night", short: "NT", icon: MoonStar },
  HABIT: { label: "Habit", short: "H", icon: Sparkles },
};

/* ------------------------------ shared modal shell ------------------------------ */

function Modal({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="suggestion-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
        {children}
      </section>
    </div>
  );
}

/* ------------------------------ create routine ------------------------------ */

function CreateRoutineModal({
  onCreate,
  onClose,
}: {
  onCreate: (title: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");

  const submit: React.SubmitEventHandler<HTMLFormElement>  = useCallback((e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title);
    onClose();
  }, [onCreate, onClose]);

  return (
    <Modal labelledBy="create-routine-title" onClose={onClose}>
      <p className="page-eyebrow">YOUR ROUTINE</p>
      <h2 id="create-routine-title">Create a routine</h2>
      <form className="routine-form" onSubmit={submit}>
        <label>
          <span>Routine name</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Calm and hydrated"
            maxLength={60}
          />
        </label>
        <p className="text-muted routine-hint">
          You'll add steps next, with ideas drawn from your scan recommendations.
        </p>
        <button className="button button-primary" type="submit" disabled={!title.trim()}>
          <Plus size={16} /> Create routine
        </button>
      </form>
    </Modal>
  );
}

/* ------------------------------ confirm delete ------------------------------ */

function ConfirmModal({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal labelledBy="confirm-title" onClose={onClose}>
      <h2 id="confirm-title">{title}</h2>
      <p className="routine-confirm-body">{body}</p>
      <div className="routine-confirm-actions">
        <button className="button button-secondary" type="button" onClick={onClose}>
          Keep it
        </button>
        <button
          className="button button-danger"
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          <Trash2 size={15} /> {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------ add step ------------------------------ */

function AddStepModal({
  initialPeriod,
  routineId,
  existingTitles,
  onAdd,
  onClose,
}: {
  initialPeriod: RoutinePeriod;
  routineId: string;
  existingTitles: string[];
  onAdd: (step: NewStep) => void;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<RoutinePeriod>(initialPeriod);
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const suggestions = useStepSuggestions(period, existingTitles, routineId);

  const submit: React.SubmitEventHandler<HTMLFormElement> = useCallback((e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ period, title, instruction });
    onClose();
  }, [onAdd, onClose]);

  return (
    <Modal labelledBy="add-step-title" onClose={onClose}>
      <p className="page-eyebrow">YOUR ROUTINE</p>
      <h2 id="add-step-title">Add a step</h2>

      <label className="routine-form">
        <span>When</span>
        <select value={period} onChange={(e) => setPeriod(e.target.value as RoutinePeriod)}>
          {ROUTINE_PERIODS.map((p) => (
            <option key={p} value={p}>
              {PERIOD_META[p].label}
            </option>
          ))}
        </select>
      </label>

      <p className="page-eyebrow routine-modal-section">FROM YOUR RECOMMENDATIONS</p>
      {suggestions.length ? (
        suggestions.map((s) => (
          <button
            key={s.key}
            className="modal-option"
            type="button"
            onClick={() => {
              onAdd({
                period,
                title: s.title,
                instruction: s.instruction,
                recommendationId: s.recommendationId,
                consumeRecommendation: s.consumeRecommendation,
              });
              onClose();
            }}
          >
            <span className="modal-option-copy">
              <strong>{s.title}</strong>
              <small>{s.source}</small>
            </span>
            <Plus size={16} />
          </button>
        ))
      ) : (
        <p className="text-muted routine-hint">
          No recommendations for {PERIOD_META[period].label.toLowerCase()} right now. Run a new scan
          for fresh ideas, or write your own below.
        </p>
      )}

      <form className="routine-form" onSubmit={submit}>
        <p className="page-eyebrow">OR WRITE YOUR OWN</p>
        <label>
          <span>Step name</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Niacinamide serum"
          />
        </label>
        <label>
          <span>Instructions</span>
          <textarea
            rows={2}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="How to do it, in a sentence"
          />
        </label>
        <button className="button button-primary" type="submit" disabled={!title.trim()}>
          <Plus size={16} /> Add step
        </button>
      </form>
    </Modal>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function Routine() {
  const { routine, routines, selectRoutine, accept, create, remove } = useActiveRoutine();
  const { steps, periods, stepsFor, addStep, removeStep, moveStep } = useRoutineSteps(routine);
  const day = useRoutineDay(routine?.id);
  const { streak, completionRate, loggedToday, week, logToday } = useRoutineLogs(routine);

  const [period, setPeriod] = useState<RoutinePeriod>("MORNING");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Land on a period that actually exists in this routine.
  useEffect(() => {
    if (periods.length && !periods.includes(period)) setPeriod(periods[0]);
  }, [periods, period]);

  const periodSteps = stepsFor(period);
  const doneCount = periodSteps.filter((s) => day.isDone(s.id)).length;
  const percent = periodSteps.length ? (doneCount / periodSteps.length) * 100 : 0;
  const periodComplete = periodSteps.length > 0 && doneCount === periodSteps.length;
  const accepted = !!routine?.accepted;
  const nextStepId =
    accepted && !periodComplete ? periodSteps.find((s) => !day.isDone(s.id))?.id : undefined;

  // Finishing a full period counts the day (one log per day).
  useEffect(() => {
    if (accepted && periodComplete && !loggedToday) logToday();
  }, [accepted, periodComplete, loggedToday, logToday]);

  const handleAdd = (step: NewStep) => {
    addStep(step);
    setPeriod(step.period);
  };

  const handleRemoveStep = (stepId: string) => {
    removeStep(stepId);
    if (expanded === stepId) setExpanded(null);
  };

  const modals = (
    <>
      {creating ? <CreateRoutineModal onCreate={create} onClose={() => setCreating(false)} /> : null}
      {deleting && routine ? (
        <ConfirmModal
          title={accepted ? "Delete this routine?" : "Dismiss this suggestion?"}
          body={
            accepted
              ? `"${routine.title}", its steps and your streak history will be removed.`
              : `"${routine.title}" will be removed from your suggestions.`
          }
          confirmLabel={accepted ? "Delete routine" : "Dismiss"}
          onConfirm={remove}
          onClose={() => setDeleting(false)}
        />
      ) : null}
      {adding && accepted && routine ? (
        <AddStepModal
          initialPeriod={period}
          routineId={routine.id}
          existingTitles={steps.map((s) => s.title)}
          onAdd={handleAdd}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </>
  );

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
          <p>
            Complete a skin scan and we'll suggest a routine built around your results, or start
            your own.
          </p>
          <button className="button button-primary" type="button" onClick={() => setCreating(true)}>
            <Plus size={16} /> Create a routine
          </button>
        </div>
        {modals}
      </div>
    );
  }

  const PeriodIcon = PERIOD_META[period].icon;
  const periodIds = periodSteps.map((s) => s.id);

  return (
    <div className="page-content routine-page">
      <PageHeading
        eyebrow={accepted ? "Your everyday rhythm" : "Suggested for you"}
        title={routine.title}
        description="A simple routine can be easier to follow than a perfect one."
        action={
          <div className="routine-actions">
            {routines.length > 1 ? (
              <select
                className="routine-picker"
                aria-label="Choose routine"
                value={routine.id}
                onChange={(e) => {
                  selectRoutine(e.target.value);
                  setExpanded(null);
                }}
              >
                {routines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                    {r.accepted ? "" : " (suggested)"}
                  </option>
                ))}
              </select>
            ) : null}
            <button className="button button-secondary" type="button" onClick={() => setCreating(true)}>
              <Plus size={16} /> New routine
            </button>
            {accepted ? (
              <button className="button button-primary" type="button" onClick={() => setAdding(true)}>
                <Plus size={16} /> Add a step
              </button>
            ) : (
              <button className="button button-primary" type="button" onClick={accept}>
                <Check size={16} /> Accept routine
              </button>
            )}
            <button
              className="icon-button routine-remove"
              type="button"
              aria-label={accepted ? "Delete routine" : "Dismiss suggestion"}
              onClick={() => setDeleting(true)}
            >
              {accepted ? <Trash2 size={15} /> : <X size={15} />}
            </button>
          </div>
        }
      />

      {!accepted ? (
        <div className="routine-proposal" role="status">
          <Sparkles size={16} />
          <p>
            <strong>This routine is a suggestion.</strong> Take a look at the steps below. Accept it
            to start ticking them off, editing steps and tracking your progress.
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

          {periodSteps.length ? (
            <ol className="routine-items">
              {periodSteps.map((step, index) => {
                const isDone = day.isDone(step.id);
                const isOpen = expanded === step.id;
                return (
                  <li key={step.id} className={`${isDone ? "completed" : ""} ${isOpen ? "open" : ""}`}>
                    <button
                      className="routine-check"
                      type="button"
                      disabled={!accepted}
                      aria-pressed={isDone}
                      aria-label={`${isDone ? "Unmark" : "Complete"} ${step.title}`}
                      onClick={() => day.toggle(step.id)}
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
                        <strong>
                          {step.title}
                          {step.id === nextStepId ? <em className="routine-next">Up next</em> : null}
                        </strong>
                        {step.instruction ? (
                          <small className={isOpen ? "routine-instruction open" : "routine-instruction"}>
                            {step.instruction}
                          </small>
                        ) : null}
                      </span>
                      <ChevronDown size={16} className="routine-chevron" />
                    </button>
                    {accepted ? (
                      <>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Move ${step.title} up`}
                          disabled={index === 0}
                          onClick={() => moveStep(step.id, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Move ${step.title} down`}
                          disabled={index === periodSteps.length - 1}
                          onClick={() => moveStep(step.id, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          className="icon-button routine-remove"
                          type="button"
                          aria-label={`Remove ${step.title}`}
                          onClick={() => handleRemoveStep(step.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="empty-state">
              <Sparkles size={20} />
              <h3>
                {accepted
                  ? `No ${PERIOD_META[period].label.toLowerCase()} steps yet.`
                  : "Nothing here yet."}
              </h3>
              <p>
                {accepted
                  ? "Pick one from your recommendations or write your own."
                  : "Accept this routine to start adding steps."}
              </p>
              {accepted ? (
                <button className="quiet-link" type="button" onClick={() => setAdding(true)}>
                  Add a step <Plus size={15} />
                </button>
              ) : null}
            </div>
          )}

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
            {accepted && periodSteps.length ? (
              <div className="routine-tools">
                <button
                  className="quiet-link"
                  type="button"
                  disabled={periodComplete}
                  onClick={() => day.markAll(periodIds)}
                >
                  Mark all done
                </button>
                <button
                  className="quiet-link"
                  type="button"
                  disabled={doneCount === 0}
                  onClick={() => day.clear(periodIds)}
                >
                  Reset
                </button>
              </div>
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
              {week.map((d) => (
                <span key={d.key} className={`routine-day ${d.hit ? "hit" : ""} ${d.today ? "today" : ""}`}>
                  <i>{d.hit ? <Check size={11} /> : null}</i>
                  <small>{d.label}</small>
                </span>
              ))}
            </div>
            <p className="routine-streak-note">
              <CalendarCheck size={13} />{" "}
              {loggedToday
                ? "Today counts toward your streak."
                : "A day counts once you finish a full routine."}
            </p>
            <p className="routine-streak-note">
              {Math.round(completionRate * 100)}% of the last 30 days completed
            </p>
          </section>

          <section className="panel routine-reminder">
            <span className="quick-icon amber">
              <Clock3 size={17} />
            </span>
            <p className="page-eyebrow">A GENTLE REMINDER</p>
            <h2>Keep it comfortable.</h2>
            <p>
              Introduce one new product at a time so it's easier to notice how your skin responds. If
              something stings or feels tight, skip that step and let it settle.
            </p>
          </section>
        </aside>
      </div>

      {modals}
    </div>
  );
}