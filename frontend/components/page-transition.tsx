"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

import { pageFade, useMotionVariants } from "@/lib/motion";

/**
 * Root-level fade between App Router pages. Uses pathname as the AnimatePresence
 * key so route changes trigger exit -> enter. Falls back to a tiny opacity
 * transition under prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const variants = useMotionVariants(pageFade);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        /* Skip initial "hidden" on mount — avoids a blank / stuck first paint (Next 15 + Framer). */
        initial={false}
        animate="visible"
        exit="exit"
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
