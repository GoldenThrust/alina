import { useCallback, useState } from "react";
import {
  removeAvatar as removeAvatarRequest,
  updateProfile,
  uploadAvatar,
  type UpdateProfileInput,
} from "../data/user";
import { useAuthStore } from "../stores";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const messageOf = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export function useProfileActions() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  /** Resolves true on success so the caller can close the form. */
  const saveProfile = useCallback(async (input: UpdateProfileInput) => {
    setSaving(true);
    setSaveError(null);
    try {
      const patch = await updateProfile(input);
      useAuthStore.getState().patchUser(patch);
      return true;
    } catch (err) {
      setSaveError(messageOf(err, "Couldn't save your changes."));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const changeAvatar = useCallback(async (file: File) => {
    setAvatarError(null);
    if (!file.type.startsWith("image/")) return setAvatarError("Choose an image file.");
    if (file.size > MAX_AVATAR_BYTES) return setAvatarError("Image must be 2 MB or smaller.");

    setAvatarBusy(true);
    try {
      const url = await uploadAvatar(file);
      useAuthStore.getState().patchUser({ avatar: url });
    } catch (err) {
      setAvatarError(messageOf(err, "Couldn't upload that photo."));
    } finally {
      setAvatarBusy(false);
    }
  }, []);

  const removeAvatar = useCallback(async () => {
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      await removeAvatarRequest();
      useAuthStore.getState().patchUser({ avatar: null });
    } catch (err) {
      setAvatarError(messageOf(err, "Couldn't remove your photo."));
    } finally {
      setAvatarBusy(false);
    }
  }, []);

  const clearErrors = useCallback(() => {
    setSaveError(null);
    setAvatarError(null);
  }, []);

  return { saving, saveError, avatarBusy, avatarError, saveProfile, changeAvatar, removeAvatar, clearErrors };
}