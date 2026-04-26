from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.schemas import (
    DemoMomentsResponse,
    DesertSummary,
    FacilityEvidenceResponse,
    FrontendContractResponse,
    TraceTimelineResponse,
)
from app.api.server import app
from app.shared.constants import DEMO_MADHEPURA_LAT, DEMO_MADHEPURA_LON
from app.shared.schemas import QueryResponse

client = TestClient(app)


def test_frontend_contract_documents_backend_owned_endpoints() -> None:
    response = client.get("/api/frontend-contract")

    assert response.status_code == 200
    parsed = FrontendContractResponse.model_validate(response.json())
    paths = {endpoint.path for endpoint in parsed.endpoints}
    assert "/api/query" in paths
    assert "/api/facility/{facility_id}/evidence" in paths
    assert "/api/desert/summary" in paths
    assert parsed.frontend_owner == "Claude Design"


def test_demo_moments_expose_three_pitch_sequences() -> None:
    response = client.get("/api/demo-moments")

    assert response.status_code == 200
    parsed = DemoMomentsResponse.model_validate(response.json())
    assert [moment.id for moment in parsed.moments] == [
        "live-catch",
        "confidence-interval",
        "desert-map",
    ]
    live_catch = parsed.moments[0]
    assert live_catch.target_facility_id == "F00002"
    assert live_catch.expected_flag == "MISSING_ANESTHESIOLOGIST"


def test_live_catch_query_returns_flagged_facility_and_partial_verdict() -> None:
    response = client.post(
        "/api/query",
        json={
            "text": "Emergency C-section near Madhepura within 50km",
            "user_lat": DEMO_MADHEPURA_LAT,
            "user_lon": DEMO_MADHEPURA_LON,
            "max_distance_km": 50,
            "min_trust_score": 0.3,
            "capabilities_filter": ["c_section", "emergency_obstetric_care"],
            "top_k": 10,
        },
    )

    assert response.status_code == 200
    parsed = QueryResponse.model_validate(response.json())
    assert parsed.critic_verdict == "partial"
    assert any(candidate.facility_id == "F00002" for candidate in parsed.candidates)
    flagged = next(
        candidate for candidate in parsed.candidates if candidate.facility_id == "F00002"
    )
    assert any("MISSING_ANESTHESIOLOGIST" in claim.flags for claim in flagged.capabilities)


def test_facility_evidence_exposes_flags_and_signal_breakdown() -> None:
    response = client.get("/api/facility/F00002/evidence")

    assert response.status_code == 200
    parsed = FacilityEvidenceResponse.model_validate(response.json())
    assert parsed.has_flags
    assert "MISSING_ANESTHESIOLOGIST" in parsed.flags
    assert parsed.evidence
    assert any(signal.capability == "anesthesiologist_coverage" for signal in parsed.signals)


def test_confidence_demo_exposes_calibrated_interval() -> None:
    response = client.get("/api/facility/F00042/evidence")

    assert response.status_code == 200
    parsed = FacilityEvidenceResponse.model_validate(response.json())
    dialysis = next(signal for signal in parsed.signals if signal.capability == "dialysis")
    assert dialysis.trust_score == 0.78
    assert dialysis.confidence_interval_low == 0.66
    assert dialysis.confidence_interval_high == 0.86
    assert dialysis.citation_count > 0


def test_desert_summary_returns_map_headline_data() -> None:
    response = client.get(
        "/api/desert/summary",
        params={"capability": "emergency_obstetric_care"},
    )

    assert response.status_code == 200
    parsed = DesertSummary.model_validate(response.json())
    assert parsed.total_rows > 0
    assert parsed.critical_pin_count >= 1
    assert parsed.population_at_risk >= 128000
    assert parsed.top_deserts[0].pin_code == "855107"


def test_trace_timeline_returns_frontend_narrative_nodes() -> None:
    query_response = client.post(
        "/api/query",
        json={
            "text": "emergency C-section near Madhepura within 50km with anesthesiologist",
            "user_lat": DEMO_MADHEPURA_LAT,
            "user_lon": DEMO_MADHEPURA_LON,
            "max_distance_km": 50,
            "min_trust_score": 0.5,
        },
    )
    parsed_query = QueryResponse.model_validate(query_response.json())

    timeline_response = client.get(f"/api/trace/{parsed_query.trace_id}/timeline")

    assert timeline_response.status_code == 200
    parsed_timeline = TraceTimelineResponse.model_validate(timeline_response.json())
    assert parsed_timeline.found
    assert parsed_timeline.nodes
    assert {node.agent for node in parsed_timeline.nodes} & {
        "Coordinator",
        "Geo-Reasoner",
        "Critic",
    }
