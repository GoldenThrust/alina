import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_IMAGES = 1;
/** YouCam rejects files of 10 MB or more, so block them before upload. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** YouCam only accepts JPEG and PNG. */
const ACCEPTED = ["image/jpeg", "image/png"];
export const ACCEPT_ATTR = ACCEPTED.join(",");

export interface Attachment {
  id: string;
  file: File;
  /** Local blob: URL for the preview thumbnail. Revoked on remove/clear/unmount. */
  url: string;
}

export function useImageAttachments() {
  const [items, setItems] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef<Attachment[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Release every preview URL when the page goes away.
  useEffect(
    () => () => itemsRef.current.forEach((a) => URL.revokeObjectURL(a.url)),
    [],
  );

  const add = useCallback((incoming: Iterable<File>) => {
    const list = Array.from(incoming);
    if (list.length === 0) return;

    let problem: string | null = null;
    const valid: Attachment[] = [];
    const room = MAX_IMAGES - itemsRef.current.length;

    for (const file of list) {
      if (!ACCEPTED.includes(file.type)) {
        problem = "Only JPEG and PNG images are supported.";
      } else if (file.size >= MAX_IMAGE_BYTES) {
        problem = "Images must be smaller than 10 MB.";
      } else if (valid.length >= room) {
        problem = MAX_IMAGES === 1 ? "You can attach only one image" :`You can attach up to ${MAX_IMAGES} images.`;
      } else {
        valid.push({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
        });
      }
    }

    setError(problem);
    if (valid.length) setItems((prev) => [...prev, ...valid]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      prev.filter((a) => a.id === id).forEach((a) => URL.revokeObjectURL(a.url));
      return prev.filter((a) => a.id !== id);
    });
    setError(null);
  }, []);

  const clear = useCallback(() => {
    itemsRef.current.forEach((a) => URL.revokeObjectURL(a.url));
    setItems([]);
    setError(null);
  }, []);

  return {
    items,
    files: items.map((a) => a.file),
    error,
    add,
    remove,
    clear,
  };
}