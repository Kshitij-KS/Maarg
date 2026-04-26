"""The contract between Person A (Truth Layer) and Person B (Reasoning Layer).

LOCKED AT HOUR 2. After lock-in:
- Adding a field: OK, append-only, notify the other side.
- Renaming a field: forbidden.
- Removing a field: forbidden.
- Changing a type: forbidden.

Any non-additive change must:
1. Be flagged with `SCHEMA CHANGE PROPOSED:` in the PR title.
2. Wait for a 5-minute human sync before merging.
3. Update both sides' fixtures and tests in the same PR.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Citation(BaseModel):
    """Exact provenance for any extracted fact."""

    source_field: str
    sentence: str
    char_start: int
    char_end: int


class InferenceResult(BaseModel):
    """Equipment-to-capability inference details from the Truth Layer."""

    inferred_present: bool | None
    inference_confidence: float = Field(..., ge=0, le=1)
    supporting_equipment: list[str]
    contradictions: list[str]
    inference_flags: list[str]


class CapabilityClaim(BaseModel):
    """One row per (facility, capability). The atomic unit of trust."""

    capability: str
    claim_present: bool
    self_consistency_score: float = Field(..., ge=0, le=1)
    coherence_score: float = Field(..., ge=0, le=1)
    peer_anomaly_score: float = Field(..., ge=0, le=1)
    inference_score: float = Field(..., ge=0, le=1)
    trust_score: float = Field(..., ge=0, le=1)
    confidence_interval_low: float
    confidence_interval_high: float
    citations: list[Citation]
    inference_detail: InferenceResult | None = None
    flags: list[str] = Field(default_factory=list)


class FacilityTrustRecord(BaseModel):
    """One row per facility in `gold.facility_trust`."""

    facility_id: str
    facility_name: str
    pin_code: str
    state: str
    district: str
    lat: float
    lon: float
    facility_type: str
    normalization_version: str
    capabilities: list[CapabilityClaim]
    overall_trust_score: float = Field(..., ge=0, le=1)
    extraction_run_ids: list[str]
    last_updated: datetime


class PinCodeDesert(BaseModel):
    """One row per (pin_code, capability) in `gold.pin_code_desert`."""

    pin_code: str
    state: str
    district: str
    lat: float
    lon: float
    population: int | None = None
    capability: str
    nearest_verified_facility_id: str | None = None
    distance_km: float | None = None
    desert_score: float = Field(..., ge=0, le=1)


class QueryRequest(BaseModel):
    """User query into the Coordinator agent."""

    text: str
    user_lat: float | None = None
    user_lon: float | None = None
    max_distance_km: float | None = None
    min_trust_score: float = 0.5
    capabilities_filter: list[str] | None = None
    top_k: int = 10


class QueryResponse(BaseModel):
    """The thing the (eventual) frontend renders."""

    query: str
    candidates: list[FacilityTrustRecord]
    citations_per_candidate: dict[str, list[Citation]]
    critic_verdict: Literal["supported", "partial", "unsupported"]
    critic_reasoning: str
    trace_id: str
