"use client";

import { CheckCircle2, Copy, Headphones, Loader2, Phone, Radio } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  buildDispatchBriefing,
  buildHindiAssistLine,
  canSpeakInBrowser,
  type RankedEmergencyFacility,
} from "@/lib/emergency-dispatch-agent";
import { getContact } from "@/lib/facility-contacts";
import { formatDistanceKm } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Phase = "handshake" | "ready";

function speakText(text: string, lang: string) {
  if (!canSpeakInBrowser()) {
    toast.error("This browser does not support read-aloud.");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.92;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

type Props = {
  cityLabel: string;
  lat: number;
  lon: number;
  facilities: RankedEmergencyFacility[];
  onDone: () => void;
};

/**
 * "AI agent" hand-off: structured briefing, voice, tel links to hospital desks, fallbacks.
 */
export function EmergencyDispatchPanel({ cityLabel, lat, lon, facilities, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>("handshake");
  const primary = facilities[0];
  const alternates = facilities.slice(1);
  const contact = primary ? getContact(primary.facility_id) : null;
  const mapsUrl = contact?.directions_url;

  const briefing = primary
    ? buildDispatchBriefing({
        facilityName: primary.facility_name,
        cityLabel,
        lat,
        lon,
        addressHint: contact?.address,
        googleMapsUrl: mapsUrl,
        hospitalPhoneDisplay: contact?.ambulance ?? contact?.phone ?? "112",
      })
    : null;

  const hindiLine = primary ? buildHindiAssistLine(primary.facility_name) : "";

  const handshakeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    handshakeRef.current = setTimeout(() => setPhase("ready"), 1200);
    return () => {
      if (handshakeRef.current) clearTimeout(handshakeRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (canSpeakInBrowser()) window.speechSynthesis.cancel();
    };
  }, []);

  const copyScript = useCallback(() => {
    if (!briefing) return;
    void navigator.clipboard.writeText(briefing.fullScript);
    toast.success("Dispatch briefing copied — paste in chat or read to control room.");
  }, [briefing]);

  if (!primary || !briefing) {
    return (
      <p className="text-center text-sm text-text-secondary">
        No facilities available to route. Call{" "}
        <a href="tel:112" className="font-semibold text-danger-400">
          112
        </a>{" "}
        immediately.
      </p>
    );
  }

  const telPrimary = `tel:${primary.dispatchPhone}`;

  if (phase === "handshake") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <Loader2 className="h-10 w-10 animate-spin text-trust-400" aria-hidden />
        <p className="text-center text-sm font-medium text-text-primary">Maarg dispatch agent is preparing your briefing…</p>
        <p className="text-center text-xs text-text-muted">
          You will get a read-aloud script, then call the hospital ambulance desk on your phone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-trust-500/25 bg-trust-500/5 p-4">
        <div className="flex items-center gap-2 text-trust-200">
          <Radio className="h-4 w-4" aria-hidden />
          <span className="text-eyebrow">Dispatch agent</span>
        </div>
        <p className="mt-1 text-h3 text-text-primary">{briefing.headline}</p>
        <p className="mt-1 font-mono text-mono-data text-text-muted">
          {formatDistanceKm(primary.distanceKm)} · desk {primary.dispatchPhoneLabel}
        </p>
      </div>

      <div className="max-h-48 overflow-y-auto rounded-xl border border-border-subtle bg-surface-elevated/30 p-3 text-sm leading-relaxed text-text-secondary">
        {briefing.lines.map((line, i) => (
          <p key={i} className="mb-2 last:mb-0">
            {line}
          </p>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-center gap-2"
          onClick={() => speakText(briefing.fullScript, "en-IN")}
        >
          <Headphones className="h-4 w-4" />
          Read briefing (English)
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-center gap-2"
          onClick={() => speakText(hindiLine, "hi-IN")}
        >
          <Headphones className="h-4 w-4" />
          Assist line (Hindi)
        </Button>
        <Button type="button" variant="secondary" className="h-10 w-full justify-center gap-2 sm:col-span-2" onClick={copyScript}>
          <Copy className="h-4 w-4" />
          Copy full text
        </Button>
      </div>

      <a
        href={telPrimary}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl bg-danger-500 px-4 py-4 text-base font-semibold text-white shadow-lg",
          "transition-transform hover:scale-[1.01] active:scale-[0.99]",
        )}
      >
        <Phone className="h-5 w-5" fill="currentColor" />
        Call {primary.facility_name} — ambulance desk
      </a>

      {alternates.length > 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-raised/40 p-3">
          <p className="text-eyebrow text-text-muted">If busy — next nearest</p>
          <ul className="mt-2 space-y-2">
            {alternates.map((f) => (
              <li key={f.facility_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0 font-medium text-text-primary">{f.facility_name}</span>
                <a
                  href={`tel:${f.dispatchPhone}`}
                  className="shrink-0 rounded-full border border-trust-400/30 px-3 py-1 font-mono text-mono-data text-trust-200"
                >
                  Call
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-center text-xs text-text-muted">
        Maarg does not place the call for you. This briefing helps you ask the hospital clearly for an ambulance at your
        coordinates. For danger to life, also call 112.
      </p>

      <button
        type="button"
        onClick={onDone}
        className="flex w-full items-center justify-center gap-2 text-sm text-text-secondary hover:text-text-primary"
      >
        <CheckCircle2 className="h-4 w-4" />
        Close summary
      </button>
    </div>
  );
}
