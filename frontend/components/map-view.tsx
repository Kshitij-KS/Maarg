"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Layers, MapPin } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { desertMarkerKey } from "@/lib/map-markers";
import { useUIStore } from "@/lib/stores/use-ui-store";
import type { FacilityTrustRecord, PinCodeDesert } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV !== "production" &&
  !MAPBOX_TOKEN
) {
  console.warn(
    "[map-view] NEXT_PUBLIC_MAPBOX_TOKEN is empty — rendering placeholder map. Set it in frontend/.env.local to enable live tiles.",
  );
}

const BIHAR_CENTER = { longitude: 86.9, latitude: 25.85, zoom: 8 };

function trustColor(score: number): string {
  if (score >= 0.8) return "#22c55e";   // green
  if (score >= 0.5) return "#f59e0b";   // amber
  return "#ef4444";                      // red
}

function trustRing(score: number): string {
  if (score >= 0.8) return "rgba(34,197,94,0.3)";
  if (score >= 0.5) return "rgba(245,158,11,0.3)";
  return "rgba(239,68,68,0.3)";
}

function FacilityPin({
  facility,
  selected,
  onClick,
}: {
  facility: FacilityTrustRecord;
  selected: boolean;
  onClick: () => void;
}) {
  const color = trustColor(facility.overall_trust_score);
  const ring = trustRing(facility.overall_trust_score);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select ${facility.facility_name}`}
      className="group relative flex cursor-pointer flex-col items-center"
      style={{ background: "none", border: "none", padding: 0 }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.2 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border-2"
        style={{
          backgroundColor: color,
          borderColor: selected ? "#fff" : "rgba(255,255,255,0.5)",
          boxShadow: selected
            ? `0 0 0 4px ${ring}, 0 0 20px ${color}`
            : `0 0 0 2px ${ring}`,
        }}
      >
        <MapPin size={14} color="white" fill="white" />
        {selected && (
          <motion.span
            layoutId="selected-ring"
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 3px ${color}` }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </motion.div>
      {/* Pulse ring for high-trust facilities */}
      {facility.overall_trust_score >= 0.8 && (
        <motion.span
          className="pointer-events-none absolute h-8 w-8 rounded-full"
          style={{ backgroundColor: color, opacity: 0.3 }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      )}
      {/* Tooltip */}
      <div
        className="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-border-default bg-surface-raised px-3 py-1.5 text-small text-text-primary opacity-0 shadow-card transition-opacity group-hover:opacity-100"
      >
        {facility.facility_name}
      </div>
    </button>
  );
}

function DesertPin({ desert }: { desert: PinCodeDesert }) {
  const intensity = desert.desert_score;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.7 }}
      className="pointer-events-none flex items-center justify-center rounded-full"
      style={{
        width: `${Math.max(16, intensity * 40)}px`,
        height: `${Math.max(16, intensity * 40)}px`,
        backgroundColor: `rgba(239, 68, 68, ${Math.min(0.7, intensity * 0.8)})`,
        border: "1px solid rgba(239,68,68,0.4)",
      }}
    />
  );
}

type MapViewProps = {
  facilities?: FacilityTrustRecord[];
  deserts?: PinCodeDesert[];
  userLat?: number | null;
  userLon?: number | null;
  className?: string;
  height?: string;
  defaultShowDeserts?: boolean;
};

export function MapView({
  facilities = [],
  deserts = [],
  userLat,
  userLon,
  className,
  height = "100%",
  defaultShowDeserts = false,
}: MapViewProps) {
  const activeFacilityId = useUIStore((s) => s.activeFacilityId);
  const openFacility = useUIStore((s) => s.openFacility);
  const [showDeserts, setShowDeserts] = useState(defaultShowDeserts);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const mapRef = useRef<MapRef>(null);

  const handleMarkerClick = useCallback(
    (facility: FacilityTrustRecord) => {
      openFacility(facility.facility_id);
      mapRef.current?.flyTo({
        center: [facility.lon, facility.lat],
        zoom: 12,
        duration: 800,
      });
    },
    [openFacility],
  );

  if (!MAPBOX_TOKEN || tokenInvalid) {
    return (
      <div
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border-default bg-surface-overlay",
          className,
        )}
        style={{ height }}
      >
        <div className="absolute inset-0 soft-grid opacity-30" />
        {facilities.map((f, i) => (
          <motion.button
            key={f.facility_id}
            type="button"
            onClick={() => openFacility(f.facility_id)}
            className="absolute flex cursor-pointer flex-col items-center"
            style={{
              left: `${20 + (i % 3) * 28}%`,
              top: `${25 + Math.floor(i / 3) * 35}%`,
              background: "none",
              border: "none",
            }}
            whileHover={{ scale: 1.25 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            aria-label={`Select ${f.facility_name}`}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/50 shadow-lg"
              style={{ backgroundColor: trustColor(f.overall_trust_score) }}
            >
              <MapPin size={14} color="white" fill="white" />
            </div>
            <span className="mt-1 max-w-[80px] rounded-md bg-surface-base/80 px-1 text-center font-mono text-[10px] text-text-secondary backdrop-blur">
              {f.facility_name.split(" ").slice(0, 2).join(" ")}
            </span>
          </motion.button>
        ))}
        <div className="relative z-10 rounded-2xl border border-border-subtle bg-surface-base/80 px-5 py-3 text-center backdrop-blur">
          <p className="text-small text-text-muted">
            Add{" "}
            <code className="rounded bg-surface-overlay px-1 text-trust-200">
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code>{" "}
            to enable the live map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl", className)}
      style={{ height }}
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={BIHAR_CENTER}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        reuseMaps
        onError={(evt) => {
          const status = (evt.error as { status?: number } | undefined)?.status;
          if (status === 401 || status === 403) {
            if (typeof console !== "undefined") {
              console.warn(
                "[map-view] Mapbox auth failed — falling back to placeholder. Check NEXT_PUBLIC_MAPBOX_TOKEN.",
                evt.error,
              );
            }
            setTokenInvalid(true);
          }
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* User location marker */}
        {userLat != null && userLon != null && (
          <Marker latitude={userLat} longitude={userLon} anchor="center">
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-4 w-4 rounded-full border-2 border-white bg-trust-400 shadow-glow-trust"
            />
          </Marker>
        )}

        {/* Desert heatmap overlays */}
        {showDeserts &&
          deserts.map((d, index) => (
            <Marker
              key={desertMarkerKey(d, index)}
              latitude={d.lat}
              longitude={d.lon}
              anchor="center"
            >
              <DesertPin desert={d} />
            </Marker>
          ))}

        {/* Facility markers */}
        {facilities.map((facility) => (
          <Marker
            key={facility.facility_id}
            latitude={facility.lat}
            longitude={facility.lon}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(facility);
            }}
          >
            <FacilityPin
              facility={facility}
              selected={activeFacilityId === facility.facility_id}
              onClick={() => handleMarkerClick(facility)}
            />
          </Marker>
        ))}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 rounded-xl border border-border-default bg-surface-base/85 p-3 backdrop-blur-sm">
        <p className="text-eyebrow text-text-muted">Trust score</p>
        {[
          { label: "≥ 0.80 — High", color: "#22c55e" },
          { label: "0.50–0.79 — Moderate", color: "#f59e0b" },
          { label: "< 0.50 — Low", color: "#ef4444" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="font-mono text-[11px] text-text-secondary">{label}</span>
          </div>
        ))}
      </div>

      {/* Desert toggle */}
      {deserts.length > 0 && (
        <button
          type="button"
          onClick={() => setShowDeserts((v) => !v)}
          className={cn(
            "absolute right-4 top-14 flex items-center gap-2 rounded-xl border px-3 py-2 text-small transition-all",
            showDeserts
              ? "border-danger-500/40 bg-danger-500/10 text-danger-400"
              : "border-border-default bg-surface-base/85 text-text-secondary backdrop-blur-sm hover:text-text-primary",
          )}
        >
          <Layers size={14} aria-hidden />
          Medical deserts
        </button>
      )}

      {/* Facility count badge */}
      <AnimatePresence>
        {facilities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute left-4 top-4 rounded-xl border border-border-default bg-surface-base/85 px-3 py-1.5 backdrop-blur-sm"
          >
            <span className="font-mono text-mono-data text-text-primary">
              {facilities.length} facilit{facilities.length === 1 ? "y" : "ies"} mapped
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
