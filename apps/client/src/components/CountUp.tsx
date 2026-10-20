import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

const defaultFormat = (v: number) => String(Math.round(v));

/** Counts up to `value` and re-animates whenever it changes. Pass a stable `format` (define it outside the component). */
export default function CountUp({ value, format = defaultFormat }: { value: number; format?: (v: number) => string }) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const text = useTransform(motionValue, format);

  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [value, reduce, motionValue]);

  return <motion.strong>{text}</motion.strong>;
}