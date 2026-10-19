export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
];

export const genderLabel = (gender: Gender | null) =>
  GENDER_OPTIONS.find((o) => o.value === gender)?.label ?? null;

/** Date -> "YYYY-MM-DD" for <input type="date"> (UTC). */
export function toDateInput(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> Date at UTC midnight. */
export const fromDateInput = (value: string): Date | null =>
  value ? new Date(`${value}T00:00:00.000Z`) : null;

export const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export interface ProfileForm {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: Gender | "";
  dateOfBirth: string;
}

export type ProfileErrors = Partial<Record<keyof ProfileForm, string>>;

export const formFromUser = (user: User): ProfileForm => ({
  fullName: user.fullName,
  email: user.email,
  phoneNumber: user.phoneNumber ?? "",
  gender: user.gender ?? "",
  dateOfBirth: toDateInput(user.dateOfBirth),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateProfile(form: ProfileForm): ProfileErrors {
  const errors: ProfileErrors = {};

  const name = form.fullName.trim();
  if (!name) errors.fullName = "Enter your name.";
  else if (name.length > 80) errors.fullName = "Keep your name under 80 characters.";

  if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email address.";

  const phone = form.phoneNumber.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
      errors.phoneNumber = "Enter a valid phone number, e.g. +234 801 234 5678.";
    }
  }

  if (form.dateOfBirth) {
    const dob = fromDateInput(form.dateOfBirth);
    if (!dob || Number.isNaN(dob.getTime()) || dob.getUTCFullYear() < 1900) {
      errors.dateOfBirth = "Enter a valid date.";
    } else if (dob.getTime() > Date.now()) {
      errors.dateOfBirth = "Date of birth can't be in the future.";
    }
  }

  return errors;
}