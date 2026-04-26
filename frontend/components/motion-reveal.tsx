"use client";

import { motion } from "framer-motion";

import { EASE } from "@/lib/motion";

export function MotionReveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.42, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
