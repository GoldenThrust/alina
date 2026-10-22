import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SubmitEventHandler,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  Flame,
  Loader2,
  Moon,
  MoonStar,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import CountUp from "../components/CountUp";
import PageHeading from "../components/PageHeading";
import StatusBanner from "../components/StatusBanner";
import {
  ROUTINE_PERIODS,
  useActiveRoutine,
  useRoutineDay,
  useRoutineLogs,
  useRoutineSteps,
  useRoutineSync,
  useStepSuggestions,
  useSuggestionSources,
} from "../hooks/useRoutine";
import { EASE, container, item as fadeUp } from "../utils/motion";
import { acceptedRecommendation } from "../utils/recommendation";

const PERIOD_META: Record<
  RoutinePeriod,
  { label: string; short: string; icon: LucideIcon }
> = {
  MORNING: { label: "Morning", short: "AM", icon: Sun },
  AFTERNOON: { label: "Afternoon", short: "PM", icon: Flame },
  EVENING: { label: "Evening", short: "PM", icon: Moon },
  NIGHT: { label: "Night", short: "NT", icon: MoonStar },
  HABIT: { label: "Habit", short: "H", icon: Sparkles },
};

const SPRING = { type: "spring", stiffness: 500, damping: 38 } as const;

/* ------------------------------ shared modal shell ------------------------------ */

function Modal({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.section
        className="suggestion-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ duration: 0.22, ease: EASE }}
      >
        <button
          className="modal-close"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </motion.section>
    </motion.div>
  );
}

/* ------------------------------ create routine ------------------------------ */

function CreateRoutineModal({
  onCreate,
  onClose,
}: {
  onCreate: (title: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const ok = await onCreate(title);
    if (ok) onClose();
    else setBusy(false);
  };

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
          You’ll add steps next, with ideas drawn from your scan
          recommendations.
        </p>
        <button
          className="button button-primary"
          type="submit"
          disabled={!title.trim() || busy}
        >
          {busy ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}{" "}
          Create routine
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
        <button
          className="button button-secondary"
          type="button"
          onClick={onClose}
        >
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
  onAdd: (step: NewStep) => Promise<boolean>;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<RoutinePeriod>(initialPeriod);
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  /** Which option is being saved (a suggestion key, or "custom"). */
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const suggestions = useStepSuggestions(period, existingTitles, routineId);

  const add = async (step: NewStep, key: string) => {
    if (busyKey) return;
    setBusyKey(key);
    const ok = await onAdd(step);
    if (ok) onClose();
    else setBusyKey(null);
  };

  const submit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    void add({ period, title, instruction }, "custom");
  };

  return (
    <Modal labelledBy="add-step-title" onClose={onClose}>
      <p className="page-eyebrow">YOUR ROUTINE</p>
      <h2 id="add-step-title">Add a step</h2>

      <label className="routine-form">
        <span>When</span>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as RoutinePeriod)}
        >
          {ROUTINE_PERIODS.map((p) => (
            <option key={p} value={p}>
              {PERIOD_META[p].label}
            </option>
          ))}
        </select>
      </label>

      <p className="page-eyebrow routine-modal-section">
        FROM YOUR RECOMMENDATIONS
      </p>
      {suggestions.length ? (
        <AnimatePresence mode="popLayout" initial={false}>
          {suggestions.map((s) => (
            <motion.button
              key={s.key}
              layout
              className="modal-option"
              type="button"
              disabled={!!busyKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() =>
                void add(
                  {
                    period,
                    title: s.title,
                    instruction: s.instruction,
                    recommendationId: s.recommendationId,
                    consumeRecommendation: s.consumeRecommendation,
                  },
                  s.key,
                )
              }
            >
              <span className="modal-option-copy">
                <strong>{s.title}</strong>
                <small>{s.source}</small>
              </span>
              {busyKey === s.key ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Plus size={16} />
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      ) : (
        <p className="text-muted routine-hint">
          No recommendations for {PERIOD_META[period].label.toLowerCase()} right
          now. Run a new scan for fresh ideas, or write your own below.
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
        <button
          className="button button-primary"
          type="submit"
          disabled={!title.trim() || !!busyKey}
        >
          {busyKey === "custom" ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <Plus size={16} />
          )}{" "}
          Add step
        </button>
      </form>
    </Modal>
  );
}

/** Loads suggestion data while the routine is accepted, so the modal opens with ideas ready. */
function SuggestionPrefetch() {
  useSuggestionSources();
  return null;
}

function RoutineSkeleton() {
  return (
    <div className="routine-layout" aria-hidden="true">
      <div className="panel routine-skeleton">
        {Array.from({ length: 5 }, (_, i) => (
          <div className="routine-skeleton-row" key={i} />
        ))}
      </div>
      <div className="routine-side">
        <div className="panel routine-skeleton">
          <div className="routine-skeleton-row" />
          <div className="routine-skeleton-row" />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function Routine() {
  const { status, synced, retry } = useRoutineSync();
  const { routine, routines, selectRoutine, accept, create, remove, busy } =
    useActiveRoutine();
  const { steps, periods, stepsFor, addStep, removeStep, moveStep } =
    useRoutineSteps(routine);
  const day = useRoutineDay(routine?.id);
  const { streak, completionRate, loggedToday, week, logToday } =
    useRoutineLogs(routine);

  const [period, setPeriod] = useState<RoutinePeriod>("MORNING");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isLoading = status === "loading" && !routine;
  const accepted = acceptedRecommendation(routine);

  // Land on a period that actually exists in this routine.
  useEffect(() => {
    if (periods.length && !periods.includes(period)) setPeriod(periods[0]);
  }, [periods, period]);

  const periodSteps = stepsFor(period);
  const doneCount = periodSteps.filter((s) => day.isDone(s.id)).length;
  const percent = periodSteps.length
    ? (doneCount / periodSteps.length) * 100
    : 0;
  const periodComplete =
    periodSteps.length > 0 && doneCount === periodSteps.length;
  const nextStepId =
    accepted && !periodComplete
      ? periodSteps.find((s) => !day.isDone(s.id))?.id
      : undefined;
  const periodIds = periodSteps.map((s) => s.id);
  const existingTitles = useMemo(() => steps.map((s) => s.title), [steps]);

  // Finishing a full period counts the day. Wait for fresh server data so a day isn't logged twice.
  useEffect(() => {
    if (synced && accepted && periodComplete && !loggedToday) void logToday();
  }, [synced, accepted, periodComplete, loggedToday, logToday]);

  const closeCreate = useCallback(() => setCreating(false), []);
  const closeDelete = useCallback(() => setDeleting(false), []);
  const closeAdd = useCallback(() => setAdding(false), []);

  const handleAdd = useCallback(
    async (step: NewStep) => {
      const ok = await addStep(step);
      if (ok) setPeriod(step.period);
      return ok;
    },
    [addStep],
  );

  const handleRemoveStep = useCallback(
    (stepId: string) => {
      void removeStep(stepId);
      setExpanded((current) => (current === stepId ? null : current));
    },
    [removeStep],
  );

  /* ----- pieces ----- */

  const modals = (
    <AnimatePresence>
      {creating ? (
        <CreateRoutineModal
          key="create"
          onCreate={create}
          onClose={closeCreate}
        />
      ) : null}
      {deleting && routine ? (
        <ConfirmModal
          key="confirm"
          title={accepted ? "Delete this routine?" : "Dismiss this suggestion?"}
          body={
            accepted
              ? `“${routine.title}”, its steps and your streak history will be removed.`
              : `“${routine.title}” will be removed from your suggestions.`
          }
          confirmLabel={accepted ? "Delete routine" : "Dismiss"}
          onConfirm={() => void remove()}
          onClose={closeDelete}
        />
      ) : null}
      {adding && accepted && routine ? (
        <AddStepModal
          key="add"
          initialPeriod={period}
          routineId={routine.id}
          existingTitles={existingTitles}
          onAdd={handleAdd}
          onClose={closeAdd}
        />
      ) : null}
    </AnimatePresence>
  );

  const heading = routine ? (
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
                  {acceptedRecommendation(r) ? "" : " (suggested)"}
                </option>
              ))}
            </select>
          ) : null}
          <motion.button
            className="button button-secondary"
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} /> New routine
          </motion.button>
          {accepted ? (
            <motion.button
              className="button button-primary"
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setAdding(true)}
            >
              <Plus size={16} /> Add a step
            </motion.button>
          ) : (
            <motion.button
              className="button button-primary"
              type="button"
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              onClick={() => void accept()}
            >
              {busy ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Check size={16} />
              )}{" "}
              Accept routine
            </motion.button>
          )}
          <motion.button
            className="icon-button routine-remove"
            type="button"
            whileTap={{ scale: 0.92 }}
            aria-label={accepted ? "Delete routine" : "Dismiss suggestion"}
            onClick={() => setDeleting(true)}
          >
            {accepted ? <Trash2 size={15} /> : <X size={15} />}
          </motion.button>
        </div>
      }
    />
  ) : (
    <PageHeading
      eyebrow="Your everyday rhythm"
      title="Your routine"
      description="A simple routine can be easier to follow than a perfect one."
    />
  );

  let body: ReactNode;

  if (!routine) {
    body = isLoading ? (
      <RoutineSkeleton />
    ) : status === "loadError" ? null : (
      <motion.div className="panel empty-state" variants={fadeUp}>
        <Sparkles size={20} />
        <h3>No routine yet.</h3>
        <p>
          Complete a skin scan and we’ll suggest a routine built around your
          results, or start your own.
        </p>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setCreating(true)}
        >
          <Plus size={16} /> Create a routine
        </button>
      </motion.div>
    );
  } else {
    const PeriodIcon = PERIOD_META[period].icon;

    body = (
      <motion.div className="routine-layout" variants={fadeUp}>
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
                {period === p ? (
                  <motion.i
                    className="tab-underline"
                    layoutId="routine-tab-underline"
                    transition={SPRING}
                  />
                ) : null}
              </button>
            ))}
          </div>

          <div className="routine-list-heading">
            <div>
              <p className="page-eyebrow">
                {PERIOD_META[period].label} routine
              </p>
              <h2>Your steps</h2>
            </div>
            <span className="text-muted routine-count">
              <PeriodIcon size={13} /> {periodSteps.length} steps
            </span>
          </div>

          {/* Switching tabs or routines slides the whole list */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${routine.id}-${period}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18, ease: EASE }}
            >
              {periodSteps.length ? (
                <ol className="routine-items">
                  {/* Adding, removing and reordering steps all glide */}
                  <AnimatePresence initial={false} mode="popLayout">
                    {periodSteps.map((step, index) => {
                      const isDone = day.isDone(step.id);
                      const isOpen = expanded === step.id;
                      return (
                        <motion.li
                          key={step.id}
                          layout="position"
                          className={`${isDone ? "completed" : ""} ${isOpen ? "open" : ""}`}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 24 }}
                          transition={SPRING}
                        >
                          <motion.button
                            className="routine-check"
                            type="button"
                            disabled={!accepted}
                            aria-pressed={isDone}
                            aria-label={`${isDone ? "Unmark" : "Complete"} ${step.title}`}
                            whileTap={accepted ? { scale: 0.85 } : undefined}
                            onClick={() => day.toggle(step.id)}
                          >
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={isDone ? "on" : "off"}
                                className="check-icon"
                                initial={{ scale: 0.4, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.4, opacity: 0 }}
                                transition={{ duration: 0.12 }}
                              >
                                {isDone ? (
                                  <Check size={15} />
                                ) : (
                                  <Circle size={15} />
                                )}
                              </motion.span>
                            </AnimatePresence>
                          </motion.button>
                          <span className="routine-step-number">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <button
                            className="routine-step-body"
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setExpanded(isOpen ? null : step.id)}
                          >
                            <span className="routine-item-copy">
                              <strong>
                                {step.title}
                                {step.id === nextStepId ? (
                                  <motion.em
                                    className="routine-next"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 20,
                                    }}
                                  >
                                    Up next
                                  </motion.em>
                                ) : null}
                              </strong>
                              {step.instruction ? (
                                <motion.small
                                  className={`routine-instruction${isOpen ? " open" : ""}`}
                                  initial={false}
                                  animate={{ height: isOpen ? "auto" : 16 }}
                                  transition={{ duration: 0.25, ease: EASE }}
                                >
                                  {step.instruction}
                                </motion.small>
                              ) : null}
                            </span>
                            <motion.span
                              className="routine-chevron"
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown size={16} />
                            </motion.span>
                          </button>
                          {accepted ? (
                            <>
                              <button
                                className="icon-button"
                                type="button"
                                aria-label={`Move ${step.title} up`}
                                disabled={index === 0}
                                onClick={() => void moveStep(step.id, -1)}
                              >
                                <ArrowUp size={15} />
                              </button>
                              <button
                                className="icon-button"
                                type="button"
                                aria-label={`Move ${step.title} down`}
                                disabled={index === periodSteps.length - 1}
                                onClick={() => void moveStep(step.id, 1)}
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
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
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
                    <button
                      className="quiet-link"
                      type="button"
                      onClick={() => setAdding(true)}
                    >
                      Add a step <Plus size={15} />
                    </button>
                  ) : null}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="routine-progress">
            <div>
              <span>
                Today’s {PERIOD_META[period].label.toLowerCase()} progress
              </span>
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
              <motion.span
                initial={false}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.5, ease: EASE }}
              />
            </div>
            <AnimatePresence initial={false}>
              {periodComplete ? (
                <motion.p
                  key="done"
                  className="routine-done-note"
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  <Check size={13} /> {PERIOD_META[period].label} routine done.
                  Nicely done.
                </motion.p>
              ) : null}
            </AnimatePresence>
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

        <motion.aside
          className="routine-side"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: EASE }}
        >
          <section className="panel routine-streak">
            <div className="routine-streak-head">
              <motion.span
                className="quick-icon rose"
                animate={streak > 0 ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={
                  streak > 0
                    ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                    : undefined
                }
              >
                <Flame size={17} />
              </motion.span>
              <div>
                <p className="page-eyebrow">CONSISTENCY</p>
                <h2>
                  <CountUp value={streak} /> day{streak === 1 ? "" : "s"} in a
                  row
                </h2>
              </div>
            </div>

            <motion.div
              className="routine-week"
              aria-label="Last seven days"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: {
                  transition: { staggerChildren: 0.05, delayChildren: 0.4 },
                },
              }}
            >
              {week.map((d) => (
                <motion.span
                  key={d.key}
                  className={`routine-day ${d.hit ? "hit" : ""} ${d.today ? "today" : ""}`}
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <motion.i
                    initial={false}
                    animate={d.hit ? { scale: [0.6, 1.2, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {d.hit ? <Check size={11} /> : null}
                  </motion.i>
                  <small>{d.label}</small>
                </motion.span>
              ))}
            </motion.div>

            <p className="routine-streak-note">
              <CalendarCheck size={13} />{" "}
              {loggedToday
                ? "Today counts toward your streak."
                : "A day counts once you finish a full routine."}
            </p>
            <p className="routine-streak-note">
              <span>
                <CountUp value={Math.round(completionRate * 100)} />% of the
                last 30 days completed
              </span>
            </p>
          </section>

          <section className="panel routine-reminder">
            <span className="quick-icon amber">
              <Clock3 size={17} />
            </span>
            <p className="page-eyebrow">A GENTLE REMINDER</p>
            <h2>Keep it comfortable.</h2>
            <p>
              Introduce one new product at a time so it’s easier to notice how
              your skin responds. If something stings or feels tight, skip that
              step and let it settle.
            </p>
          </section>
        </motion.aside>
      </motion.div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="page-content routine-page"
        variants={container}
        initial="hidden"
        animate="show"
        aria-busy={isLoading}
      >
        {accepted ? <SuggestionPrefetch /> : null}

        <motion.div variants={fadeUp}>{heading}</motion.div>

        <AnimatePresence initial={false}>
          {status === "loadError" ? (
            <StatusBanner
              key="load-error"
              title="We couldn’t load your routine."
              text={
                routine
                  ? "Showing what we have saved. Check your connection and retry."
                  : "Check your connection and try again."
              }
              onRetry={retry}
            />
          ) : null}

          {routine && !accepted ? (
            <motion.div
              key="proposal"
              className="status-banner-wrap"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div className="routine-proposal" role="status">
                <Sparkles size={16} />
                <p>
                  <strong>This routine is a suggestion.</strong>{" "}
                  {routine.recommendation?.explanation
                    ? `${routine.recommendation.explanation} `
                    : null}
                  Take a look at the steps below. Accept it to start ticking
                  them off, editing steps and tracking your progress.
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {body}
        {modals}
      </motion.div>
    </MotionConfig>
  );
}
