from datetime import datetime

from pydantic import BaseModel, Field


class Citation(BaseModel):
    """Exact provenance for any extracted fact."""

    source_field: str
    sentence: str
    char_start: int
    char_end: int


class InferenceResult(BaseModel):
    """
    Output of the Equipment-to-Capability Inference Graph for one capability.
    Tells us what the equipment inventory implies, independent of what the facility claims.
    """

    inferred_present: bool | None
    inference_confidence: float = Field(..., ge=0, le=1)
    supporting_equipment: list[str]
    contradictions: list[str]
    inference_flags: list[str]


class CapabilityClaim(BaseModel):
    """One row per (facility, capability), the atomic unit of trust."""

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
    """One row per facility in gold.facility_trust."""

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
    """One row per (pin_code, capability) in gold.pin_code_desert."""

    pin_code: str
    state: str
    district: str
    lat: float
    lon: float
    population: int | None
    capability: str
    nearest_verified_facility_id: str | None
    distance_km: float | None
    desert_score: float = Field(..., ge=0, le=1)
