"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, CircleAlert, Loader2, XOctagon } from "lucide-react";
import { useState } from "react";

import { getTraceTimeline } from "@/lib/api";
import { haloPulse, scalePopIn, slideInLeft } from "@/lib/motion";
import type { QueryResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type Verdict = QueryResponse["critic_verdict"];

const VERDICT_COPY: Record<Verdict, { title: string; tone: string; border: string; iconClass: string; Icon: React.ComponentType<{ size?: number }> }> = {
  supported: {
    title: "Supported",
    tone: "Citations corroborate the claim set.",
    border: "border-l-success-500",
    iconClass: "text-success-500",
    Icon: CheckCircle2,
  },
  partial: {
    title: "Partial",
    tone: "Some claims contradict their cited evidence.",
    border: "border-l-warn-500",
    iconClass: "text-warn-400",
    Icon: CircleAlert,
  },
  unsupported: {
    title: "Unsupported",
    tone: "Citation grounding failed for this query.",
    border: "border-l-danger-500",
    iconClass: "text-danger-400",
    Icon: XOctagon,
  },
};

export type CriticVerdictCardProps = {
  verdict: Verdict;
  reasoning: string;
  traceId: string;
};

export function CriticVerdictCard({
  verdict,
  reasoning,
  traceId,
}: CriticVerdictCardProps) {
  const meta = VERDICT_COPY[verdict];
  const { Icon } = meta;
  const [timelineOpen, setTimelineOpen] = useState(false);
  const { data: timeline, isPending } = useQuery({
    queryKey: ["trace-timeline", traceId],
    queryFn: () => getTraceTimeline(traceId),
    enabled: timelineOpen,
    staleTime: 60_000,
  });

  const haloTint =
    verdict === "supported"
      ? "bg-success-500/25"
      : verdict === "partial"
        ? "bg-warn-500/20"
        : "bg-danger-500/20";

  return (
    <div className="relative">
      <motion.div
        aria-hidden
        variants={haloPulse}
        initial="rest"
        animate="pulse"
        className={cn(
          "pointer-events-none absolute -inset-3 -z-10 rounded-[1.35rem] blur-2xl",
          haloTint,
        )}
      />
      <motion.section
        variants={slideInLeft}
        initial="hidden"
        animate="visible"
        className={cn(
          "relative hairline-top rounded-2xl border border-l-4 border-border-strong bg-surface-overlay p-5 shadow-card",
          meta.border,
        )}
        aria-label={`Maarg reasoning verdict: ${meta.title}`}
      >
      <div className="flex items-start gap-3">
        <motion.div
          variants={scalePopIn}
          initial="hidden"
          animate="visible"
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-elevated/70",
            meta.iconClass,
          )}
        >
          <Icon size={20} />
        </motion.div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-h3 text-text-primary">
              Maarg verdict: {meta.title}
            </h2>
            <span className="rounded-full border border-border-subtle bg-surface-base/45 px-2.5 py-0.5 font-mono text-mono-data text-text-muted">
              {traceId}
            </span>
          </div>
          <p className="text-small text-text-muted">{meta.tone}</p>
          <p className="text-body text-text-secondary">{reasoning}</p>
          <button
            type="button"
            onClick={() => setTimelineOpen((open) => !open)}
            className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated/60 px-3 py-1.5 text-small text-text-secondary transition-colors hover:border-trust-400/35 hover:text-trust-200"
          >
            {isPending ? (
              <Loader2 size={13} className="animate-spin text-trust-400" aria-hidden />
            ) : (
              <ChevronDown
                size={13}
                className={cn("transition-transform", timelineOpen && "rotate-180")}
                aria-hidden
              />
            )}
            Reasoning timeline
          </button>
          {timelineOpen && timeline ? (
            <div className="mt-3 space-y-2 border-t border-border-subtle pt-3">
              {timeline.found ? (
                timeline.nodes.slice(0, 6).map((node) => (
                  <div
                    key={node.id}
                    className="rounded-xl border border-border-subtle bg-surface-base/35 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-small font-medium text-text-primary">
                        {node.agent}
                      </span>
                      <span className="rounded-full border border-border-subtle px-2 py-0.5 font-mono text-[10px] text-text-muted">
                        {node.latency_ms != null ? `${node.latency_ms} ms` : node.status}
                      </span>
                    </div>
                    <p className="mt-1 text-small text-text-muted">{node.summary}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-border-subtle bg-surface-base/35 px-3 py-2 text-small text-text-muted">
                  Trace not found in the local MLflow store yet.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </motion.section>
    </div>
  );
}
