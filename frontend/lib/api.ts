import { z } from "zod";

import type {
  DemoMomentsResponse,
  DemoScenariosResponse,
  DesertSummary,
  FacilityEvidenceResponse,
  FacilityTrustRecord,
  PinCodeDesert,
  QueryRequest,
  QueryResponse,
  TraceResponse,
  TraceTimelineResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const CitationSchema = z.object({
  source_field: z.string(),
  sentence: z.string(),
  char_start: z.number(),
  char_end: z.number(),
}).passthrough();

const InferenceResultSchema = z.object({
  inferred_present: z.boolean().nullable(),
  inference_confidence: z.number(),
  supporting_equipment: z.array(z.string()),
  contradictions: z.array(z.string()),
  inference_flags: z.array(z.string()),
}).passthrough();

const CapabilityClaimSchema = z.object({
  capability: z.string(),
  claim_present: z.boolean(),
  self_consistency_score: z.number(),
  coherence_score: z.number(),
  peer_anomaly_score: z.number(),
  inference_score: z.number(),
  trust_score: z.number(),
  confidence_interval_low: z.number(),
  confidence_interval_high: z.number(),
  citations: z.array(CitationSchema),
  inference_detail: InferenceResultSchema.nullable().optional(),
  flags: z.array(z.string()).optional(),
}).passthrough();

const FacilityTrustRecordSchema = z.object({
  facility_id: z.string(),
  facility_name: z.string(),
  pin_code: z.string(),
  state: z.string(),
  district: z.string(),
  lat: z.number(),
  lon: z.number(),
  facility_type: z.string(),
  normalization_version: z.string(),
  capabilities: z.array(CapabilityClaimSchema),
  overall_trust_score: z.number(),
  extraction_run_ids: z.array(z.string()),
  last_updated: z.string(),
}).passthrough();

const PinCodeDesertSchema = z.object({
  pin_code: z.string(),
  state: z.string(),
  district: z.string(),
  lat: z.number(),
  lon: z.number(),
  population: z.number().nullable().optional(),
  capability: z.string(),
  nearest_verified_facility_id: z.string().nullable().optional(),
  distance_km: z.number().nullable().optional(),
  desert_score: z.number(),
});

const QueryRequestSchema = z.object({
  text: z.string(),
  user_lat: z.number().nullable().optional(),
  user_lon: z.number().nullable().optional(),
  max_distance_km: z.number().nullable().optional(),
  min_trust_score: z.number(),
  capabilities_filter: z.array(z.string()).nullable().optional(),
  top_k: z.number(),
});

const QueryResponseSchema = z.object({
  query: z.string(),
  candidates: z.array(FacilityTrustRecordSchema),
  citations_per_candidate: z.record(z.string(), z.array(CitationSchema)),
  critic_verdict: z.enum(["supported", "partial", "unsupported"]),
  critic_reasoning: z.string(),
  trace_id: z.string(),
});

const AttributeValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const TraceResponseSchema = z.object({
  trace_id: z.string(),
  found: z.boolean(),
  spans: z.array(
    z.object({
      name: z.string(),
      span_type: z.string().nullable().optional(),
      start_time_ms: z.number().nullable().optional(),
      end_time_ms: z.number().nullable().optional(),
      attributes: z.record(z.string(), AttributeValueSchema),
    }),
  ),
});

const TraceTimelineResponseSchema: z.ZodType<TraceTimelineResponse> = z.object({
  trace_id: z.string(),
  found: z.boolean(),
  nodes: z.array(
    z.object({
      id: z.string(),
      agent: z.string(),
      label: z.string(),
      status: z.enum(["supported", "partial", "unsupported", "complete", "unknown"]),
      latency_ms: z.number().nullable().optional(),
      token_count: z.number().nullable().optional(),
      summary: z.string(),
      detail: z.string().nullable().optional(),
      attributes: z.record(z.string(), AttributeValueSchema),
    }),
  ),
});

const EvidenceSnippetSchema = z.object({
  facility_id: z.string(),
  capability: z.string(),
  source_field: z.string(),
  sentence: z.string(),
  char_start: z.number(),
  char_end: z.number(),
  flags: z.array(z.string()),
});

const SignalBreakdownSchema = z.object({
  capability: z.string(),
  claim_present: z.boolean(),
  self_consistency_score: z.number(),
  coherence_score: z.number(),
  peer_anomaly_score: z.number(),
  inference_score: z.number(),
  trust_score: z.number(),
  confidence_interval_low: z.number(),
  confidence_interval_high: z.number(),
  confidence_interval_width: z.number(),
  inference_contradictions: z.array(z.string()).optional(),
  flags: z.array(z.string()),
  citation_count: z.number(),
}).passthrough();

const FacilityEvidenceResponseSchema: z.ZodType<FacilityEvidenceResponse> = z.object({
  facility_id: z.string(),
  facility_name: z.string(),
  pin_code: z.string(),
  state: z.string(),
  district: z.string(),
  facility_type: z.string(),
  overall_trust_score: z.number(),
  has_flags: z.boolean(),
  flags: z.array(z.string()),
  flag_summary: z.string().nullable().optional(),
  signals: z.array(SignalBreakdownSchema),
  evidence: z.array(EvidenceSnippetSchema),
  audit_summary: z.string(),
});

const DesertPinSummarySchema = z.object({
  pin_code: z.string(),
  state: z.string(),
  district: z.string(),
  capability: z.string(),
  population: z.number().nullable().optional(),
  desert_score: z.number(),
  nearest_verified_facility_id: z.string().nullable().optional(),
  distance_km: z.number().nullable().optional(),
});

const DesertGroupSummarySchema = z.object({
  key: z.string(),
  row_count: z.number(),
  critical_pin_count: z.number(),
  population_at_risk: z.number(),
  average_desert_score: z.number(),
});

const DesertSummarySchema: z.ZodType<DesertSummary> = z.object({
  capability: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  total_rows: z.number(),
  critical_pin_count: z.number(),
  population_at_risk: z.number(),
  average_desert_score: z.number(),
  top_deserts: z.array(DesertPinSummarySchema),
  by_state: z.array(DesertGroupSummarySchema),
  by_capability: z.array(DesertGroupSummarySchema),
});

const DemoScenariosResponseSchema = z.object({
  scenarios: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      request: QueryRequestSchema,
    }),
  ),
});

const DemoMomentsResponseSchema: z.ZodType<DemoMomentsResponse> = z.object({
  moments: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      endpoint: z.string(),
      request: QueryRequestSchema.nullable().optional(),
      target_facility_id: z.string().nullable().optional(),
      target_pin_code: z.string().nullable().optional(),
      expected_flag: z.string().nullable().optional(),
      success_criteria: z.array(z.string()),
      design_notes: z.array(z.string()),
    }),
  ),
});

const DEFAULT_TIMEOUT_MS = 12_000;

async function parseJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = `${detail} — ${body.detail}`;
    } catch {
      // ignore parse failures
    }
    throw new Error(`API error: ${detail}`);
  }
  const payload: unknown = await response.json();
  try {
    return schema.parse(payload);
  } catch (err) {
    // Devs get the full Zod trace; users get a one-liner.
    if (typeof console !== "undefined") {
      console.error("[api] Response schema mismatch", err, payload);
    }
    throw new Error(
      "Backend response shape changed — frontend needs an update. (See console for details.)",
    );
  }
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  // If caller didn't supply a signal, attach a default 12s abort timer.
  // Use AbortController (not AbortSignal.timeout) for broader runtime support.
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let signal = init?.signal;
  if (!signal) {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    signal = controller.signal;
  }

  try {
    return await fetch(url, { ...init, signal });
  } catch (err) {
    const isAbort =
      err instanceof DOMException
        ? err.name === "AbortError"
        : (err as { name?: string } | null)?.name === "AbortError";
    if (isAbort) {
      throw new Error(
        `Request timed out after ${DEFAULT_TIMEOUT_MS / 1000}s — backend may be busy. Try again in a moment.`,
      );
    }
    throw new Error(
      `Cannot reach the backend at ${API_BASE_URL}. ` +
        `Make sure the FastAPI server is running: python -m uvicorn app.api.server:app --reload --port 8000 from backend/. ` +
        `(Original: ${String(err)})`,
    );
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export async function queryFacilities(request: QueryRequest): Promise<QueryResponse> {
  const response = await apiFetch(`${API_BASE_URL}/api/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseJson(response, QueryResponseSchema);
}

export async function getFacility(facilityId: string): Promise<FacilityTrustRecord> {
  const response = await apiFetch(`${API_BASE_URL}/api/facility/${facilityId}`);
  return parseJson(response, FacilityTrustRecordSchema);
}

export async function getFacilityEvidence(
  facilityId: string,
): Promise<FacilityEvidenceResponse> {
  const response = await apiFetch(`${API_BASE_URL}/api/facility/${facilityId}/evidence`);
  return parseJson(response, FacilityEvidenceResponseSchema);
}

export async function getDesertRows(params: {
  capability?: string;
  state?: string;
  pinCode?: string;
}): Promise<PinCodeDesert[]> {
  const search = new URLSearchParams();
  if (params.capability) search.set("capability", params.capability);
  if (params.state) search.set("state", params.state);
  if (params.pinCode) search.set("pin_code", params.pinCode);
  const qs = search.toString();
  const response = await apiFetch(`${API_BASE_URL}/api/desert${qs ? `?${qs}` : ""}`);
  return parseJson(response, z.array(PinCodeDesertSchema));
}

export async function getDesertSummary(params: {
  capability?: string;
  state?: string;
}): Promise<DesertSummary> {
  const search = new URLSearchParams();
  if (params.capability) search.set("capability", params.capability);
  if (params.state) search.set("state", params.state);
  const qs = search.toString();
  const response = await apiFetch(`${API_BASE_URL}/api/desert/summary${qs ? `?${qs}` : ""}`);
  return parseJson(response, DesertSummarySchema);
}

export async function getTrace(traceId: string): Promise<TraceResponse> {
  const response = await apiFetch(`${API_BASE_URL}/api/trace/${traceId}`);
  return parseJson(response, TraceResponseSchema);
}

export async function getTraceTimeline(traceId: string): Promise<TraceTimelineResponse> {
  const response = await apiFetch(`${API_BASE_URL}/api/trace/${traceId}/timeline`);
  return parseJson(response, TraceTimelineResponseSchema);
}

export async function getDemoScenarios(): Promise<DemoScenariosResponse> {
  const response = await apiFetch(`${API_BASE_URL}/api/demo-scenarios`);
  return parseJson(response, DemoScenariosResponseSchema);
}

export async function getDemoMoments(): Promise<DemoMomentsResponse> {
  const response = await apiFetch(`${API_BASE_URL}/api/demo-moments`);
  return parseJson(response, DemoMomentsResponseSchema);
}

/** Re-run the reasoning pipeline biased toward a specific lat/lon + capabilities
 *  to surface the best alternatives for a selected facility. */
export async function findAlternatives(params: {
  lat: number;
  lon: number;
  capabilities: string[];
  facilityName?: string;
  excludeFacilityId?: string;
}): Promise<QueryResponse> {
  const capText =
    params.capabilities.length > 0
      ? params.capabilities.join(", ").replace(/_/g, " ")
      : "emergency care";
  const request: QueryRequest = {
    text: `Best alternatives offering ${capText} near ${params.facilityName ?? "this location"}`,
    user_lat: params.lat,
    user_lon: params.lon,
    max_distance_km: 150,
    min_trust_score: 0.4,
    capabilities_filter: params.capabilities.length > 0 ? params.capabilities : null,
    top_k: 5,
  };
  return queryFacilities(request);
}
