import { useAuthStore } from "../stores";

export interface UpdateProfileInput {
  fullName: string;
  email: string;
  phoneNumber: string | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
}

/** What the server changed. Fits straight into authStore.patchUser. */
export type UserPatch = Partial<Omit<User, "id">>;

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/* ---------- "Backend" ---------- */

export async function updateProfile(
  input: UpdateProfileInput,
  options: { signal?: AbortSignal } = {},
): Promise<UserPatch> {
  // Swap this body for the real request:
  //   const res = await fetch("/api/users/me", {
  //     method: "PATCH",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(input),
  //     signal: options.signal,
  //   });
  //   if (!res.ok) throw new Error((await res.json()).message ?? `Request failed (${res.status})`);
  //   const patch = await res.json();
  //   return { ...patch, dateOfBirth: patch.dateOfBirth ? new Date(patch.dateOfBirth) : null,
  //            emailVerifiedAt: patch.emailVerifiedAt ? new Date(patch.emailVerifiedAt) : null,
  //            updatedAt: new Date(patch.updatedAt) };
  await wait(600, options.signal);

  // Lets you exercise the error path
  if (input.email.toLowerCase() === "taken@example.com") {
    throw new Error("That email is already in use.");
  }

  // The server knows the old email itself. The mock has to peek at the store.
  const current = useAuthStore.getState().user;
  const emailChanged = !!current && input.email.toLowerCase() !== current.email.toLowerCase();

  return {
    ...input,
    // A new email has to be verified again
    ...(emailChanged ? { emailVerifiedAt: null } : {}),
    updatedAt: new Date(),
  };
}

/** Uploads an image and returns its public URL. */
export async function uploadAvatar(file: File, options: { signal?: AbortSignal } = {}): Promise<string> {
  // Swap this body for the real request:
  //   const body = new FormData();
  //   body.append("avatar", file);
  //   const res = await fetch("/api/users/me/avatar", { method: "PUT", body, signal: options.signal });
  //   if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  //   return ((await res.json()) as { url: string }).url;
  await wait(700, options.signal);

  // Mock only: a data URL stands in for a hosted file
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read that image."));
    reader.readAsDataURL(file);
  });
}

export async function removeAvatar(options: { signal?: AbortSignal } = {}): Promise<void> {
  // Swap for: await fetch("/api/users/me/avatar", { method: "DELETE", signal: options.signal });
  await wait(400, options.signal);
}