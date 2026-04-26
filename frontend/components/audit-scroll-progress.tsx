"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Thin reading-progress rail for long audit pages.
 */
export function AuditScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[90] h-[3px] origin-left bg-gradient-to-r from-trust-500 via-warn-400/90 to-trust-600 shadow-glow-trust"
      style={{ scaleX }}
    />
  );
}
