import { describe, expect, it } from "vitest";

import { normalizeForTel, rankEmergencyFacilities } from "@/lib/emergency-dispatch-agent";
import type { CapabilityClaim, FacilityTrustRecord } from "@/lib/types";

function cap(name: string, present: boolean): CapabilityClaim {
  return {
    capability: name,
    claim_present: present,
    self_consistency_score: 0.9,
    coherence_score: 0.9,
    peer_anomaly_score: 0.5,
    inference_score: 0.5,
    trust_score: 0.9,
    confidence_interval_low: 0.8,
    confidence_interval_high: 0.95,
    citations: [],
    inference_detail: {
      inferred_present: present,
      inference_confidence: 0.5,
      supporting_equipment: [],
      contradictions: [],
      inference_flags: [],
    },
    flags: [],
  };
}

const base: Omit<FacilityTrustRecord, "facility_id" | "lat" | "lon" | "capabilities" | "facility_name"> = {
  pin_code: "000000",
  state: "X",
  district: "X",
  facility_type: "Hospital",
  normalization_version: "v1",
  overall_trust_score: 0.8,
  extraction_run_ids: [],
  last_updated: "2026-01-01T00:00:00Z",
};

describe("normalizeForTel", () => {
  it("leaves 112 as-is", () => {
    expect(normalizeForTel("112")).toBe("112");
  });

  it("strips non-digits for local numbers", () => {
    expect(normalizeForTel("6476-222-108")).toBe("6476222108");
  });

  it("preserves international + prefix from digits", () => {
    expect(normalizeForTel("+91-6476-222-108")).toBe("+916476222108");
  });

  it("uses 112 for empty or whitespace", () => {
    expect(normalizeForTel("")).toBe("112");
    expect(normalizeForTel("   ")).toBe("112");
  });
});

describe("rankEmergencyFacilities", () => {
  it("ranks by distance; nearest is first (real contact IDs for dispatch numbers)", () => {
    const userLat = 25.921;
    const userLon = 86.792;
    const a: FacilityTrustRecord = {
      ...base,
      facility_id: "F00001",
      facility_name: "Near A",
      lat: 25.921,
      lon: 86.792,
      capabilities: [cap("icu", true)],
    };
    const b: FacilityTrustRecord = {
      ...base,
      facility_id: "F00002",
      facility_name: "Far B",
      lat: 25.0,
      lon: 86.0,
      capabilities: [cap("emergency_care", true)],
    };
    const ranked = rankEmergencyFacilities([b, a], userLat, userLon, 3);
    expect(ranked.map((f) => f.facility_id)).toEqual(["F00001", "F00002"]);
    expect(ranked[0]!.dispatchPhone).toMatch(/^\d|\+/);
  });

  it("returns [] when no facilities", () => {
    expect(rankEmergencyFacilities([], 0, 0, 3)).toEqual([]);
  });
});
