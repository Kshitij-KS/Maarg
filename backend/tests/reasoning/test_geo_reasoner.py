from __future__ import annotations

from app.reasoning.agents.geo_reasoner import GeoReasoner
from app.shared.constants import DEMO_MADHEPURA_LAT, DEMO_MADHEPURA_LON
from app.shared.schemas import QueryRequest


def test_geo_reasoner_returns_verified_madhepura_facility() -> None:
    request = QueryRequest(
        text="emergency C-section near Madhepura within 50km with anesthesiologist",
        user_lat=DEMO_MADHEPURA_LAT,
        user_lon=DEMO_MADHEPURA_LON,
        max_distance_km=50,
        min_trust_score=0.5,
        capabilities_filter=["c_section", "anesthesiologist_coverage"],
        top_k=10,
    )

    candidates = GeoReasoner().find_candidates(request)

    assert [candidate.facility_id for candidate in candidates] == ["F00001"]


def test_geo_reasoner_honors_min_trust_score() -> None:
    request = QueryRequest(
        text="emergency C-section near Madhepura",
        user_lat=DEMO_MADHEPURA_LAT,
        user_lon=DEMO_MADHEPURA_LON,
        max_distance_km=50,
        min_trust_score=0.99,
        capabilities_filter=["c_section"],
        top_k=10,
    )

    assert GeoReasoner().find_candidates(request) == []
