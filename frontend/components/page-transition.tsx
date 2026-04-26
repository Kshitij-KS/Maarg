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
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
