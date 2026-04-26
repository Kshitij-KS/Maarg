"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock, MapPin, Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { calculateEtaMinutes } from "@/lib/emergency-dispatch-agent";
import { getContact } from "@/lib/facility-contacts";
import type { RankedEmergencyFacility } from "@/lib/emergency-dispatch-agent";

type CallPhase = "dialing" | "connecting" | "connected" | "confirmed";

type Message = {
  id: number;
  from: "agent" | "hospital";
  text: string;
};

type Props = {
  facility: RankedEmergencyFacility;
  lat: number;
  lon: number;
  cityLabel: string;
  onEnd: () => void;
};

export function MockCallAgent({ facility, lat, lon, cityLabel, onEnd }: Props) {
  const [phase, setPhase] = useState<CallPhase>("dialing");
  const [messages, setMessages] = useState<Message[]>([]);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const msgIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contact = getContact(facility.facility_id);
  const phoneDisplay = contact?.ambulance ?? contact?.phone ?? "112";

  // Snapshot mount-time props — the call sequence fires once and should not re-run
  const snapshot = useRef({ facility, lat, lon, cityLabel, contact });

  function addMsg(from: Message["from"], text: string) {
    msgIdRef.current += 1;
    const id = msgIdRef.current;
    setMessages((prev) => [...prev, { id, from, text }]);
  }

  useEffect(() => {
    const { facility, lat, lon, cityLabel, contact } = snapshot.current;
    const eta = calculateEtaMinutes(facility.distanceKm);
    const addr = contact?.address ?? `Near ${cityLabel}`;
    const t: ReturnType<typeof setTimeout>[] = [];

    t.push(setTimeout(() => setPhase("connecting"), 2200));
    t.push(setTimeout(() => setPhase("connected"), 3600));

    const base = 4000;
    const gap = 1900;

    t.push(setTimeout(() => addMsg("agent", "🚨 EMERGENCY SOS — This is Maarg Emergency Dispatch System. Automated emergency call."), base));
    t.push(setTimeout(() => addMsg("agent", `Patient location acquired. City: ${cityLabel}. GPS coordinates: ${lat.toFixed(5)}°N, ${lon.toFixed(5)}°E (WGS-84).`), base + gap));
    t.push(setTimeout(() => addMsg("agent", `Address reference: ${addr}`), base + gap * 2));
    t.push(setTimeout(() => addMsg("agent", "Requesting immediate ambulance dispatch to the above coordinates. Patient requires urgent emergency medical assistance."), base + gap * 3));
    t.push(setTimeout(() => addMsg("hospital", "Request received. Confirming location. Dispatching nearest available unit."), base + gap * 4));
    t.push(setTimeout(() => addMsg("agent", "Please keep an ambulance unit on standby at the receiving bay. Patient status update will follow."), base + gap * 5));
    t.push(setTimeout(() => {
      setEtaMinutes(eta);
      addMsg("agent", `Estimated ambulance travel time: ${eta} minutes based on ${facility.distanceKm.toFixed(1)} km distance at current road conditions.`);
    }, base + gap * 6));
    t.push(setTimeout(() => addMsg("hospital", `Confirmed. Ambulance unit dispatched. Estimated arrival to patient: ${eta} minutes. Please keep line open.`), base + gap * 7));
    t.push(setTimeout(() => addMsg("agent", "Acknowledged. Patient has been notified. Standby at receiving bay requested. Thank you."), base + gap * 8));
    t.push(setTimeout(() => addMsg("hospital", "Standby confirmed. 🟢 Help is on the way. Do not move the patient if possible."), base + gap * 9));
    t.push(setTimeout(() => setPhase("confirmed"), base + gap * 10));

    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="space-y-4">
      <CallStatusBar phase={phase} facilityName={facility.facility_name} phone={phoneDisplay} />

      {(phase === "connected" || phase === "confirmed") && (
        <div
          ref={scrollRef}
          aria-live="polite"
          aria-label="Emergency call transcript"
          className="max-h-64 overflow-y-auto rounded-xl border border-border-subtle bg-surface-elevated/30 p-3 space-y-2.5"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.from === "agent" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                    msg.from === "agent"
                      ? "bg-trust-500/15 text-trust-600 dark:text-trust-200"
                      : "border border-border-default bg-surface-raised text-text-primary"
                  }`}
                >
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide opacity-50">
                    {msg.from === "agent" ? "Maarg Agent" : facility.facility_name}
                  </p>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {phase === "connected" && messages.length < 10 && (
            <div className="flex justify-center py-1" aria-hidden>
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <span className="inline-flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-text-muted"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
                </span>
                {/* Show which side is next based on message count */}
                {messages.length === 4 || messages.length === 7 || messages.length === 9
                  ? "Hospital responding…"
                  : "Agent sending…"}
              </span>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {phase === "confirmed" && etaMinutes !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-success-500/30 bg-success-500/10 p-4 text-center"
          >
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success-500" />
            <p className="text-lg font-bold text-text-primary">Ambulance Dispatched</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-text-secondary">
              <Clock className="h-4 w-4" />
              Estimated arrival:{" "}
              <span className="font-bold text-success-500">{etaMinutes} minutes</span>
            </p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-text-muted">
              <MapPin className="h-3 w-3" />
              {facility.facility_name} · {facility.distanceKm.toFixed(1)} km away
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onEnd}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border-default bg-surface-raised/50 px-5 py-3 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <PhoneOff className="h-4 w-4" />
        {phase === "confirmed" ? "Close call summary" : "End mock call"}
      </button>
    </div>
  );
}

function CallStatusBar({
  phase,
  facilityName,
  phone,
}: {
  phase: CallPhase;
  facilityName: string;
  phone: string;
}) {
  const isActive = phase === "dialing" || phase === "connecting";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border-default bg-surface-raised/50 p-4">
      <motion.div
        animate={isActive ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 1.2, repeat: Infinity }}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          phase === "confirmed"
            ? "bg-success-500/15 text-success-500"
            : "bg-danger-500/15 text-danger-400"
        }`}
      >
        <Phone
          className="h-5 w-5"
          fill={phase === "confirmed" ? "currentColor" : "none"}
        />
      </motion.div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text-primary">{facilityName}</p>
        <p className="font-mono text-xs text-text-muted">{phone}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
          phase === "dialing"
            ? "bg-warn-400/15 text-warn-600 dark:text-warn-400"
            : phase === "connecting"
            ? "bg-trust-500/15 text-trust-200"
            : phase === "connected"
            ? "animate-pulse bg-danger-500/20 text-danger-400"
            : "bg-success-500/15 text-success-500"
        }`}
      >
        {phase === "dialing" && "Dialing…"}
        {phase === "connecting" && "Connecting…"}
        {phase === "connected" && "● Live"}
        {phase === "confirmed" && "✓ Dispatched"}
      </span>
    </div>
  );
}
