"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Layers, MapPin } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type LayerProps,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/mapbox";
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
    "[map-view] NEXT_PUBLIC_MAPBOX_TOKEN is empty — set it in frontend/.env.local to enable live tiles.",
  );
}

const BIHAR_CENTER = { longitude: 86.9, latitude: 25.85, zoom: 7 };

// Mapbox expression: map trust score → colour
const TRUST_COLOR_EXPR = [
  "case",
  [">=", ["get", "trust"], 0.8], "#22c55e",
  [">=", ["get", "trust"], 0.5], "#f59e0b",
  "#ef4444",
] as unknown as string;

// Unclustered facility circle layer
const unclusteredCircle: LayerProps = {
  id: "facilities-unclustered",
  type: "circle",
  source: "facilities",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": TRUST_COLOR_EXPR,
    "circle-radius": [
      "interpolate", ["linear"], ["zoom"],
      6, 4,
      10, 7,
      14, 11,
    ],
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "rgba(255,255,255,0.6)",
    "circle-opacity": 0.92,
  },
};


// Cluster bubble
const clusterCircle: LayerProps = {
  id: "facilities-clusters",
  type: "circle",
  source: "facilities",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step", ["get", "point_count"],
      "#60a5fa",   // <10  light blue
      10, "#3b82f6",   // <50  blue
      50, "#1d4ed8",   // <200 dark blue
      200, "#1e3a8a",  // 200+ navy
    ],
    "circle-radius": [
      "step", ["get", "point_count"],
      18, 10, 24, 50, 32, 200, 42,
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(255,255,255,0.4)",
    "circle-opacity": 0.88,
  },
};

// Cluster count label
const clusterCount: LayerProps = {
  id: "facilities-cluster-count",
  type: "symbol",
  source: "facilities",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 13,
  },
  paint: { "text-color": "#ffffff" },
};

// Desert heatmap circle
const desertCircle: LayerProps = {
  id: "deserts-layer",
  type: "circle",
  source: "deserts",
  paint: {
    "circle-color": "#ef4444",
    "circle-opacity": ["interpolate", ["linear"], ["get", "score"], 0, 0.3, 1, 0.65],
    "circle-radius": ["interpolate", ["linear"], ["get", "score"], 0, 10, 1, 32],
    "circle-blur": 0.6,
  },
};

function trustColor(score: number): string {
  if (score >= 0.8) return "#22c55e";
  if (score >= 0.5) return "#f59e0b";
  return "#ef4444";
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

  // Build GeoJSON FeatureCollection for facilities (memoised — stable until facilities array changes)
  const facilityGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: facilities.map((f) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [f.lon, f.lat] },
        properties: {
          id: f.facility_id,
          name: f.facility_name,
          trust: f.overall_trust_score,
          state: f.state,
          district: f.district,
        },
      })),
    }),
    [facilities],
  );

  // Build GeoJSON for desert zones
  const desertGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: deserts.map((d, i) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [d.lon, d.lat] },
        properties: { id: desertMarkerKey(d, i), score: d.desert_score },
      })),
    }),
    [deserts],
  );

  const selectedFilter = useMemo(
    () => ["==", ["get", "id"], activeFacilityId ?? ""] as unknown as string,
    [activeFacilityId],
  );

  const handleMapClick = useCallback(
    (evt: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      // Cluster click → zoom in
      const clusterFeatures = map.queryRenderedFeatures(evt.point, {
        layers: ["facilities-clusters"],
      });
      if (clusterFeatures.length) {
        const cluster = clusterFeatures[0];
        const clusterId = cluster.properties?.cluster_id as number;
        const source = map.getSource("facilities") as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          const geo = cluster.geometry as GeoJSON.Point;
          map.easeTo({ center: geo.coordinates as [number, number], zoom, duration: 500 });
        });
        return;
      }

      // Facility click → open detail sheet + flyTo
      const facilityFeatures = map.queryRenderedFeatures(evt.point, {
        layers: ["facilities-unclustered"],
      });
      if (facilityFeatures.length) {
        const props = facilityFeatures[0].properties as { id: string };
        openFacility(props.id);
        const geo = facilityFeatures[0].geometry as GeoJSON.Point;
        map.flyTo({ center: geo.coordinates as [number, number], zoom: 12, duration: 700 });
      }
    },
    [openFacility],
  );

  // Pointer cursor over interactive layers
  const handleMouseEnter = useCallback(() => {
    mapRef.current?.getMap().getCanvas().style.setProperty("cursor", "pointer");
  }, []);
  const handleMouseLeave = useCallback(() => {
    mapRef.current?.getMap().getCanvas().style.setProperty("cursor", "");
  }, []);

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
        {facilities.slice(0, 12).map((f, i) => (
          <motion.button
            key={f.facility_id}
            type="button"
            onClick={() => openFacility(f.facility_id)}
            className="absolute flex cursor-pointer flex-col items-center"
            style={{
              left: `${20 + (i % 4) * 20}%`,
              top: `${25 + Math.floor(i / 4) * 22}%`,
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
        interactiveLayerIds={["facilities-clusters", "facilities-unclustered"]}
        onClick={handleMapClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onError={(evt) => {
          const status = (evt.error as { status?: number } | undefined)?.status;
          if (status === 401 || status === 403) setTokenInvalid(true);
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Desert heatmap — GeoJSON circle layer */}
        {showDeserts && (
          <Source id="deserts" type="geojson" data={desertGeoJSON}>
            <Layer {...desertCircle} />
          </Source>
        )}

        {/* Facility cluster source — all 10k records as WebGL circles */}
        <Source
          id="facilities"
          type="geojson"
          data={facilityGeoJSON}
          cluster
          clusterMaxZoom={13}
          clusterRadius={50}
        >
          <Layer {...clusterCircle} />
          <Layer {...clusterCount} />
          <Layer {...(unclusteredCircle as LayerProps)} />
          {/* Selected facility highlight ring — driven by activeFacilityId */}
          <Layer
            id="facilities-selected"
            type="circle"
            source="facilities"
            filter={selectedFilter as unknown as LayerProps["filter"]}
            paint={{
              "circle-color": "transparent",
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 8, 14, 16],
              "circle-stroke-width": 2.5,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 0,
              "circle-stroke-opacity": 1,
            }}
          />
        </Source>

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
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono text-[11px] text-text-secondary">{label}</span>
          </div>
        ))}
        {showDeserts && (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger-500 opacity-60" />
            <span className="font-mono text-[11px] text-text-secondary">Medical desert</span>
          </div>
        )}
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
              {facilities.length.toLocaleString()} facilit{facilities.length === 1 ? "y" : "ies"} mapped
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
