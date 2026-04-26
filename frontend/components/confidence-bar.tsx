"use client";

import { motion } from "framer-motion";

import { ciFill } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ConfidenceBarProps = {
  low: number;
  point: number;
  high: number;
  glow?: boolean;
  className?: string;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function formatScore(n: number): string {
  return clamp01(n).toFixed(2);
}

export function ConfidenceBar({
  low,
  point,
  high,
  glow = false,
  className,
}: ConfidenceBarProps) {
  const lowPct = clamp01(low) * 100;
  const highPct = clamp01(high) * 100;
  const widthPct = Math.max(0, highPct - lowPct);
  const pointPct = clamp01(point) * 100;

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <div
        className={cn(
          "relative h-2 w-full overflow-visible rounded-full bg-border-default",
          "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r before:from-danger-500/25 before:via-warn-500/25 before:to-trust-500/25",
          glow && "shadow-glow-trust",
        )}
        role="img"
        aria-label={`Confidence interval ${formatScore(low)} to ${formatScore(high)}, point ${formatScore(point)}`}
      >
        <motion.div
          variants={ciFill}
          initial="hidden"
          animate="visible"
          className="absolute top-0 h-full origin-left rounded-full bg-gradient-to-r from-trust-600/30 via-trust-400/50 to-trust-200/30"
          style={{ left: `${lowPct}%`, width: `${widthPct}%` }}
        />
        {/* Diamond marker drops in from above */}
        <motion.div
          initial={{ y: -10, opacity: 0, scale: 0.4 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.35 }}
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] bg-trust-400 shadow-[0_0_0_3px_var(--color-surface-raised),0_0_18px_rgba(45,212,220,0.55)]"
          style={{ left: `${pointPct}%` }}
          aria-hidden
        />
      </div>
      <div className="flex justify-between font-mono text-mono-data text-text-muted">
        <span>{formatScore(low)}</span>
        <span className="text-trust-200">{formatScore(point)}</span>
        <span>{formatScore(high)}</span>
      </div>
    </div>
  );
}
