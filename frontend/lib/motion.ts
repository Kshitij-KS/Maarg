import type { Transition, Variants } from "framer-motion";
import { useReducedMotion } from "framer-motion";

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

/* ------------------------------------------------------------------ */
/*                         Pass 2 additions                           */
/* ------------------------------------------------------------------ */

/**
 * Page-level fade for AnimatePresence route transitions. Slightly shorter
 * than fadeInUp so the chrome feels weightless between routes.
 */
export const pageFade: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: EASE } },
};

/**
 * Soft hover lift used by clickable cards. Pairs with shadow-popover.
 */
export const hoverLift: Variants = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -3,
    scale: 1.005,
    transition: { type: "spring", stiffness: 320, damping: 24 },
  },
  tap: { y: -1, scale: 0.995, transition: { duration: 0.12, ease: EASE } },
};

/**
 * Continuous shimmer band used for skeleton loaders. Apply to a -200% wide
 * gradient child positioned absolutely over the skeleton block.
 */
export const shimmer: Variants = {
  initial: { x: "-120%" },
  animate: {
    x: "120%",
    transition: {
      duration: 1.6,
      ease: "linear",
      repeat: Infinity,
      repeatDelay: 0.4,
    },
  },
};

/**
 * Halo pulse keyed on verdict status. Apply as a blurred sibling behind a
 * card to draw the eye without distracting from copy.
 */
export const haloPulse: Variants = {
  rest: { opacity: 0.32, scale: 1 },
  pulse: {
    opacity: [0.28, 0.52, 0.28],
    scale: [1, 1.04, 1],
    transition: { duration: 4.2, repeat: Infinity, ease: EASE },
  },
};

/**
 * Aurora conic-gradient rotation for premium focus rings.
 */
export const auroraSpin: Variants = {
  rest: { rotate: 0, opacity: 0 },
  active: {
    rotate: 360,
    opacity: 1,
    transition: {
      rotate: { duration: 12, repeat: Infinity, ease: "linear" },
      opacity: { duration: 0.4, ease: EASE },
    },
  },
};

/**
 * Reduced-motion-aware variant resolver. If the user prefers reduced motion,
 * collapse to a minimal opacity transition; otherwise return the rich variant.
 *
 * Usage:
 *   const variants = useMotionVariants(fadeInUp);
 */
export function useMotionVariants<T extends Variants>(rich: T): Variants {
  const prefersReduced = useReducedMotion();
  if (!prefersReduced) return rich;
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.18 } },
    exit: { opacity: 0, transition: { duration: 0.12 } },
    rest: { opacity: 1 },
    hover: { opacity: 1 },
    tap: { opacity: 1 },
    pulse: { opacity: 1 },
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  } as Variants;
}

/**
 * Simple boolean form, for ad-hoc inline animations that aren't variant-based.
 */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}
