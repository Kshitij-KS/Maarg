from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.schemas import TraceResponse
from app.api.server import app
from app.shared.constants import DEMO_MADHEPURA_LAT, DEMO_MADHEPURA_LON
from app.shared.schemas import QueryResponse

client = TestClient(app)


def test_trace_endpoint_returns_trace_for_query_response() -> None:
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

    trace_response = client.get(f"/api/trace/{parsed_query.trace_id}")

    assert trace_response.status_code == 200
    parsed_trace = TraceResponse.model_validate(trace_response.json())
    assert parsed_trace.trace_id == parsed_query.trace_id
    assert parsed_trace.found
    assert parsed_trace.spans
