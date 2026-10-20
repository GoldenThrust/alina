
import { motion, useReducedMotion } from "motion/react";

export default function Splash() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white"
    >
      {/* Animated logo */}
      <motion.img
        src="/alina.svg"
        alt="Alina logo"
        className="splash-logo w-28! h-28! select-none"
        initial={
          shouldReduceMotion
            ? false
            : { opacity: 0, scale: 0.7, y: 18, rotate: -8 }
        }
        animate={{
          opacity: 1,
          scale: 1,
          y: shouldReduceMotion ? 0 : [0, -6, 0],
          rotate: 0,
        }}
        transition={{
          opacity: { duration: 0.5 },
          scale: { duration: 0.6, type: "spring", stiffness: 180, damping: 14 },
          y: shouldReduceMotion
            ? { duration: 0 }
            : { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 0.5 },
        }}
        draggable={false}
      />

      {/* Animated wordmark */}
      <motion.span
        className="wordmark text-xl! font-semibold tracking-wide"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.25,
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        Alina
      </motion.span>

      {/* Loading indicator */}
      <motion.div
        className="mt-2 h-1 w-16 overflow-hidden rounded-full bg-(--accent-dark)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        role="progressbar"
        aria-label="Loading"
      >
        <motion.div
          className="h-full w-1/2 rounded-full bg-current text-white"
          animate={shouldReduceMotion ? { x: 0 } : { x: ["-100%", "200%"] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
