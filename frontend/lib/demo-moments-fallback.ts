import type { DemoMoment, DemoMomentsResponse } from "./types";

/**
 * Used when /api/demo-moments is unreachable so the landing-page
 * "Run the pitch" cockpit still works against canonical fixtures.
 * Mirrors backend/app/shared/demo_contract.py — keep IDs in sync.
 */
const FALLBACK_MOMENTS: DemoMoment[] = [
  {
    id: "live-catch",
    title: "Catch the lie, live",
    endpoint: "/api/query",
    request: {
      text: "Emergency C-section near Madhepura within 50 km",
      user_lat: 25.92,
      user_lon: 86.79,
      max_distance_km: 50,
      min_trust_score: 0.4,
      capabilities_filter: ["c_section", "emergency_obstetric_care"],
      top_k: 10,
    },
    target_facility_id: "F00002",
    target_pin_code: null,
    expected_flag: "MISSING_ANESTHESIOLOGIST",
    success_criteria: [
      "Surface F00002 with a MISSING_ANESTHESIOLOGIST flag visible in seconds.",
    ],
    design_notes: ["Headline the flag chip — this is the money shot."],
  },
  {
    id: "confidence-interval",
    title: "Calibrated confidence",
    endpoint: "/api/facility/F00042/evidence",
    request: null,
    target_facility_id: "F00042",
    target_pin_code: null,
    expected_flag: null,
    success_criteria: [
      "Show dialysis trust 0.78 with CI [0.66, 0.86] as a visible range.",
    ],
    design_notes: ["Render the CI as a band, not a single number."],
  },
  {
    id: "desert-map",
    title: "Maternity desert in Bihar",
    endpoint: "/api/desert/summary",
    request: null,
    target_facility_id: null,
    target_pin_code: "855107",
    expected_flag: null,
    success_criteria: [
      "PIN 855107 leads the critical-desert list with population at risk ≥ 128k.",
    ],
    design_notes: ["Center the map on Bihar; pulse the top desert PIN."],
  },
];

export const FALLBACK_DEMO_MOMENTS: DemoMomentsResponse = {
  moments: FALLBACK_MOMENTS,
};
