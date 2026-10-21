import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { EASE } from "../utils/motion";

/** Render inside <AnimatePresence> so it can animate out. */
export default function StatusBanner({
  title,
  text,
  onRetry,
}: {
  title: string;
  text: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      className="status-banner-wrap"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <div className="status-banner" role="alert">
        <span className="status-banner-icon">
          <AlertTriangle size={16} />
        </span>
        <p>
          <strong>{title}</strong>
          <small>{text}</small>
        </p>
        <button className="button button-secondary" type="button" onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </motion.div>
  );
}