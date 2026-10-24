import {
  useState,
  type ChangeEventHandler,
  type ReactNode,
  type SubmitEventHandler,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  Camera,
  Check,
  CircleUserRound,
  Loader2,
  Pencil,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import PageHeading from "../components/PageHeading";
import PreferencesCard from "../components/PreferencesCard";
import { useProfileActions } from "../hooks/useProfileActions";
import { useAuthStore } from "../stores";
import { EASE, container, item } from "../utils/motion";
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

/** Shared by messages that appear and disappear (errors, confirmations). */
const reveal = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.25, ease: EASE },
};

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
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.small
            key="error"
            className="field-error"
            id={`${id}-error`}
            role="alert"
            {...reveal}
          >
            {error}
          </motion.small>
        ) : hint ? (
          <motion.small
            key="hint"
            className="field-hint"
            id={`${id}-hint`}
            {...reveal}
          >
            {hint}
          </motion.small>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export default function Profile() {
  const user = useAuthStore((state: AuthState) => state.user);
  const {
    saving,
    saveError,
    avatarBusy,
    avatarError,
    saveProfile,
    changeAvatar,
    removeAvatar,
    clearErrors,
  } = useProfileActions();

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
    <MotionConfig reducedMotion="user">
      <motion.div
        className="page-content profile-page"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <PageHeading
            eyebrow="The details that make it yours"
            title="Your profile"
            description="A few preferences can help Alina make more relevant suggestions."
          />
        </motion.div>

        <div className="profile-layout">
          <div className="profile-main-column">
            <motion.section className="panel profile-card" variants={item}>
              <div className="section-heading">
                <div>
                  <p className="page-eyebrow">ABOUT YOU</p>
                  <h2>Personal details</h2>
                </div>
                <motion.button
                  className="icon-button edit-profile"
                  type="button"
                  onClick={editing ? cancelEditing : startEditing}
                  aria-label={editing ? "Cancel editing" : "Edit profile"}
                  whileTap={{ scale: 0.9 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={editing ? "close" : "edit"}
                      style={{ display: "grid" }}
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.15 }}
                    >
                      {editing ? <X size={17} /> : <Pencil size={16} />}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>

              <div className="profile-details">
                <span className="profile-avatar">
                  <AnimatePresence mode="wait" initial={false}>
                    {user.avatar ? (
                      <motion.img
                        key={user.avatar}
                        src={user.avatar}
                        alt=""
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: avatarBusy ? 0.5 : 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.25, ease: EASE }}
                      />
                    ) : (
                      <motion.span
                        key="placeholder"
                        style={{ display: "grid" }}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.25, ease: EASE }}
                      >
                        <CircleUserRound size={31} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <div>
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                  <AnimatePresence mode="wait" initial={false}>
                    {user.emailVerifiedAt ? (
                      <motion.small
                        key="verified"
                        className="verify-chip verified"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      >
                        <Check size={11} /> Verified
                      </motion.small>
                    ) : (
                      <motion.small
                        key="unverified"
                        className="verify-chip"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                      >
                        Not verified
                      </motion.small>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="avatar-actions">
                <label
                  className="button button-secondary upload-button"
                  aria-disabled={avatarBusy}
                >
                  {avatarBusy ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <Camera size={14} />
                  )}
                  {avatarBusy ? "Working…" : user.avatar ? "Change photo" : "Add photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChosen}
                    disabled={avatarBusy}
                  />
                </label>
                <AnimatePresence initial={false}>
                  {user.avatar ? (
                    <motion.button
                      key="remove"
                      className="button button-secondary"
                      type="button"
                      onClick={() => void removeAvatar()}
                      disabled={avatarBusy}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2, ease: EASE }}
                    >
                      <Trash2 size={14} /> Remove
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>

              <AnimatePresence initial={false}>
                {avatarError ? (
                  <motion.p
                    key="avatar-error"
                    className="form-message form-error"
                    role="alert"
                    {...reveal}
                  >
                    {avatarError}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {editing && form ? (
                  <motion.form
                    key="form"
                    className="profile-form"
                    onSubmit={submit}
                    noValidate
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease: EASE }}
                  >
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
                        onChange={(event) =>
                          update("gender")(event.target.value as Gender | "")
                        }
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

                    <AnimatePresence initial={false}>
                      {saveError ? (
                        <motion.p
                          key="save-error"
                          className="form-message form-error"
                          role="alert"
                          {...reveal}
                        >
                          {saveError}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>

                    <div className="profile-form-actions">
                      <motion.button
                        className="button button-primary"
                        type="submit"
                        disabled={saving}
                        whileTap={{ scale: 0.97 }}
                      >
                        {saving ? (
                          <Loader2 size={15} className="spin" />
                        ) : (
                          <Check size={15} />
                        )}
                        {saving ? "Saving…" : "Save changes"}
                      </motion.button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.dl
                    key="facts"
                    className="profile-facts"
                    variants={container}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
                  >
                    <motion.div variants={item}>
                      <dt>Phone</dt>
                      <dd>{user.phoneNumber ?? "Not added"}</dd>
                    </motion.div>
                    <motion.div variants={item}>
                      <dt>Gender</dt>
                      <dd>{genderLabel(user.gender) ?? "Not added"}</dd>
                    </motion.div>
                    <motion.div variants={item}>
                      <dt>Date of birth</dt>
                      <dd>
                        {user.dateOfBirth ? formatDate(user.dateOfBirth) : "Not added"}
                      </dd>
                    </motion.div>
                  </motion.dl>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {saved ? (
                  <motion.p
                    key="saved"
                    className="inline-confirm"
                    {...reveal}
                  >
                    <motion.span
                      style={{ display: "inline-grid" }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                    >
                      <Check size={14} />
                    </motion.span>
                    {saved.emailChanged
                      ? "Saved. Check your inbox to verify your new email."
                      : "Your profile has been updated."}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </motion.section>

            <motion.div variants={item}>
              <PreferencesCard />
            </motion.div>
          </div>

          <aside className="profile-side-column">
            <motion.section className="panel privacy-card" variants={item}>
              <motion.span
                className="privacy-icon"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.3 }}
              >
                <ShieldCheck size={19} />
              </motion.span>
              <p className="page-eyebrow">YOUR INFORMATION</p>
              <h2>Personal by design.</h2>
              <p>
                Your profile and routine are kept in this prototype user. No
                sample scan image is uploaded or analyzed.
              </p>
              <a href="#privacy">
                Privacy details <span>↗</span>
              </a>
            </motion.section>

            <motion.section className="panel connected-card" variants={item}>
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
            </motion.section>
          </aside>
        </div>
      </motion.div>
    </MotionConfig>
  );
}