import {
  Check,
  Circle,
  Clock3,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import PageHeading from "../components/PageHeading";
import { useSessionStore } from "../stores/session";

const routineOrder = [
  "Gentle cleanser",
  "Cloudwater Barrier Serum",
  "Daily moisturizer",
  "SPF 30 sunscreen",
];

export default function Routine() {
  const items = useSessionStore((state) => state.routineItems);
  const addRoutineItem = useSessionStore((state) => state.addRoutineItem);
  const removeRoutineItem = useSessionStore((state) => state.removeRoutineItem);
  const [completed, setCompleted] = useState<string[]>(["Gentle cleanser"]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const available = [
    "Cloudwater Barrier Serum",
    "Night repair moisturizer",
  ].filter((item) => !items.includes(item));

  const toggleComplete = useCallback((item: string) => {
    setCompleted((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item],
    );
  }, []);

  return (
    <div className="page-content routine-page">
      <PageHeading
        eyebrow="Your everyday rhythm"
        title="Your routine"
        description="A simple routine can be easier to follow than a perfect one."
        action={
          <button
            className="button button-primary"
            type="button"
            onClick={() => setShowSuggestions((visible) => !visible)}
          >
            <Plus size={16} /> Add a step
          </button>
        }
      />
      <div className="routine-layout">
        <section className="panel routine-list-panel">
          <div className="routine-tabs">
            <button className="selected" type="button">
              Morning <span>AM</span>
            </button>
            <button type="button" onClick={() => setCompleted([])}>
              Evening <span>PM</span>
            </button>
            <button type="button">
              Habits <span>02</span>
            </button>
          </div>
          <div className="routine-list-heading">
            <div>
              <p className="page-eyebrow">MORNING ROUTINE</p>
              <h2>Your steps</h2>
            </div>
            <span className="text-muted">{items.length} steps</span>
          </div>
          {items.length ? (
            <ol className="routine-items">
              {[...items]
                .sort(
                  (a, b) => routineOrder.indexOf(a) - routineOrder.indexOf(b),
                )
                .map((item, index) => (
                  <li
                    className={completed.includes(item) ? "completed" : ""}
                    key={item}
                  >
                    <button
                      className="routine-check"
                      type="button"
                      aria-label={`${completed.includes(item) ? "Mark" : "Complete"} ${item}`}
                      onClick={() => toggleComplete(item)}
                    >
                      {completed.includes(item) ? (
                        <Check size={15} />
                      ) : (
                        <Circle size={15} />
                      )}
                    </button>
                    <span className="routine-step-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="routine-item-copy">
                      <strong>{item}</strong>
                      <small>
                        {index === 0
                          ? "Cleanse · 1 minute"
                          : index === items.length - 1
                            ? "Protect · every morning"
                            : "Apply gently · 1 minute"}
                      </small>
                    </div>
                    <button
                      className="icon-button routine-remove"
                      type="button"
                      aria-label={`Remove ${item}`}
                      onClick={() => removeRoutineItem(item)}
                    >
                      <Trash2 size={15} />
                    </button>
                    <MoreHorizontal className="routine-more" size={17} />
                  </li>
                ))}
            </ol>
          ) : (
            <div className="empty-state">
              <Sparkles size={20} />
              <h3>Your routine is ready to take shape.</h3>
              <p>Add a step that works for you.</p>
            </div>
          )}
          <div className="routine-progress">
            <div>
              <span>Today's progress</span>
              <strong>
                {completed.length} of {items.length} complete
              </strong>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${items.length ? Math.min((completed.length / items.length) * 100, 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </section>
        <aside className="routine-side">
          <section className="panel routine-reminder">
            <span className="quick-icon amber">
              <Clock3 size={17} />
            </span>
            <p className="page-eyebrow">A GENTLE REMINDER</p>
            <h2>Keep it comfortable.</h2>
            <p>
              Introduce one new product at a time so it's easier to notice how
              your skin responds.
            </p>
          </section>
          <section className="panel routine-suggestion">
            <p className="page-eyebrow">FROM YOUR SAMPLE PICKS</p>
            <h2>Something to explore</h2>
            <p>Cloudwater Barrier Serum</p>
            <button
              className="quiet-link"
              type="button"
              onClick={() => addRoutineItem("Cloudwater Barrier Serum")}
            >
              Add sample step <Plus size={15} />
            </button>
          </section>
        </aside>
      </div>
      {showSuggestions ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowSuggestions(false)}
        >
          <section
            className="suggestion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-step-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close"
              onClick={() => setShowSuggestions(false)}
            >
              ×
            </button>
            <p className="page-eyebrow">YOUR ROUTINE</p>
            <h2 id="add-step-title">Add a step</h2>
            {available.length ? (
              available.map((item) => (
                <button
                  className="modal-option"
                  type="button"
                  key={item}
                  onClick={() => {
                    addRoutineItem(item);
                    setShowSuggestions(false);
                  }}
                >
                  <span>{item}</span>
                  <Plus size={16} />
                </button>
              ))
            ) : (
              <p className="muted-copy">
                You've added all the sample suggestions.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
