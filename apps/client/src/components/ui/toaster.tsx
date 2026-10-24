import toast, { resolveValue, Toaster, type Toast } from "react-hot-toast";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type TargetAndTransition,
  type Transition,
} from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LoaderCircle,
  Sparkles,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info" | "loading" | "ai";

const ICONS: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: LoaderCircle,
  ai: Sparkles,
};

/** Small attention-getting motion per variant. Success pops in via the icon swap itself. */
const ICON_MOTION: Partial<Record<ToastVariant, { animate: TargetAndTransition; transition: Transition }>> = {
  error: { animate: { x: [0, -3, 3, -2, 2, 0] }, transition: { duration: 0.4, delay: 0.12 } },
  warning: { animate: { scale: [1, 1.18, 1] }, transition: { duration: 0.6, delay: 0.1, repeat: 1 } },
  ai: {
    animate: { scale: [1, 1.15, 1], rotate: [0, 14, 0] },
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
  },
};

const VARIANTS = Object.keys(ICONS) as ToastVariant[];

/**
 * success / error / loading come from react-hot-toast's own type.
 * warning / info / ai ride along in `className` (set by notify.*).
 */
function variantOf(t: Toast): ToastVariant {
  if (t.type === "success" || t.type === "error" || t.type === "loading") return t.type;
  const named = t.className?.split(" ").find((c) => VARIANTS.includes(c as ToastVariant));
  return (named as ToastVariant | undefined) ?? "info";
}

/* ---------- Rich content (title, description, action) ---------- */

export function ToastContent({
  toastId,
  title,
  description,
  action,
}: {
  toastId: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="toast-copy">
      <p className="toast-title">{title}</p>
      {description ? <p className="toast-description">{description}</p> : null}
      {action ? (
        <button
          className="toast-action"
          type="button"
          onClick={() => {
            action.onClick();
            toast.dismiss(toastId);
          }}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Card ---------- */

function ToastCard(t: Toast) {
  const variant = variantOf(t);
  const Icon = ICONS[variant];
  const iconMotion = ICON_MOTION[variant];

  const content = resolveValue(t.message, t);
  // Plain strings (every existing toast.success("…") call) get the standard title styling
  const body =
    typeof content === "string" ? (
      <div className="toast-copy">
        <p className="toast-title">{content}</p>
      </div>
    ) : (
      content
    );

  // Loading toasts have an infinite duration, so they get an indeterminate bar instead
  const duration = Number.isFinite(t.duration) ? (t.duration as number) : null;

  return (
    <motion.div
      {...t.ariaProps}
      role={variant === "error" ? "alert" : t.ariaProps.role}
      className="toast-card"
      data-variant={variant}
      // react-hot-toast flips `visible` off when it's time to leave, so enter and exit both come from here
      initial={{ opacity: 0, y: -18, scale: 0.94 }}
      animate={t.visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -12, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      // Swipe sideways to dismiss
      drag="x"
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0.6}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 500) toast.dismiss(t.id);
      }}
    >
      <div className="toast-body">
        <span className="toast-icon">
          {/* Updating a toast in place (loading → success) swaps the icon with a pop */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={variant}
              className="toast-icon-inner"
              initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.4, opacity: 0, rotate: 30 }}
              transition={{ duration: 0.18 }}
            >
              <motion.span
                className="toast-icon-inner"
                animate={iconMotion?.animate}
                transition={iconMotion?.transition}
              >
                <Icon size={18} className={variant === "loading" ? "spin" : undefined} />
              </motion.span>
            </motion.span>
          </AnimatePresence>
        </span>

        {body}

        <button className="toast-close" type="button" aria-label="Dismiss" onClick={() => toast.dismiss(t.id)}>
          <X size={15} />
        </button>
      </div>

      {/* Remounts (and restarts) whenever the variant or duration changes. Hover pauses it. */}
      {duration ? (
        <span key={`${variant}-${duration}`} className="toast-progress" style={{ animationDuration: `${duration}ms` }} />
      ) : variant === "loading" ? (
        <span className="toast-progress indeterminate" />
      ) : null}
    </motion.div>
  );
}

/* ---------- Toaster ---------- */

export function AppToaster() {
  return (
    <MotionConfig reducedMotion="user">
      <Toaster
        position="top-center"
        gutter={10}
        containerStyle={{ top: 16 }}
        toastOptions={{
          duration: 4500,
          style: { background: "transparent", boxShadow: "none", padding: 0, maxWidth: "none" },
        }}
      >
        {(t) => <ToastCard {...t} />}
      </Toaster>
    </MotionConfig>
  );
}