import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { imageUrl } from "../utils/imageUrl";

/** Image grid inside a message bubble. Tiles have a fixed aspect ratio, so
 *  images loading never changes the list height (keeps scroll-to-bottom exact). */
export function MessageImages({
  images,
  onOpen,
}: {
  images: string[];
  onOpen: (src: string) => void;
}) {
  return (
    <div className={`ch-images n-${Math.min(images.length, 4)}`}>
      {images.map((src, i) => {
        const url = imageUrl(src);
        return (
          <button
            key={`${src}-${i}`}
            type="button"
            className="ch-image"
            aria-label="View image"
            onClick={() => onOpen(url)}
          >
            <img src={url} alt="" loading="lazy" decoding="async" />
          </button>
        );
      })}
    </div>
  );
}

/** Full-size viewer. Closes on backdrop click or Escape. */
export function ImageLightbox({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  return (
    <AnimatePresence>
      {src ? (
        <motion.div
          className="ch-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <button
            type="button"
            className="ch-lightbox-close"
            aria-label="Close preview"
            onClick={onClose}
          >
            <X size={18} />
          </button>
          <motion.img
            src={src}
            alt=""
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}