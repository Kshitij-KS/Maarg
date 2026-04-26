"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  Phone,
  Siren,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { haversineKm } from "@/lib/geo";
import { formatDistanceKm } from "@/lib/format";
import { getContact } from "@/lib/facility-contacts";
import { useFiltersStore } from "@/lib/stores/use-filters-store";
import { useUIStore } from "@/lib/stores/use-ui-store";
import type { FacilityTrustRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "located"; lat: number; lon: number; city?: string }
  | { status: "error"; message: string };

type DialState = "idle" | "dialing" | "connected" | "ended";

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } },
    );
    const data = (await res.json()) as {
      address?: { city?: string; town?: string; village?: string; state?: string };
    };
    const a = data.address ?? {};
    return a.city ?? a.town ?? a.village ?? a.state ?? "your location";
  } catch {
    return "your location";
  }
}

function findNearestEmergency(
  facilities: FacilityTrustRecord[],
  lat: number,
  lon: number,
): (FacilityTrustRecord & { distanceKm: number }) | null {
  const emergency = facilities.filter((f) =>
    f.capabilities.some(
      (c) =>
        (c.capability === "emergency_obstetric_care" || c.capability === "icu") &&
        c.claim_present,
    ),
  );
  const pool = emergency.length > 0 ? emergency : facilities;
  if (pool.length === 0) return null;

  return pool
    .map((f) => ({ ...f, distanceKm: haversineKm(lat, lon, f.lat, f.lon) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0]!;
}

function DialScreen({
  facility,
  onEnd,
}: {
  facility: FacilityTrustRecord & { distanceKm: number };
  onEnd: () => void;
}) {
  const [dialState, setDialState] = useState<DialState>("dialing");
  const contact = getContact(facility.facility_id);
  const phone = contact?.ambulance ?? contact?.emergency ?? "112";

  useEffect(() => {
    const t1 = setTimeout(() => setDialState("connected"), 3000);
    const t2 = setTimeout(() => setDialState("ended"), 8000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-6 py-4"
    >
      {/* Animated phone ring */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        {dialState === "dialing" && (
          <>
            {[1, 1.4, 1.8].map((s, i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border-2 border-danger-400"
                animate={{ scale: [s, s + 0.6], opacity: [0.6, 0] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
        {dialState === "connected" && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-success-500"
            animate={{ scale: [1, 1.1, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <motion.div
          animate={
            dialState === "dialing"
              ? { rotate: [0, -10, 10, -8, 8, 0], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.8 } }
              : {}
          }
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full",
            dialState === "connected" ? "bg-success-500/20" : "bg-danger-500/20",
          )}
        >
          <Phone
            size={32}
            className={dialState === "connected" ? "text-success-500" : "text-danger-400"}
            fill="currentColor"
          />
        </motion.div>
      </div>

      <div className="text-center">
        <p className="font-mono text-mono-data text-text-muted">
          {dialState === "dialing" ? "Connecting to" : dialState === "connected" ? "Connected —" : "Call ended"}
        </p>
        <p className="mt-1 text-h3 text-text-primary">
          {dialState === "dialing" || dialState === "connected"
            ? `${facility.facility_name}`
            : "Ambulance dispatched"}
        </p>
        <p className="mt-1 font-mono text-mono-data text-text-muted">{phone}</p>
        {dialState === "connected" && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-small text-success-500"
          >
            ETA {Math.ceil(facility.distanceKm / 40)} min · {formatDistanceKm(facility.distanceKm)} away
          </motion.p>
        )}
        {dialState === "ended" && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-small text-text-secondary"
          >
            Help is on the way. Stay at your location.
          </motion.p>
        )}
      </div>

      {(dialState === "dialing" || dialState === "connected") && (
        <button
          type="button"
          onClick={onEnd}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-500 text-white shadow-lg transition-transform hover:scale-105"
        >
          <Phone size={22} className="rotate-[135deg]" fill="white" />
        </button>
      )}
      {dialState === "ended" && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <CheckCircle2 size={40} className="text-success-500" />
        </motion.div>
      )}
    </motion.div>
  );
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
  const [dialing, setDialing] = useState(false);
  const geocodeRef = useRef(false);

  const locate = useCallback(async () => {
    setGeo({ status: "locating" });
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        }),
      );
      const { latitude: lat, longitude: lon } = pos.coords;
      if (!geocodeRef.current) {
        geocodeRef.current = true;
        const city = await reverseGeocode(lat, lon);
        setGeo({ status: "located", lat, lon, city });
        setUserLocation({ lat, lon, city });
        setUserCoords(lat, lon);
      }
    } catch (err) {
      const msg =
        err instanceof GeolocationPositionError && err.code === 1
          ? "Location permission denied. Please allow location access in your browser."
          : "Could not determine your location. Try again.";
      setGeo({ status: "error", message: msg });
    }
  }, [setUserLocation, setUserCoords]);

  useEffect(() => {
    if (open && geo.status === "idle") {
      void locate();
    }
    if (!open) {
      setGeo({ status: "idle" });
      setDialing(false);
      geocodeRef.current = false;
    }
  }, [open, geo.status, locate]);

  const nearest =
    geo.status === "located"
      ? findNearestEmergency(facilities, geo.lat, geo.lon)
      : null;

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
          className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-border-default bg-surface-base shadow-2xl sm:rounded-3xl"
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-border-default bg-surface-raised text-text-muted transition-colors hover:text-text-primary"
          >
            <X size={15} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border-default bg-danger-500/10 px-6 py-5">
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-500/15 text-danger-400"
            >
              <Siren size={20} />
            </motion.div>
            <div>
              <p className="text-eyebrow text-danger-400">Emergency response</p>
              <h2 className="text-h3 text-text-primary">Maarg Emergency Response</h2>
            </div>
          </div>

          <div className="px-6 py-5">
            {/* Dialing screen */}
            {dialing && nearest ? (
              <DialScreen facility={nearest} onEnd={() => setDialing(false)} />
            ) : (
              <div className="space-y-4">
                {/* Location status */}
                <div className="rounded-2xl border border-border-default bg-surface-raised/50 p-4">
                  <div className="flex items-center gap-2">
                    {geo.status === "locating" && (
                      <Loader2 size={15} className="animate-spin text-trust-400" />
                    )}
                    {geo.status === "located" && (
                      <Crosshair size={15} className="text-success-500" />
                    )}
                    {geo.status === "error" && (
                      <AlertTriangle size={15} className="text-warn-400" />
                    )}
                    {geo.status === "idle" && (
                      <MapPin size={15} className="text-text-muted" />
                    )}
                    <span className="text-small font-medium text-text-primary">
                      {geo.status === "locating" && "Detecting your location…"}
                      {geo.status === "located" && `Located: ${geo.city ?? "detected"}`}
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
                        onClick={() => {
                          geocodeRef.current = false;
                          void locate();
                        }}
                        className="mt-2 text-small text-trust-200 hover:underline"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>

                {/* Nearest facility */}
                {nearest && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-border-default bg-surface-raised/50 p-4"
                  >
                    <p className="text-eyebrow text-text-muted">Nearest emergency facility</p>
                    <p className="mt-1 text-small font-medium text-text-primary">
                      {nearest.facility_name}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="font-mono text-mono-data text-trust-200">
                        {formatDistanceKm(nearest.distanceKm)}
                      </span>
                      <span className="text-eyebrow text-text-muted">·</span>
                      <span className="font-mono text-mono-data text-text-muted">
                        ~{Math.ceil(nearest.distanceKm / 40)} min ETA
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-default">
                      <motion.div
                        className="h-full rounded-full bg-success-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (1 - nearest.distanceKm / 200) * 100)}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </motion.div>
                )}

                {!nearest && geo.status === "located" && facilities.length === 0 && (
                  <div className="rounded-2xl border border-border-subtle bg-surface-raised/40 p-4 text-small text-text-muted">
                    Search for facilities first, then use this to find the nearest emergency unit.
                  </div>
                )}

                {/* Emergency number notice */}
                <div className="flex items-center gap-3 rounded-xl border border-danger-500/20 bg-danger-500/10 px-4 py-3">
                  <Siren size={14} className="shrink-0 text-danger-400" />
                  <p className="text-small text-text-secondary">
                    For life-threatening emergencies, call{" "}
                    <a href="tel:112" className="font-bold text-danger-400">
                      112
                    </a>{" "}
                    (National Emergency).
                  </p>
                </div>

                {/* CTA buttons */}
                <div className="flex flex-col gap-2">
                  {nearest && (
                    <motion.button
                      type="button"
                      onClick={() => setDialing(true)}
                      whileTap={{ scale: 0.97 }}
                      className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-danger-500 px-5 py-4 text-white shadow-lg transition-all hover:bg-danger-500/90 hover:shadow-xl"
                    >
                      <Siren size={18} />
                      <span className="font-semibold">
                        Dispatch ambulance via Maarg
                      </span>
                    </motion.button>
                  )}
                  <a
                    href="tel:112"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger-500/30 bg-danger-500/10 px-5 py-3 text-danger-400 transition-colors hover:bg-danger-500/15"
                  >
                    <Phone size={15} fill="currentColor" />
                    Call 112 directly
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

/** Persistent floating SOS button */
export function SOSButton() {
  const setOpen = useUIStore((s) => s.setAmbulanceModalOpen);
  return (
    <motion.button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Request emergency ambulance"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.93 }}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-danger-500 text-white shadow-xl"
    >
      {/* Pulse rings */}
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
