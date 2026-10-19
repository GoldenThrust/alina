import { Loader2, Plus, X } from "lucide-react";
import { useState, type SubmitEventHandler } from "react";
import { usePreferences, type PreferencesStatus } from "../hooks/usePreferences";
import { selectBudget, usePreferenceStore } from "../stores";

type ListKey = "favoriteBrands" | "favoriteIngredients" | "avoidedIngredients";

const EMPTY: string[] = [];

function TagRow({
  listKey,
  label,
  hint,
  placeholder,
}: {
  listKey: ListKey;
  label: string;
  hint: string;
  placeholder: string;
}) {
  const values = usePreferenceStore((s) => s.preferences?.[listKey] ?? EMPTY);
  const toggle = usePreferenceStore((s) => s.toggle);
  const [draft, setDraft] = useState("");

  const add: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    // toggle() would remove an existing value, so only call it when adding something new
    const exists = values.some((v) => v.toLowerCase() === value.toLowerCase());
    if (!exists) toggle(listKey, value);
    setDraft("");
  };

  return (
    <div className="preference-row">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <div className="preference-tags">
        {values.map((value) => (
          <span className="preference-tag" key={value}>
            {value}
            <button type="button" aria-label={`Remove ${value}`} onClick={() => toggle(listKey, value)}>
              <X size={10} />
            </button>
          </span>
        ))}
        <form className="tag-entry" onSubmit={add}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            aria-label={`Add to ${label}`}
          />
          <button type="submit" aria-label={`Add ${label}`} disabled={!draft.trim()}>
            <Plus size={12} />
          </button>
        </form>
      </div>
    </div>
  );
}

function SaveStatus({ status, onRetry }: { status: PreferencesStatus; onRetry: () => void }) {
  if (status === "saving")
    return (
      <span className="preference-status text-muted">
        <Loader2 size={12} className="spin" /> Saving…
      </span>
    );
  if (status === "saveError")
    return (
      <span className="preference-status form-error">
        Couldn’t save.{" "}
        <button className="quiet-link" type="button" onClick={onRetry}>
          Retry
        </button>
      </span>
    );
  return null;
}

export default function PreferencesCard() {
  const { preferences, status, retryLoad, retrySave } = usePreferences();
  const budget = usePreferenceStore(selectBudget);
  const setBudget = usePreferenceStore((s) => s.setBudget);

  if (!preferences) {
    return (
      <section className="panel preference-card">
        <div className="section-heading">
          <h2>Preferences</h2>
        </div>
        {status === "loadError" ? (
          <div className="empty-state">
            <p>Couldn’t load your preferences.</p>
            <button className="button button-secondary" type="button" onClick={retryLoad}>
              Try again
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <Loader2 size={18} className="spin" />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="panel preference-card">
      <div className="section-heading">
        <h2>Preferences</h2>
        <SaveStatus status={status} onRetry={retrySave} />
      </div>

      <TagRow
        listKey="favoriteBrands"
        label="Favorite brands"
        hint="Brands you like and trust"
        placeholder="Add brand"
      />
      <TagRow
        listKey="favoriteIngredients"
        label="Favorite ingredients"
        hint="Ingredients that work for you"
        placeholder="Add ingredient"
      />
      <TagRow
        listKey="avoidedIngredients"
        label="Avoided ingredients"
        hint="Never recommended to you"
        placeholder="Add ingredient"
      />

      <div className="preference-row">
        <span>
          <strong>Budget</strong>
          <small>Used to filter product recommendations by price</small>
        </span>
        <input
          className="budget-input"
          type="number"
          inputMode="decimal"
          min={0}
          step={1}
          placeholder="No limit"
          aria-label="Budget"
          value={budget ?? ""}
          onChange={(event) => {
            const raw = event.target.value;
            setBudget(raw === "" ? null : Math.max(0, Number(raw)));
          }}
        />
      </div>
    </section>
  );
}