"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Crosshair,
  Loader2,
  MapPin,
  Phone,
  Siren,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmergencyDispatchPanel } from "@/components/emergency-dispatch-panel";
import { rankEmergencyFacilities } from "@/lib/emergency-dispatch-agent";
import { formatDistanceKm } from "@/lib/format";
import type { FacilityTrustRecord } from "@/lib/types";
import { useFiltersStore } from "@/lib/stores/use-filters-store";
import { useUIStore } from "@/lib/stores/use-ui-store";

type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "located"; lat: number; lon: number; city?: string }
  | { status: "error"; message: string };

const reverseGeocodeCache = new Map<string, string>();

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = reverseGeocodeCache.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "MaargHealthDemo/1.0 (emergency dispatch; contact: demo@maarg.test)",
        },
      },
    );
    if (!res.ok) return "your location";
    const data = (await res.json()) as {
      address?: { city?: string; town?: string; village?: string; state?: string };
    };
    const a = data.address ?? {};
    const label = a.city ?? a.town ?? a.village ?? a.state ?? "your location";
    reverseGeocodeCache.set(key, label);
    return label;
  } catch {
    return "your location";
  }
}

type AmbulanceModalProps = {
  facilities?: FacilityTrustRecord[];
};

export function AmbulanceModal({ facilities = [] }: AmbulanceModalProps) {
  const open = useUIStore((s) => s.ambulanceModalOpen);
  const setOpen = useUIStore((s) => s.setAmbulanceModalOpen);
  const setUserLocation = useUIStore((s) => s.setUserLocation);
  const setUserCoords = useFiltersStore((s) => s.setUserCoords);

  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [agentOpen, setAgentOpen] = useState(false);

  const locate = useCallback(async () => {
    setGeo({ status: "locating" });
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60_000,
        }),
      );
      const { latitude: lat, longitude: lon } = pos.coords;
      const city = await reverseGeocode(lat, lon);
      setGeo({ status: "located", lat, lon, city });
      setUserLocation({ lat, lon, city });
      setUserCoords(lat, lon);
    } catch (err) {
      const msg =
        err instanceof GeolocationPositionError && err.code === 1
          ? "Location permission denied. Please allow location access in your browser."
          : "Could not determine your location. Try again or call 112.";
      setGeo({ status: "error", message: msg });
    }
  }, [setUserLocation, setUserCoords]);

  useEffect(() => {
    if (open && geo.status === "idle") {
      void locate();
    }
    if (!open) {
      setGeo({ status: "idle" });
      setAgentOpen(false);
    }
  }, [open, geo.status, locate]);

  const ranked =
    geo.status === "located" ? rankEmergencyFacilities(facilities, geo.lat, geo.lon, 3) : [];

  const primary = ranked[0];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="ambulance-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <motion.div
          key="ambulance-card"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className={`relative w-full overflow-hidden rounded-t-3xl border border-border-default bg-surface-base shadow-2xl sm:rounded-3xl ${
            agentOpen ? "max-w-lg" : "max-w-md"
          }`}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border-default bg-surface-raised text-text-muted transition-colors hover:text-text-primary"
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-3 border-b border-border-default bg-danger-500/10 px-6 py-5 pr-14">
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-500/15 text-danger-400"
            >
              <Siren size={20} />
            </motion.div>
            <div>
              <p className="text-eyebrow text-danger-400">Emergency response</p>
              <h2 className="text-h3 text-text-primary">
                {agentOpen ? "Hospital dispatch agent" : "Maarg emergency assist"}
              </h2>
            </div>
          </div>

          <div className="max-h-[85vh] overflow-y-auto px-6 py-5">
            {agentOpen && geo.status === "located" ? (
              <EmergencyDispatchPanel
                cityLabel={geo.city ?? "this area"}
                lat={geo.lat}
                lon={geo.lon}
                facilities={ranked}
                onDone={() => setAgentOpen(false)}
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-default bg-surface-raised/50 p-4">
                  <div className="flex items-center gap-2">
                    {geo.status === "locating" && (
                      <Loader2 size={15} className="animate-spin text-trust-400" />
                    )}
                    {geo.status === "located" && <Crosshair size={15} className="text-success-500" />}
                    {geo.status === "error" && <AlertTriangle size={15} className="text-warn-400" />}
                    {geo.status === "idle" && <MapPin size={15} className="text-text-muted" />}
                    <span className="text-small font-medium text-text-primary">
                      {geo.status === "locating" && "Detecting your location…"}
                      {geo.status === "located" && `Located: ${geo.city ?? "position acquired"}`}
                      {geo.status === "error" && "Location unavailable"}
                      {geo.status === "idle" && "Location"}
                    </span>
                  </div>
                  {geo.status === "located" && (
                    <p className="mt-1.5 font-mono text-mono-data text-text-muted">
                      {geo.lat.toFixed(5)}, {geo.lon.toFixed(5)}
                    </p>
                  )}
                  {geo.status === "error" && (
                    <>
                      <p className="mt-1 text-small text-text-secondary">{geo.message}</p>
                      <button
                        type="button"
                        onClick={() => void locate()}
                        className="mt-2 text-small text-trust-200 hover:underline"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>

                {primary && !agentOpen && (
                  <div className="space-y-3 rounded-2xl border border-border-default bg-surface-raised/50 p-4">
                    <p className="text-eyebrow text-text-muted">Routing priority (nearest with emergency cover)</p>
                    <ol className="list-decimal space-y-2 pl-4 text-sm text-text-primary">
                      {ranked.map((f) => (
                        <li key={f.facility_id}>
                          <span className="font-medium">{f.facility_name}</span>{" "}
                          <span className="text-text-muted">— {formatDistanceKm(f.distanceKm)}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="text-xs text-text-muted">
                      The agent builds a clear verbal request to the hospital to send an ambulance to your coordinates,
                      with Hindi assist if needed. You place the call on this device.
                    </p>
                  </div>
                )}

                {!primary && geo.status === "located" && facilities.length === 0 && (
                  <div className="rounded-2xl border border-border-subtle bg-surface-raised/40 p-4 text-small text-text-muted">
                    Run a search or open the map with facilities in view, then return here. Until then, use{" "}
                    <a href="tel:112" className="text-danger-400">
                      112
                    </a>
                    .
                  </div>
                )}

                {geo.status === "located" && facilities.length > 0 && ranked.length === 0 && (
                  <p className="text-small text-text-secondary">
                    Could not rank facilities. Call <a href="tel:112">112</a>.
                  </p>
                )}

                <div className="flex items-center gap-3 rounded-xl border border-danger-500/20 bg-danger-500/10 px-4 py-3">
                  <Siren size={14} className="shrink-0 text-danger-400" />
                  <p className="text-small text-text-secondary">
                    Life-threatening emergency: call{" "}
                    <a href="tel:112" className="font-bold text-danger-400">
                      112
                    </a>{" "}
                    (National Emergency). Maarg does not replace public EMS.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {primary && geo.status === "located" ? (
                    <motion.button
                      type="button"
                      onClick={() => setAgentOpen(true)}
                      whileTap={{ scale: 0.98 }}
                      className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-danger-500 px-5 py-4 text-white shadow-lg transition-all hover:bg-danger-500/90"
                    >
                      <Siren size={18} />
                      <span className="text-left font-semibold">
                        Open dispatch agent — call hospital with briefing
                      </span>
                    </motion.button>
                  ) : null}
                  <a
                    href="tel:112"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger-500/30 bg-danger-500/10 px-5 py-3 text-danger-400 transition-colors hover:bg-danger-500/15"
                  >
                    <Phone size={15} fill="currentColor" />
                    Call 112
                  </a>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function SOSButton() {
  const setOpen = useUIStore((s) => s.setAmbulanceModalOpen);
  return (
    <motion.button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Request emergency ambulance"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-danger-500 text-white shadow-xl"
    >
      {[1, 1.4, 1.8].map((s, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute inset-0 rounded-full bg-danger-500"
          animate={{ scale: s + 0.5, opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
        />
      ))}
      <Siren size={22} aria-hidden />
    </motion.button>
  );
}
