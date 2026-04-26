"""Pydantic response models owned by the v2 API layer."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.shared.schemas import QueryRequest


class HealthResponse(BaseModel):
    ok: bool
    mode: Literal["mock", "real"]


class TraceSpan(BaseModel):
    name: str
    span_type: str | None = None
    start_time_ms: int | None = None
    end_time_ms: int | None = None
    attributes: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class TraceResponse(BaseModel):
    trace_id: str
    found: bool
    spans: list[TraceSpan]


class TraceTimelineNode(BaseModel):
    id: str
    agent: str
    label: str
    status: Literal["supported", "partial", "unsupported", "complete", "unknown"]
    latency_ms: int | None = None
    token_count: int | None = None
    summary: str
    detail: str | None = None
    attributes: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class TraceTimelineResponse(BaseModel):
    trace_id: str
    found: bool
    nodes: list[TraceTimelineNode]


class EvidenceSnippet(BaseModel):
    facility_id: str
    capability: str
    source_field: str
    sentence: str
    char_start: int
    char_end: int
    flags: list[str] = Field(default_factory=list)


class SignalBreakdown(BaseModel):
    capability: str
    claim_present: bool
    self_consistency_score: float
    coherence_score: float
    peer_anomaly_score: float
    inference_score: float
    trust_score: float
    confidence_interval_low: float
    confidence_interval_high: float
    confidence_interval_width: float
    inference_contradictions: list[str] = Field(default_factory=list)
    flags: list[str] = Field(default_factory=list)
    citation_count: int


class FacilityEvidenceResponse(BaseModel):
    facility_id: str
    facility_name: str
    pin_code: str
    state: str
    district: str
    facility_type: str
    overall_trust_score: float
    has_flags: bool
    flags: list[str]
    flag_summary: str | None = None
    signals: list[SignalBreakdown]
    evidence: list[EvidenceSnippet]
    audit_summary: str


class CriticIssue(BaseModel):
    facility_id: str
    facility_name: str
    capability: str | None = None
    issue_type: Literal["flagged_claim", "missing_citation", "wide_interval"]
    severity: Literal["info", "warn", "critical"]
    message: str


class CriticSummary(BaseModel):
    verdict: Literal["supported", "partial", "unsupported"]
    reasoning: str
    issues: list[CriticIssue] = Field(default_factory=list)


class DemoScenario(BaseModel):
    id: str
    label: str
    description: str
    request: QueryRequest


class DemoScenariosResponse(BaseModel):
    scenarios: list[DemoScenario]


class DemoMoment(BaseModel):
    id: str
    title: str
    endpoint: str
    request: QueryRequest | None = None
    target_facility_id: str | None = None
    target_pin_code: str | None = None
    expected_flag: str | None = None
    success_criteria: list[str]
    design_notes: list[str]


class DemoMomentsResponse(BaseModel):
    moments: list[DemoMoment]


class EndpointContract(BaseModel):
    method: Literal["GET", "POST"]
    path: str
    purpose: str
    response_model: str
    notes: list[str] = Field(default_factory=list)


class FrontendContractResponse(BaseModel):
    product_name: str
    frontend_owner: str
    backend_owner: str
    constraints: list[str]
    endpoints: list[EndpointContract]
    demo_sequence: list[str]
    field_notes: dict[str, str]


class DesertPinSummary(BaseModel):
    pin_code: str
    state: str
    district: str
    capability: str
    population: int | None = None
    desert_score: float
    nearest_verified_facility_id: str | None = None
    distance_km: float | None = None


class DesertGroupSummary(BaseModel):
    key: str
    row_count: int
    critical_pin_count: int
    population_at_risk: int
    average_desert_score: float


class DesertSummary(BaseModel):
    capability: str | None = None
    state: str | None = None
    total_rows: int
    critical_pin_count: int
    population_at_risk: int
    average_desert_score: float
    top_deserts: list[DesertPinSummary]
    by_state: list[DesertGroupSummary]
    by_capability: list[DesertGroupSummary]
