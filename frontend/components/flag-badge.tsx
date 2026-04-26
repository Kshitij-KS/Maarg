"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

import { flagSwirl } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type FlagBadgeProps = {
  pulse?: boolean;
  label?: string;
  className?: string;
};

export function FlagBadge({ pulse = false, label, className }: FlagBadgeProps) {
  return (
    <motion.div
      role="status"
      aria-label={label ?? "Flagged"}
      initial="rest"
      animate={pulse ? "pulse" : "rest"}
      variants={flagSwirl}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warn-400/30 bg-warn-glow px-2 py-0.5 text-warn-400",
        className,
      )}
    >
      <AlertTriangle size={14} aria-hidden />
      {label ? (
        <span className="text-eyebrow text-warn-200">{label}</span>
      ) : null}
    </motion.div>
  );
}
