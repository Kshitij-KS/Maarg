"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { cva } from "class-variance-authority";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { ConfidenceBar } from "@/components/confidence-bar";
import { FlagBadge } from "@/components/flag-badge";
import { Badge } from "@/components/ui/badge";
import { formatDistanceKm, formatTrustScore } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import { EASE, fadeInUp, stagger } from "@/lib/motion";
import { useFiltersStore } from "@/lib/stores/use-filters-store";
import {
  CAPABILITY_LABELS,
  type Capability,
  type CapabilityClaim,
  type FacilityTrustRecord,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-5 transition-all duration-300",
  {
    variants: {
      state: {
        default:
          "border-border-default bg-surface-overlay shadow-card hover:-translate-y-0.5 hover:border-trust-400/45 hover:bg-surface-raised/90 hover:shadow-popover",
        flagged:
          "border-warn-500/35 bg-surface-overlay text-text-secondary shadow-card hover:-translate-y-0.5 hover:shadow-popover",
      },
    },
    defaultVariants: { state: "default" },
  },
);

const SIGNAL_LABELS: Record<keyof Pick<CapabilityClaim, "self_consistency_score" | "coherence_score" | "peer_anomaly_score">, string> = {
  self_consistency_score: "Self-consistency",
  coherence_score: "Coherence",
  peer_anomaly_score: "Peer anomaly",
};

function pickPrimaryClaim(facility: FacilityTrustRecord): CapabilityClaim | null {
  if (facility.capabilities.length === 0) return null;
  const present = facility.capabilities.filter((c) => c.claim_present);
  const pool = present.length > 0 ? present : facility.capabilities;
  return pool.reduce((best, current) =>
    current.trust_score > best.trust_score ? current : best,
  );
}

function TrustScore({ value, flagged }: { value: number; flagged: boolean }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => formatTrustScore(v));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: EASE });
    return controls.stop;
  }, [mv, value]);

  return (
    <motion.span
      className={cn(
        "text-numeric-lg",
        flagged ? "text-warn-500" : "text-trust-600",
      )}
    >
      {display}
    </motion.span>
  );
}

function SignalBar({
  label,
  value,
  flagged,
  delay = 0,
}: {
  label: string;
  value: number;
  flagged: boolean;
  delay?: number;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-eyebrow text-text-muted">{label}</span>
        <span className="font-mono text-mono-data text-text-secondary">
          {value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-default">
        <motion.div
          className={cn(
            "h-full rounded-full",
            flagged ? "bg-warn-500" : "bg-trust-500",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.75, ease: EASE, delay }}
        />
      </div>
    </div>
  );
}

export type ResultCardProps = {
  facility: FacilityTrustRecord;
  className?: string;
  onClick?: () => void;
};

export function ResultCard({ facility, className, onClick }: ResultCardProps) {
  const userLat = useFiltersStore((s) => s.userLat);
  const userLon = useFiltersStore((s) => s.userLon);

  const flagged = facility.capabilities.some(
    (c) => (c.flags ?? []).length > 0,
  );
  const primary = pickPrimaryClaim(facility);

  const distanceKm =
    userLat != null && userLon != null
      ? haversineKm(userLat, userLon, facility.lat, facility.lon)
      : null;

  const visibleCapabilities = facility.capabilities.slice(0, 3);
  const overflowCount = Math.max(0, facility.capabilities.length - 3);

  return (
    <article
      data-flagged={flagged}
      onClick={onClick}
      className={cn(
        cardVariants({ state: flagged ? "flagged" : "default" }),
        onClick && "cursor-pointer",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px accent-rule opacity-70" />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-85",
          flagged ? "bg-warn-glow opacity-45" : "bg-trust-glow opacity-25",
        )}
      />
      {flagged ? (
        <div className="absolute right-4 top-4">
          <FlagBadge pulse label="Flagged" />
        </div>
      ) : null}

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3 pr-24">
          <div className="flex flex-col gap-1">
            <h3
              className={cn(
                "text-h3",
                flagged ? "text-text-secondary" : "text-text-primary",
              )}
            >
              {facility.facility_name}
            </h3>
            <p className="text-small text-text-muted">
              {facility.district}, {facility.state}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {distanceKm != null ? (
              <span className="rounded-full border border-border-subtle bg-surface-elevated/80 px-2.5 py-0.5 font-mono text-mono-data text-text-secondary">
                {formatDistanceKm(distanceKm)}
              </span>
            ) : null}
            <Badge variant="outline" className="border-border-strong text-text-secondary">
              {facility.facility_type}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-6">
        <div className="rounded-2xl border border-border-subtle bg-surface-raised/72 px-4 py-3 shadow-card">
          <span className="text-eyebrow text-text-muted">Trust</span>
          <TrustScore value={facility.overall_trust_score} flagged={flagged} />
        </div>
        {primary ? (
          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <span className="text-eyebrow text-text-muted">
              {CAPABILITY_LABELS[primary.capability as Capability] ??
                primary.capability}{" "}
              CI
            </span>
            <ConfidenceBar
              low={primary.confidence_interval_low}
              point={primary.trust_score}
              high={primary.confidence_interval_high}
              glow={!flagged}
            />
          </div>
        ) : null}
      </div>

      {primary ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SignalBar
            label={SIGNAL_LABELS.self_consistency_score}
            value={primary.self_consistency_score}
            flagged={flagged}
            delay={0}
          />
          <SignalBar
            label={SIGNAL_LABELS.coherence_score}
            value={primary.coherence_score}
            flagged={flagged}
            delay={0.08}
          />
          <SignalBar
            label={SIGNAL_LABELS.peer_anomaly_score}
            value={primary.peer_anomaly_score}
            flagged={flagged}
            delay={0.16}
          />
        </div>
      ) : null}

      <motion.div
        className="flex flex-wrap items-center gap-1.5"
        variants={stagger(0.05)}
        initial="hidden"
        animate="visible"
      >
        {visibleCapabilities.map((claim) => {
          const claimFlagged = (claim.flags ?? []).length > 0;
          return (
            <motion.span
              key={claim.capability}
              variants={fadeInUp}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-small",
                claimFlagged
                  ? "border-warn-400/35 bg-warn-glow text-warn-600 dark:text-warn-200"
                  : claim.claim_present
                    ? "border-trust-400/25 bg-trust-glow text-trust-600 dark:text-trust-200"
                    : "border-border-default bg-surface-elevated text-text-muted",
              )}
            >
              {CAPABILITY_LABELS[claim.capability as Capability] ??
                claim.capability}
            </motion.span>
          );
        })}
        {overflowCount > 0 ? (
          <motion.span
            variants={fadeInUp}
            className="rounded-full border border-border-default bg-surface-elevated px-2.5 py-0.5 text-small text-text-secondary"
          >
            +{overflowCount}
          </motion.span>
        ) : null}
      </motion.div>

      <footer className="relative z-10 flex items-center justify-between border-t border-border-subtle pt-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick?.();
          }}
          className="rounded-full px-2 py-1 text-small text-text-secondary transition-colors hover:bg-surface-elevated hover:text-trust-600 dark:hover:text-trust-200"
        >
          Show evidence
        </button>
        <Link
          href={`/audit/${facility.facility_id}`}
          className="group inline-flex items-center gap-1 text-small text-trust-600 transition-colors hover:text-trust-400 dark:text-trust-200"
        >
          Audit
          <ArrowUpRight
            size={14}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </footer>
    </article>
  );
}
