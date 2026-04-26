"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, MapPin, Waves } from "lucide-react";
import { useEffect, useState } from "react";

import { AmbulanceModal, SOSButton } from "@/components/ambulance-modal";
import { FacilityDetailSheet } from "@/components/facility-detail-sheet";
import { MapView } from "@/components/map-view";
import { Badge } from "@/components/ui/badge";
import { getDesertRows, getDesertSummary, getMapFacilities } from "@/lib/api";
import { fadeInUp, stagger } from "@/lib/motion";
import { useFiltersStore } from "@/lib/stores/use-filters-store";
import { CAPABILITIES, CAPABILITY_LABELS, type DesertSummary } from "@/lib/types";

const CAPABILITY_OPTIONS = [
  { value: "", label: "All capabilities" },
  ...CAPABILITIES.map((capability) => ({
    value: capability,
    label: CAPABILITY_LABELS[capability],
  })),
];

const MAP_FACILITY_LIMIT = 1000;

function DesertStatCard({
  summary,
}: {
  summary: DesertSummary;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Critical PINs", value: summary.critical_pin_count, icon: MapPin },
        {
          label: "People at risk",
          value: summary.population_at_risk.toLocaleString("en-IN"),
          icon: AlertTriangle,
        },
        {
          label: "Avg severity",
          value: `${(summary.average_desert_score * 100).toFixed(0)}%`,
          icon: BarChart3,
        },
      ].map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="rounded-xl border border-border-default bg-surface-raised/60 p-3 text-center"
        >
          <Icon size={14} className="mx-auto mb-1 text-text-muted" />
          <p className="text-h3 text-text-primary">{value}</p>
          <p className="text-eyebrow text-text-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default function MapPage() {
  const [capabilityFilter, setCapabilityFilter] = useState("");
  const userLat = useFiltersStore((s) => s.userLat);
  const userLon = useFiltersStore((s) => s.userLon);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const capability = new URLSearchParams(window.location.search).get("capability");
    if (capability) setCapabilityFilter(capability);
  }, []);

  const { data: deserts = [], isPending, isError } = useQuery({
    queryKey: ["deserts", capabilityFilter],
    queryFn: () =>
      getDesertRows(capabilityFilter ? { capability: capabilityFilter } : {}),
    staleTime: 5 * 60_000,
  });
  const {
    data: summary,
    isPending: summaryPending,
    isError: summaryError,
  } = useQuery({
    queryKey: ["desert-summary", capabilityFilter],
    queryFn: () =>
      getDesertSummary(capabilityFilter ? { capability: capabilityFilter } : {}),
    staleTime: 5 * 60_000,
  });

  const {
    data: facilities = [],
    isPending: facilitiesPending,
    isError: facilitiesError,
  } = useQuery({
    queryKey: ["map-facilities", capabilityFilter],
    queryFn: () =>
      getMapFacilities({
        capability: capabilityFilter || undefined,
        limit: MAP_FACILITY_LIMIT,
      }),
    staleTime: 5 * 60_000,
  });

  return (
    <>
      <motion.main
        variants={stagger(0.06)}
        initial={false}
        animate="visible"
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-6 py-7"
      >
        <motion.div variants={fadeInUp}>
          <p className="text-eyebrow text-trust-200">Coverage intelligence</p>
          <h1 className="mt-2 text-h1 text-text-primary">Where the path ends</h1>
          <p className="mt-1 max-w-2xl text-body text-text-secondary">
            Medical deserts mapped against verified facility trust. The red zones
            are not data gaps — they are people without options. Maarg makes that
            visible so it can&rsquo;t be ignored.
          </p>
        </motion.div>

        <motion.div variants={fadeInUp} className="grid gap-5 lg:grid-cols-[1fr_280px]">
          {/* Map */}
          <MapView
            facilities={facilities}
            deserts={deserts}
            userLat={userLat}
            userLon={userLon}
            className="min-h-[60vh] w-full lg:min-h-[78vh]"
            height="100%"
            defaultShowDeserts
          />

          {/* Side panel */}
          <div className="flex flex-col gap-4">
            <div className="glass-panel rounded-2xl p-4">
              <p className="mb-3 text-eyebrow text-text-muted">Filter by capability</p>
              <div className="flex flex-wrap gap-2">
                {CAPABILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCapabilityFilter(opt.value)}
                    className={`rounded-full border px-3 py-1.5 text-small transition-colors ${
                      capabilityFilter === opt.value
                        ? "border-trust-400/50 bg-trust-glow text-trust-200"
                        : "border-border-default bg-surface-raised/70 text-text-secondary hover:border-border-strong hover:text-text-primary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <Waves size={14} className="text-danger-400" />
                <p className="text-eyebrow text-text-muted">Coverage gap summary</p>
                {(isPending || summaryPending) && (
                  <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-trust-400" />
                )}
              </div>
              {summary ? (
                <DesertStatCard summary={summary} />
              ) : isPending || summaryPending ? (
                <p className="text-small text-text-muted">Loading desert data…</p>
              ) : isError || summaryError ? (
                <p className="text-small text-warn-200">
                  Could not load desert summary. Check the API server.
                </p>
              ) : (
                <p className="text-small text-text-muted">No desert zones found.</p>
              )}
              {facilitiesError ? (
                <p className="mt-3 text-small text-warn-200">
                  Could not load facility pins. The map will only show desert zones.
                </p>
              ) : facilitiesPending ? (
                <p className="mt-3 text-small text-text-muted">Loading facility pins…</p>
              ) : null}
            </div>

            {summary?.top_deserts.length ? (
              <div className="glass-panel rounded-2xl p-4">
                <p className="mb-3 text-eyebrow text-text-muted">Top desert PINs</p>
                <div className="space-y-2">
                  {summary.top_deserts.slice(0, 4).map((pin) => (
                    <div
                      key={`${pin.pin_code}-${pin.capability}`}
                      className="rounded-xl border border-border-subtle bg-surface-raised/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-mono-data text-text-primary">
                          {pin.pin_code}
                        </span>
                        <span className="font-mono text-mono-data text-danger-400">
                          {(pin.desert_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="mt-1 text-small text-text-muted">
                        {pin.district}, {pin.state} ·{" "}
                        {(pin.population ?? 0).toLocaleString("en-IN")} people
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Legend */}
            <div className="glass-panel rounded-2xl p-4">
              <p className="mb-3 text-eyebrow text-text-muted">Map legend</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-success-500" />
                  <span className="text-small text-text-secondary">Facility — Trust ≥ 0.80</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-warn-400" />
                  <span className="text-small text-text-secondary">Facility — Trust 0.50–0.79</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-danger-500" />
                  <span className="text-small text-text-secondary">Facility — Trust &lt; 0.50</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border border-danger-400/40 bg-danger-500/40" />
                  <span className="text-small text-text-secondary">Medical desert zone</span>
                </div>
                {userLat != null && (
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-trust-400 shadow-glow-trust" />
                    <span className="text-small text-text-secondary">Your location</span>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-border-strong font-mono text-mono-data">
                  {facilities.length} pins
                </Badge>
                <Badge variant="outline" className="border-border-strong font-mono text-mono-data">
                  {summary?.total_rows ?? deserts.length} zones
                </Badge>
                <span className="text-eyebrow text-text-muted">loaded from API</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.main>

      <FacilityDetailSheet />
      <AmbulanceModal facilities={facilities} />
      <SOSButton />
    </>
  );
}
