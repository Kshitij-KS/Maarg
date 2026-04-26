import { haversineKm } from "@/lib/geo";
import { getContact } from "@/lib/facility-contacts";
import type { FacilityTrustRecord } from "@/lib/types";

const EMERGENCY_CAPABILITIES: ReadonlySet<string> = new Set([
  "emergency_obstetric_care",
  "emergency_trauma",
  "emergency_care",
  "icu",
  "neonatal_icu",
]);

/**
 * True if the facility plausibly offers emergency or critical intake relevant to ambulance routing.
 */
export function hasEmergencyCapability(f: FacilityTrustRecord): boolean {
  return f.capabilities.some(
    (c) => c.claim_present && EMERGENCY_CAPABILITIES.has(c.capability),
  );
}

export type RankedEmergencyFacility = FacilityTrustRecord & {
  distanceKm: number;
  dispatchPhone: string;
  dispatchPhoneLabel: "ambulance" | "hospital" | "national";
};

/**
 * Best-effort phone for ambulance dispatch: ambulance desk → main hospital → 112.
 */
export function getDispatchNumber(facilityId: string): {
  e164: string;
  display: string;
  label: RankedEmergencyFacility["dispatchPhoneLabel"];
} {
  const c = getContact(facilityId);
  if (c?.ambulance) {
    return { e164: normalizeForTel(c.ambulance), display: c.ambulance, label: "ambulance" };
  }
  if (c?.phone) {
    return { e164: normalizeForTel(c.phone), display: c.phone, label: "hospital" };
  }
  return { e164: "112", display: "112", label: "national" };
}

/** Strip to digits and leading + for tel: / SIP-friendly strings. */
export function normalizeForTel(raw: string): string {
  const t = raw.trim();
  if (t === "112") return "112";
  const hasPlus = t.startsWith("+");
  const digits = t.replace(/\D/g, "");
  if (digits.length === 0) return "112";
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Sort facilities by distance; prefer those with verifiable emergency capabilities, else fall back to full pool.
 */
export function rankEmergencyFacilities(
  facilities: FacilityTrustRecord[],
  lat: number,
  lon: number,
  max = 3,
): RankedEmergencyFacility[] {
  const emergency = facilities.filter(hasEmergencyCapability);
  const pool = emergency.length > 0 ? emergency : facilities;
  if (pool.length === 0) return [];

  const withDist = pool.map((f) => {
    const dist = haversineKm(lat, lon, f.lat, f.lon);
    const { e164, label } = getDispatchNumber(f.facility_id);
    return {
      ...f,
      distanceKm: dist,
      dispatchPhone: e164,
      dispatchPhoneLabel: label,
    };
  });

  withDist.sort((a, b) => a.distanceKm - b.distanceKm);
  return withDist.slice(0, max);
}

export type DispatchBriefing = {
  /** Full text for TTS and clipboard */
  fullScript: string;
  /** Short headline for UI */
  headline: string;
  /** Lines to show in UI (shorter segments) */
  lines: string[];
};

export type BuildBriefingInput = {
  facilityName: string;
  cityLabel: string;
  lat: number;
  lon: number;
  addressHint?: string;
  googleMapsUrl?: string;
  hospitalPhoneDisplay: string;
};

/**
 * Standard control-room script the "agent" reads — caller still dials; this is the verbal request.
 */
export function buildDispatchBriefing(input: BuildBriefingInput): DispatchBriefing {
  const { facilityName, cityLabel, lat, lon, addressHint, googleMapsUrl, hospitalPhoneDisplay } = input;
  const coords = `${lat.toFixed(5)} North, ${lon.toFixed(5)} East (WGS-84).`;
  const place = addressHint ? `${addressHint}. ` : `Near ${cityLabel}. `;

  const lines = [
    "Maarg emergency dispatch. Automated briefing for your control room — please confirm receipt.",
    `We need an ambulance sent to a caller’s live GPS position.`,
    `Caller location: ${place}Coordinates: ${coords}`,
    `Requested receiving hospital: ${facilityName}. Please dispatch your nearest available ambulance to this point.`,
  ];
  if (googleMapsUrl) {
    lines.push(`Maps link: ${googleMapsUrl}`);
  }
  lines.push(
    `If you cannot service this case, state that clearly so we can cascade to the next facility.`,
    `For life-threatening events the public line remains one-one-two. Hospital desk on file: ${hospitalPhoneDisplay}.`,
  );

  const fullScript = lines.join("\n\n");
  return {
    fullScript,
    headline: `Ambulance request → ${facilityName}`,
    lines,
  };
}

/**
 * Shorter "Hinglish" closing line for mixed control rooms (optional second utterance).
 */
export function buildHindiAssistLine(facilityName: string): string {
  return `${facilityName} — कृपया मरीज़ के लोकेशन पर एंबुलेंस भेजें। धन्यवाद।`;
}

export function canSpeakInBrowser(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
