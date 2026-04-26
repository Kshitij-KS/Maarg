"use client";

import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Filter, Radar, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { AmbulanceModal, SOSButton } from "@/components/ambulance-modal";
import { CriticVerdictCard } from "@/components/critic-verdict-card";
import { FacilityDetailSheet } from "@/components/facility-detail-sheet";
import { MapView } from "@/components/map-view";
import { QueryBar } from "@/components/query-bar";
import { ResultCard } from "@/components/result-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchResults } from "@/hooks/use-search-results";
import { fadeInUp, stagger } from "@/lib/motion";
import { useFiltersStore } from "@/lib/stores/use-filters-store";
import { useUIStore } from "@/lib/stores/use-ui-store";
import { CAPABILITIES, CAPABILITY_LABELS, type Capability } from "@/lib/types";
import { cn } from "@/lib/utils";

function CapabilityChip({ capability }: { capability: Capability }) {
  const active = useFiltersStore((s) => s.capabilities.includes(capability));
  const toggle = useFiltersStore((s) => s.toggleCapability);
  return (
    <motion.button
      type="button"
      onClick={() => toggle(capability)}
      aria-pressed={active}
      whileTap={{ scale: 0.88 }}
      animate={{ scale: active ? 1.08 : 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className={cn(
        "rounded-full border px-3 py-1.5 text-small transition-colors duration-300",
        active
          ? "border-trust-400/50 bg-trust-glow text-trust-200 shadow-glow-trust"
          : "border-border-default bg-surface-raised/70 text-text-secondary hover:border-border-strong hover:text-text-primary",
      )}
    >
      {CAPABILITY_LABELS[capability]}
    </motion.button>
  );
}

function DistanceSlider() {
  const value = useFiltersStore((s) => s.maxDistanceKm);
  const set = useFiltersStore((s) => s.setMaxDistanceKm);
  return (
    <label className="flex flex-col gap-2 text-text-secondary">
      <span className="text-eyebrow text-text-muted">Max Distance</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={5}
          max={200}
          step={5}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          className="range-premium h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-trust-500"
          aria-label="Maximum distance in kilometers"
        />
        <span className="w-16 text-right font-mono text-mono-data text-text-primary">
          {value} km
        </span>
      </div>
    </label>
  );
}

function MinTrustSlider() {
  const value = useFiltersStore((s) => s.minTrust);
  const set = useFiltersStore((s) => s.setMinTrust);
  return (
    <label className="flex flex-col gap-2 text-text-secondary">
      <span className="text-eyebrow text-text-muted">Min Trust</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          className="range-premium h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-trust-500"
          aria-label="Minimum trust score"
        />
        <span className="w-16 text-right font-mono text-mono-data text-text-primary">
          {Math.round(value * 100)}%
        </span>
      </div>
    </label>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-panel space-y-3 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-8 w-24" />
      <div className="space-y-1.5">
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="h-1.5 w-5/6" />
        <Skeleton className="h-1.5 w-4/6" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const { data, isPending, error } = useSearchResults();
  const appliedQuery = useFiltersStore((s) => s.appliedQuery);
  const userLat = useFiltersStore((s) => s.userLat);
  const userLon = useFiltersStore((s) => s.userLon);
  const openFacility = useUIStore((s) => s.openFacility);
  const hasQuery = appliedQuery.length > 0;
  const queryClient = useQueryClient();

  // Pre-populate the facility cache so the detail sheet opens instantly
  // without making a redundant GET /api/facility/{id} round-trip.
  useEffect(() => {
    if (!data) return;
    for (const facility of data.candidates) {
      queryClient.setQueryData(["facility", facility.facility_id], facility);
    }
  }, [data, queryClient]);

  return (
    <>
      <motion.main
        variants={stagger(0.07)}
        initial="hidden"
        animate="visible"
        className="mx-auto w-full max-w-7xl flex-1 px-6 py-7"
      >
        <motion.div
          variants={fadeInUp}
          className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"
        >
          <div>
          <p className="text-eyebrow text-trust-200">Path intelligence</p>
          <h1 className="mt-2 text-h1 text-text-primary">Find the verified path to care</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            Every result is reasoned, cited, and scored. Maarg shows you which
            facilities actually deliver — and flags the ones whose claims don&rsquo;t
            hold up under scrutiny.
          </p>
          </div>
          <motion.div
            variants={fadeInUp}
            className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border-strong bg-surface-overlay px-4 py-3 shadow-card"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Activity className="text-success-500" size={18} aria-hidden />
            </motion.div>
            <div>
              <p className="text-small text-text-primary">Live path intelligence</p>
              <p className="font-mono text-mono-data text-text-muted">Maarg engine · React Query · MLflow trace</p>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* Left: filter + results */}
          <section className="space-y-5">
            <motion.div variants={fadeInUp} className="glass-panel hairline-top space-y-4 rounded-3xl p-4">
              <QueryBar className="bg-surface-elevated/70" />
              <div className="flex items-center gap-2 text-eyebrow text-text-muted">
                <Filter size={14} aria-hidden />
                Filters
              </div>
              <motion.div
                variants={stagger(0.04)}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap items-center gap-2"
              >
                {CAPABILITIES.map((capability) => (
                  <motion.div key={capability} variants={fadeInUp}>
                    <CapabilityChip capability={capability} />
                  </motion.div>
                ))}
              </motion.div>
              <div className="grid gap-5 rounded-2xl border border-border-subtle bg-surface-base/30 p-4 sm:grid-cols-2">
                <DistanceSlider />
                <MinTrustSlider />
              </div>
            </motion.div>

            {!hasQuery ? (
              <motion.div
                variants={fadeInUp}
                className="glass-panel soft-grid rounded-3xl p-12 text-center"
              >
                <motion.div
                  animate={{ y: [0, -6, 0], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-trust-400/20 bg-trust-glow text-trust-400"
                >
                  <Radar size={24} aria-hidden />
                </motion.div>
              <p className="text-h3 text-text-primary">
                Type a query or choose a path from the home page.
              </p>
              <p className="mt-2 text-body text-text-secondary">
                Try &ldquo;Emergency C-section near Madhepura&rdquo; — Maarg will
                reason over every claim, cite every fact, and surface the truth.
              </p>
              </motion.div>
            ) : null}

            {error ? (
              <motion.div
                variants={fadeInUp}
                role="alert"
                className="glass-panel rounded-2xl border-l-4 border-l-danger-500 p-5 text-body text-text-primary"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-danger-400" size={18} aria-hidden />
                  <p className="text-h3">API error</p>
                </div>
                <p className="text-text-secondary">{error.message}</p>
              </motion.div>
            ) : null}

            {hasQuery && isPending ? (
              <motion.div
                variants={stagger(0.06)}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div key={i} variants={fadeInUp}>
                    <SkeletonCard />
                  </motion.div>
                ))}
              </motion.div>
            ) : null}

            {data ? (
              <motion.div
                key={data.trace_id}
                variants={stagger(0.06)}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <motion.div variants={fadeInUp}>
                  <CriticVerdictCard
                    verdict={data.critic_verdict}
                    reasoning={data.critic_reasoning}
                    traceId={data.trace_id}
                  />
                </motion.div>
                <motion.div variants={fadeInUp} className="flex items-center justify-between">
                  <p className="text-eyebrow text-text-muted">
                    {data.candidates.length} facilit{data.candidates.length === 1 ? "y" : "ies"} matched
                  </p>
                  <Badge
                    variant="outline"
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer border-border-strong bg-surface-raised/80 font-mono text-mono-data transition-colors hover:border-trust-400/40 hover:text-trust-200"
                    onClick={() => {
                      void navigator.clipboard.writeText(data.trace_id);
                      toast.success("Trace ID copied");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void navigator.clipboard.writeText(data.trace_id);
                        toast.success("Trace ID copied");
                      }
                    }}
                  >
                    {data.trace_id.slice(0, 12)}
                  </Badge>
                </motion.div>
                {data.candidates.map((facility) => (
                  <motion.div key={facility.facility_id} variants={fadeInUp}>
                    <ResultCard
                      facility={facility}
                      onClick={() => openFacility(facility.facility_id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : null}
          </section>

          {/* Right: live map */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 h-[74vh]">
              <MapView
                facilities={data?.candidates}
                userLat={userLat}
                userLon={userLon}
                className="h-full w-full"
                height="100%"
              />
            </div>
          </aside>
        </div>
      </motion.main>

      {/* Global overlays */}
      <FacilityDetailSheet />
      <AmbulanceModal facilities={data?.candidates ?? []} />
      <SOSButton />
    </>
  );
}
