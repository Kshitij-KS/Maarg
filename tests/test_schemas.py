from __future__ import annotations

from datetime import UTC, datetime

from src.shared.schemas import (
    CapabilityClaim,
    Citation,
    FacilityTrustRecord,
    PinCodeDesert,
    QueryRequest,
    QueryResponse,
)


def sample_citation() -> Citation:
    return Citation(
        source_field="free_text_notes",
        sentence="Emergency OT supports C-section with anesthesiologist on call.",
        char_start=0,
        char_end=62,
    )


def sample_capability(capability: str = "c_section", trust_score: float = 0.91) -> CapabilityClaim:
    return CapabilityClaim(
        capability=capability,
        claim_present=True,
        self_consistency_score=0.92,
        coherence_score=0.9,
        peer_anomaly_score=0.86,
        trust_score=trust_score,
        confidence_interval_low=0.84,
        confidence_interval_high=0.96,
        citations=[sample_citation()],
        flags=[],
    )


def sample_facility() -> FacilityTrustRecord:
    return FacilityTrustRecord(
        facility_id="F00001",
        facility_name="Madhepura District Hospital",
        pin_code="852113",
        state="Bihar",
        district="Madhepura",
        lat=25.921,
        lon=86.792,
        facility_type="District Hospital",
        capabilities=[
            sample_capability("c_section", 0.91),
            sample_capability("anesthesiologist_coverage", 0.88),
        ],
        overall_trust_score=0.9,
        extraction_run_ids=["mock-run-001"],
        last_updated=datetime(2026, 4, 26, tzinfo=UTC),
    )


def sample_desert() -> PinCodeDesert:
    return PinCodeDesert(
        pin_code="852113",
        state="Bihar",
        district="Madhepura",
        lat=25.92,
        lon=86.79,
        population=54321,
        capability="emergency_obstetric_care",
        nearest_verified_facility_id="F00001",
        distance_km=3.2,
        desert_score=0.18,
    )


def round_trip_model(model):
    return type(model).model_validate_json(model.model_dump_json())


def test_schema_round_trips_every_contract_model() -> None:
    facility = sample_facility()
    response = QueryResponse(
        query="emergency C-section near Madhepura within 50km",
        candidates=[facility],
        citations_per_candidate={"F00001": [sample_citation()]},
        critic_verdict="supported",
        critic_reasoning="All rendered claims have citations.",
        trace_id="trace-123",
    )

    models = [
        sample_citation(),
        sample_capability(),
        facility,
        sample_desert(),
        QueryRequest(text="find c-section", top_k=5),
        response,
    ]

    for model in models:
        assert round_trip_model(model) == model
