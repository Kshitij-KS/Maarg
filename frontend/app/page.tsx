"use client";

import { animate } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, ArrowRight, CheckCircle2, Database, MapPinned, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { LandingBackground } from "@/components/landing-background";
import { PartnerEcosystemCta, PartnerEcosystemTeaser } from "@/components/partner-ecosystem";
import { QueryBar } from "@/components/query-bar";
import { Badge } from "@/components/ui/badge";
import { getDemoMoments } from "@/lib/api";
import { FALLBACK_DEMO_MOMENTS } from "@/lib/demo-moments-fallback";
import { EASE, fadeInUp, stagger } from "@/lib/motion";
import { useFiltersStore } from "@/lib/stores/use-filters-store";
import type { DemoMoment } from "@/lib/types";
import { cn } from "@/lib/utils";

const FACILITY_COUNT = 10247;
const LAST_UPDATED = "14:32 IST";

type MetricAnimated = {
  kind: "animated";
  label: string;
  numeric: number;
  suffix: string;
  decimals: number;
  icon: typeof Activity;
};

type MetricProse = {
  kind: "prose";
  /** Short display line — no synthetic numeric stats. */
  headline: string;
  label: string;
  icon: typeof Activity;
};

const METRICS: (MetricAnimated | MetricProse)[] = [
  { kind: "animated", label: "Facilities indexed", numeric: 10247, suffix: "", decimals: 0, icon: Activity },
  { kind: "animated", label: "People covered", numeric: 1.4, suffix: "B", decimals: 1, icon: MapPinned },
  {
    kind: "prose",
    headline: "Citation-backed",
    label: "Every trust score links to a source field. We do not show unaudited claim totals.",
    icon: ShieldCheck,
  },
];

function MetricCardAnimated({ label, numeric, suffix, decimals, icon: Icon }: Omit<MetricAnimated, "kind">) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(0, numeric, {
      duration: 1.4,
      ease: EASE,
      onUpdate(v) {
        if (!spanRef.current) return;
        const formatted =
          decimals > 0
            ? v.toFixed(decimals)
            : Math.round(v).toLocaleString("en-IN");
        spanRef.current.textContent = formatted + suffix;
      },
    });
    return () => controls.stop();
  }, [numeric, suffix, decimals]);

  const initial =
    decimals > 0
      ? numeric.toFixed(decimals) + suffix
      : numeric.toLocaleString("en-IN") + suffix;

  return (
    <div className="editorial-panel rounded-2xl p-4">
      <Icon className="mb-4 text-trust-500/80" size={18} aria-hidden />
      <p className="text-numeric-lg text-text-primary">
        <span ref={spanRef}>{initial}</span>
      </p>
      <p className="mt-1 text-small text-text-muted">{label}</p>
    </div>
  );
}

function MetricCardProse({ headline, label, icon: Icon }: Omit<MetricProse, "kind">) {
  return (
    <div className="editorial-panel rounded-2xl p-4">
      <Icon className="mb-4 text-trust-500/80" size={18} aria-hidden />
      <p className="text-numeric-lg text-balance text-text-primary">{headline}</p>
      <p className="mt-1 text-pretty text-small leading-snug text-text-muted">{label}</p>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrate = useFiltersStore((s) => s.hydrateFromScenario);
  const applyNow = useFiltersStore((s) => s.applyNow);

  // Next client navigation to /#partner-ecosystem does not always scroll; fix in-app.
  useEffect(() => {
    if (pathname !== "/") return;
    if (window.location.hash !== "#partner-ecosystem") return;
    const t = window.setTimeout(() => {
      document.getElementById("partner-ecosystem")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
    return () => clearTimeout(t);
  }, [pathname]);

  const { data, isError } = useQuery({
    queryKey: ["demo-moments"],
    queryFn: getDemoMoments,
    staleTime: 5 * 60_000,
  });

  const liveMoments = data?.moments.slice(0, 3) ?? [];
  const usingFallback = isError || liveMoments.length === 0;
  const moments = usingFallback
    ? FALLBACK_DEMO_MOMENTS.moments.slice(0, 3)
    : liveMoments;

  const launchMoment = (moment: DemoMoment) => {
    if (moment.request) {
      hydrate(moment.request);
      applyNow();
      router.push("/search");
      return;
    }
    if (moment.target_facility_id) {
      router.push(`/audit/${moment.target_facility_id}`);
      return;
    }
    router.push("/map?capability=emergency_obstetric_care");
  };

  return (
    <main className="relative z-0 mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10">
      <LandingBackground />

      <motion.div
        variants={stagger(0.07)}
        initial={false}
        animate="visible"
        className="relative z-10 grid min-h-[calc(100vh-8rem)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_424px]"
      >
        <section className="flex flex-col items-start gap-8 text-left">
          <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="h-7 border-border-default bg-surface-raised/70 px-3 text-eyebrow text-text-secondary shadow-card"
            >
              <Database size={13} className="text-trust-500" aria-hidden />
              Powered by Databricks
            </Badge>
            <span className="font-mono text-[11px] text-text-muted">
              मार्ग · The path to verified care
            </span>
          </motion.div>

          <motion.div variants={fadeInUp} className="space-y-6">
            <div className="h-px w-24 accent-rule" />
            <h1 className="text-display max-w-4xl text-balance text-text-primary md:text-[76px]">
              Healthcare maps that{" "}
              <span className="relative inline-block text-trust-600">
                don&rsquo;t lie.
                <span className="absolute -bottom-1 left-1 right-1 h-px bg-trust-500/35" />
              </span>
            </h1>
            <p className="text-body max-w-2xl text-balance text-[16px] text-text-secondary">
              Maarg audits every facility claim before it reaches you.
              Citation-backed trust scores, calibrated confidence, and live
              contradiction detection — because when finding the path saves a
              life, you can&rsquo;t afford to guess.
            </p>
            <PartnerEcosystemTeaser />
          </motion.div>

          <motion.div variants={fadeInUp} className="w-full max-w-2xl">
            <QueryBar />
          </motion.div>

          <motion.div
            variants={fadeInUp}
            data-demo="true"
            className="w-full max-w-2xl space-y-2"
          >
            <p className="text-eyebrow text-text-muted">Illustrative scale · the third card is not a number by design</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {METRICS.map((metric) =>
                metric.kind === "animated" ? (
                  <MetricCardAnimated
                    key={metric.label}
                    label={metric.label}
                    numeric={metric.numeric}
                    suffix={metric.suffix}
                    decimals={metric.decimals}
                    icon={metric.icon}
                  />
                ) : (
                  <MetricCardProse key={metric.headline} label={metric.label} headline={metric.headline} icon={metric.icon} />
                ),
              )}
            </div>
          </motion.div>

          {/* Brand positioning line */}
          <motion.div variants={fadeInUp} className="space-y-1">
            <p className="max-w-xl text-small text-text-secondary italic">
              &ldquo;The agentic map to verified healthcare — because when finding
              the path saves a life, you can&rsquo;t afford to guess.&rdquo;
            </p>
            <p className="font-mono text-mono-data text-text-muted">
              Mapping {FACILITY_COUNT.toLocaleString()} facilities &middot; Last updated {LAST_UPDATED}
            </p>
          </motion.div>
        </section>

        <motion.aside variants={fadeInUp} className="editorial-panel relative overflow-hidden rounded-[1.75rem] p-5">
          <div className="absolute inset-x-6 top-0 h-px accent-rule" />
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-trust-glow blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-viz-2/10 blur-3xl" />
          <div className="relative">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-eyebrow text-text-muted">Demo cockpit</p>
                <h2 className="mt-1 text-h2 text-text-primary">Run the pitch</h2>
              </div>
              <span className="rounded-full border border-success-500/20 bg-success-500/10 px-3 py-1 text-small text-success-600 dark:text-success-500">
                Live API
              </span>
            </div>

            <div className="space-y-3">
              {usingFallback ? (
                <div className="rounded-2xl border border-warn-400/25 bg-warn-glow p-3 text-small text-warn-600 dark:text-warn-200">
                  Backend offline — showing canonical demo paths from local cache.
                </div>
              ) : null}
              {moments.map((moment, index) => (
                <button
                  key={moment.id}
                  type="button"
                  onClick={() => launchMoment(moment)}
                  className={cn(
                    "group relative w-full overflow-hidden rounded-2xl border border-border-default bg-surface-raised/58 p-4 text-left shadow-sm transition-all duration-200",
                    "hover:border-trust-400/30 hover:bg-surface-raised/90 hover:shadow-md",
                    "active:scale-[0.99]",
                  )}
                >
                  <span className="absolute inset-y-3 left-0 w-px bg-gradient-to-b from-transparent via-trust-500/70 to-transparent" />
                  <div className="flex items-start justify-between gap-4 pl-2">
                    <div>
                      <p className="font-mono text-mono-data text-trust-200">
                        0{index + 1} · {moment.title}
                      </p>
                      <p className="mt-2 text-body text-text-primary">
                        {moment.success_criteria[0]}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border-subtle bg-surface-elevated/70 px-2 py-0.5 font-mono text-[10px] text-text-muted">
                          {moment.endpoint}
                        </span>
                        {moment.target_facility_id ? (
                          <span className="rounded-full border border-warn-400/25 bg-warn-glow px-2 py-0.5 font-mono text-[10px] text-warn-600 dark:text-warn-200">
                            {moment.target_facility_id}
                          </span>
                        ) : null}
                        {moment.target_pin_code ? (
                          <span className="rounded-full border border-danger-400/25 bg-danger-500/10 px-2 py-0.5 font-mono text-[10px] text-danger-400">
                            PIN {moment.target_pin_code}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-small text-text-muted">
                        <CheckCircle2 size={13} className="text-success-500" aria-hidden />
                        <span>{moment.design_notes[0]}</span>
                      </div>
                    </div>
                    <ArrowRight
                      size={18}
                      className="mt-1 shrink-0 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-trust-400"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.aside>
      </motion.div>

      <div className="relative mx-auto mt-16 w-full max-w-5xl">
        <PartnerEcosystemCta />
      </div>
    </main>
  );
}
