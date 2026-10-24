import { del, put } from "./api";

export async function savePreferences(
  preferences: Preference,
  signal?: AbortSignal,
) {
  await put("/preferences", { ...preferences, signal });
}

export async function updateProfile(profile: Partial<User>) {
  profile = {
    fullName: profile.fullName ?? undefined,
    phoneNumber: profile.phoneNumber ?? undefined,
    gender: profile.gender ?? undefined,
    dateOfBirth: profile.dateOfBirth ?? undefined,
   };
  return (await put<{ user: User }>("/auth/user", profile)).user as User;
}

export async function uploadAvatar(file: File) {
  const formData = new FormData();

  formData.append("image", file);
  return (await put<User>("/auth/avatar", formData)) as User;
}

export async function removeAvatar() {
  await del("/auth/avatar");
}
