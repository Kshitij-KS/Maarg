import type { components } from "./types.generated";

export type Citation = components["schemas"]["Citation"];
export type InferenceResult = components["schemas"]["InferenceResult"];
export type CapabilityClaim = components["schemas"]["CapabilityClaim"];
export type FacilityTrustRecord = components["schemas"]["FacilityTrustRecord"];
export type PinCodeDesert = components["schemas"]["PinCodeDesert"];
export type QueryRequest = components["schemas"]["QueryRequest"];
export type QueryResponse = components["schemas"]["QueryResponse"];
export type TraceResponse = components["schemas"]["TraceResponse"];
export type DemoScenariosResponse = components["schemas"]["DemoScenariosResponse"];

export type EvidenceSnippet = {
  facility_id: string;
  capability: string;
  source_field: string;
  sentence: string;
  char_start: number;
  char_end: number;
  flags: string[];
};

export type SignalBreakdown = {
  capability: string;
  claim_present: boolean;
  self_consistency_score: number;
  coherence_score: number;
  peer_anomaly_score: number;
  inference_score: number;
  trust_score: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  confidence_interval_width: number;
  inference_contradictions?: string[];
  flags: string[];
  citation_count: number;
};

export type FacilityEvidenceResponse = {
  facility_id: string;
  facility_name: string;
  pin_code: string;
  state: string;
  district: string;
  facility_type: string;
  overall_trust_score: number;
  has_flags: boolean;
  flags: string[];
  flag_summary?: string | null;
  signals: SignalBreakdown[];
  evidence: EvidenceSnippet[];
  audit_summary: string;
};

export type DesertPinSummary = {
  pin_code: string;
  state: string;
  district: string;
  capability: string;
  population?: number | null;
  desert_score: number;
  nearest_verified_facility_id?: string | null;
  distance_km?: number | null;
};

export type DesertGroupSummary = {
  key: string;
  row_count: number;
  critical_pin_count: number;
  population_at_risk: number;
  average_desert_score: number;
};

export type DesertSummary = {
  capability?: string | null;
  state?: string | null;
  total_rows: number;
  critical_pin_count: number;
  population_at_risk: number;
  average_desert_score: number;
  top_deserts: DesertPinSummary[];
  by_state: DesertGroupSummary[];
  by_capability: DesertGroupSummary[];
};

export type DemoMoment = {
  id: string;
  title: string;
  endpoint: string;
  request?: QueryRequest | null;
  target_facility_id?: string | null;
  target_pin_code?: string | null;
  expected_flag?: string | null;
  success_criteria: string[];
  design_notes: string[];
};

export type DemoMomentsResponse = {
  moments: DemoMoment[];
};

export type TraceTimelineNode = {
  id: string;
  agent: string;
  label: string;
  status: "supported" | "partial" | "unsupported" | "complete" | "unknown";
  latency_ms?: number | null;
  token_count?: number | null;
  summary: string;
  detail?: string | null;
  attributes: Record<string, string | number | boolean | null>;
};

export type TraceTimelineResponse = {
  trace_id: string;
  found: boolean;
  nodes: TraceTimelineNode[];
};

/**
 * Canonical capability vocabulary surfaced in the demo. Sourced from
 * backend/fixtures/mock_gold_facility_trust.json so filter chips, map layers and
 * QueryRequest payloads stay in sync without a runtime fetch.
 */
export const CAPABILITIES = [
  "emergency_obstetric_care",
  "emergency_trauma",
  "advanced_surgery",
  "c_section",
  "anesthesiologist_coverage",
  "dialysis",
  "icu",
  "neonatal_icu",
  "nicu",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  emergency_obstetric_care: "Emergency OB Care",
  emergency_trauma: "Emergency Trauma",
  advanced_surgery: "Advanced Surgery",
  c_section: "C-Section",
  anesthesiologist_coverage: "Anesthesiologist",
  dialysis: "Dialysis",
  icu: "ICU",
  neonatal_icu: "Neonatal ICU",
  nicu: "NICU",
};

export type SearchFormState = {
  text: string;
  maxDistanceKm: number;
  minTrustScore: number;
};
