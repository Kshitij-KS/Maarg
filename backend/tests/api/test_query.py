from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.server import app
from app.shared.constants import DEMO_MADHEPURA_LAT, DEMO_MADHEPURA_LON
from app.shared.schemas import QueryResponse

client = TestClient(app)


def test_query_endpoint_returns_valid_response() -> None:
    response = client.post(
        "/api/query",
        json={
            "text": "emergency C-section near Madhepura within 50km with anesthesiologist",
            "user_lat": DEMO_MADHEPURA_LAT,
            "user_lon": DEMO_MADHEPURA_LON,
            "max_distance_km": 50,
            "min_trust_score": 0.5,
            "top_k": 10,
        },
    )

    assert response.status_code == 200
    parsed = QueryResponse.model_validate(response.json())
    assert parsed.trace_id
    assert parsed.critic_verdict == "supported"
    assert [candidate.facility_id for candidate in parsed.candidates] == ["F00001"]
