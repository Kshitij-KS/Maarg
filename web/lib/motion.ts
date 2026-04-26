import type { Transition, Variants } from "framer-motion";

/**
 * Single source of truth for the Maarg motion vocabulary. Mirrors
 * --ease-maarg in globals.css so CSS and JS animations feel identical.
 */
export const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

const baseTransition: Transition = { duration: 0.4, ease: EASE };

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
};

/**
 * Used as the parent variant when staggering children. Pass the per-child
 * delay in seconds.
 */
export const stagger = (delay = 0.06): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: delay,
      delayChildren: 0.04,
    },
  },
});

export const flagSwirl: Variants = {
  rest: { rotate: 0, scale: 1 },
  pulse: {
    rotate: [0, -8, 8, -4, 0],
    scale: [1, 1.08, 1.02, 1.05, 1],
    transition: {
      duration: 1.4,
      ease: EASE,
      repeat: Infinity,
      repeatDelay: 1.6,
    },
  },
};

export const drawLine: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.9, ease: EASE },
  },
};

export const ciFill: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: EASE },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 380, damping: 28 },
  },
};

export const scalePopIn: Variants = {
  hidden: { opacity: 0, scale: 0.78 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 520, damping: 22 },
  },
};
