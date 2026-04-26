from __future__ import annotations

from src.reasoning.pipeline import ReasoningPipeline
from src.shared.constants import DEMO_MADHEPURA_LAT, DEMO_MADHEPURA_LON
from src.shared.schemas import QueryRequest


def test_pipeline_returns_query_response_with_trace() -> None:
    response = ReasoningPipeline().answer_query(
        QueryRequest(
            text="emergency C-section near Madhepura within 50km with anesthesiologist",
            user_lat=DEMO_MADHEPURA_LAT,
            user_lon=DEMO_MADHEPURA_LON,
            max_distance_km=50,
            min_trust_score=0.5,
        )
    )

    assert response.trace_id
    assert response.critic_verdict == "supported"
    assert [candidate.facility_id for candidate in response.candidates] == ["F00001"]
    assert response.citations_per_candidate["F00001"]
