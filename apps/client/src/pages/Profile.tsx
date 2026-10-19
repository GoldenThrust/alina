import { useState, type ChangeEventHandler, type ReactNode, type SubmitEventHandler } from "react";
import { Camera, Check, CircleUserRound, Loader2, Pencil, ShieldCheck, Trash2, X } from "lucide-react";
import PageHeading from "../components/PageHeading";
import PreferencesCard from "../components/PreferencesCard";
import { useProfileActions } from "../hooks/useProfileActions";
import { useAuthStore } from "../stores";
import {
  GENDER_OPTIONS,
  formFromUser,
  formatDate,
  fromDateInput,
  genderLabel,
  validateProfile,
  type ProfileErrors,
  type ProfileForm,
} from "../utils/profile";

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <small className="field-error" id={`${id}-error`} role="alert">
          {error}
        </small>
      ) : hint ? (
        <small className="field-hint" id={`${id}-hint`}>
          {hint}
        </small>
      ) : null}
    </>
  );
}

export default function Profile() {
  const user = useAuthStore((state: AuthState) => state.user);
  const { saving, saveError, avatarBusy, avatarError, saveProfile, changeAvatar, removeAvatar, clearErrors } =
    useProfileActions();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saved, setSaved] = useState<null | { emailChanged: boolean }>(null);

  if (!user) return null;

  const startEditing = () => {
    setForm(formFromUser(user));
    setErrors({});
    clearErrors();
    setSaved(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setErrors({});
    clearErrors();
  };

  const update =
    <K extends keyof ProfileForm>(key: K) =>
    (value: ProfileForm[K]) =>
      setForm((current) => (current ? { ...current, [key]: value } : current));

  const submit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!form) return;

    const found = validateProfile(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const email = form.email.trim();
    const emailChanged = email.toLowerCase() !== user.email.toLowerCase();

    const ok = await saveProfile({
      fullName: form.fullName.trim(),
      email,
      phoneNumber: form.phoneNumber.trim() || null,
      gender: form.gender || null,
      dateOfBirth: fromDateInput(form.dateOfBirth),
    });

    if (ok) {
      setEditing(false);
      setSaved({ emailChanged });
    }
  };

  const onAvatarChosen: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be picked again later
    if (file) void changeAvatar(file);
  };

  const describedBy = (id: string, key: keyof ProfileForm, hasHint = false) =>
    errors[key] ? `${id}-error` : hasHint ? `${id}-hint` : undefined;

  return (
    <div className="page-content profile-page">
      <PageHeading
        eyebrow="The details that make it yours"
        title="Your profile"
        description="A few preferences can help Alina make more relevant suggestions."
      />
      <div className="profile-layout">
        <div className="profile-main-column">
          <section className="panel profile-card">
            <div className="section-heading">
              <div>
                <p className="page-eyebrow">ABOUT YOU</p>
                <h2>Personal details</h2>
              </div>
              <button
                className="icon-button edit-profile"
                type="button"
                onClick={editing ? cancelEditing : startEditing}
                aria-label={editing ? "Cancel editing" : "Edit profile"}
              >
                {editing ? <X size={17} /> : <Pencil size={16} />}
              </button>
            </div>

            <div className="profile-details">
              <span className="profile-avatar">
                {user.avatar ? <img src={user.avatar} alt="" /> : <CircleUserRound size={31} />}
              </span>
              <div>
                <strong>{user.fullName}</strong>
                <span>{user.email}</span>
                {user.emailVerifiedAt ? (
                  <small className="verify-chip verified">
                    <Check size={11} /> Verified
                  </small>
                ) : (
                  <small className="verify-chip">Not verified</small>
                )}
              </div>
            </div>

            <div className="avatar-actions">
              <label className="button button-secondary upload-button" aria-disabled={avatarBusy}>
                {avatarBusy ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}
                {avatarBusy ? "Working…" : user.avatar ? "Change photo" : "Add photo"}
                <input type="file" accept="image/*" onChange={onAvatarChosen} disabled={avatarBusy} />
              </label>
              {user.avatar ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void removeAvatar()}
                  disabled={avatarBusy}
                >
                  <Trash2 size={14} /> Remove
                </button>
              ) : null}
            </div>
            {avatarError ? (
              <p className="form-message form-error" role="alert">
                {avatarError}
              </p>
            ) : null}

            {editing && form ? (
              <form className="profile-form" onSubmit={submit} noValidate>
                <Field id="profile-name" label="Display name" error={errors.fullName}>
                  <input
                    id="profile-name"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(event) => update("fullName")(event.target.value)}
                    aria-invalid={!!errors.fullName}
                    aria-describedby={describedBy("profile-name", "fullName")}
                  />
                </Field>

                <Field
                  id="profile-email"
                  label="Email"
                  error={errors.email}
                  hint="If you change your email, you'll need to verify the new address."
                >
                  <input
                    id="profile-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => update("email")(event.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={describedBy("profile-email", "email", true)}
                  />
                </Field>

                <Field id="profile-phone" label="Phone number" error={errors.phoneNumber}>
                  <input
                    id="profile-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Optional"
                    value={form.phoneNumber}
                    onChange={(event) => update("phoneNumber")(event.target.value)}
                    aria-invalid={!!errors.phoneNumber}
                    aria-describedby={describedBy("profile-phone", "phoneNumber")}
                  />
                </Field>

                <Field id="profile-gender" label="Gender" error={errors.gender}>
                  <select
                    id="profile-gender"
                    value={form.gender}
                    onChange={(event) => update("gender")(event.target.value as Gender | "")}
                  >
                    <option value="">Not specified</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="profile-dob" label="Date of birth" error={errors.dateOfBirth}>
                  <input
                    id="profile-dob"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    autoComplete="bday"
                    value={form.dateOfBirth}
                    onChange={(event) => update("dateOfBirth")(event.target.value)}
                    aria-invalid={!!errors.dateOfBirth}
                    aria-describedby={describedBy("profile-dob", "dateOfBirth")}
                  />
                </Field>

                {saveError ? (
                  <p className="form-message form-error" role="alert">
                    {saveError}
                  </p>
                ) : null}

                <div className="profile-form-actions">
                  <button className="button button-primary" type="submit" disabled={saving}>
                    {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button className="button button-secondary" type="button" onClick={cancelEditing} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="profile-facts">
                <div>
                  <dt>Phone</dt>
                  <dd>{user.phoneNumber ?? "Not added"}</dd>
                </div>
                <div>
                  <dt>Gender</dt>
                  <dd>{genderLabel(user.gender) ?? "Not added"}</dd>
                </div>
                <div>
                  <dt>Date of birth</dt>
                  <dd>{user.dateOfBirth ? formatDate(user.dateOfBirth) : "Not added"}</dd>
                </div>
              </dl>
            )}

            {saved ? (
              <p className="inline-confirm">
                <Check size={14} />
                {saved.emailChanged
                  ? "Saved. Check your inbox to verify your new email."
                  : "Your profile has been updated."}
              </p>
            ) : null}
          </section>

          <PreferencesCard />
        </div>

        <aside className="profile-side-column">
          <section className="panel privacy-card">
            <span className="privacy-icon">
              <ShieldCheck size={19} />
            </span>
            <p className="page-eyebrow">YOUR INFORMATION</p>
            <h2>Personal by design.</h2>
            <p>
              Your profile and routine are kept in this prototype user. No
              sample scan image is uploaded or analyzed.
            </p>
            <a href="#privacy">
              Privacy details <span>↗</span>
            </a>
          </section>
          <section className="panel connected-card">
            <div className="section-heading">
              <div>
                <p className="page-eyebrow">CONNECTED DEVICES</p>
                <h2>Your setup</h2>
              </div>
            </div>
            <div className="device-row">
              <span className="device-icon">◉</span>
              <span>
                <strong>Camera</strong>
                <small>Not connected</small>
              </span>
              <span className="connection-status">Planned</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}