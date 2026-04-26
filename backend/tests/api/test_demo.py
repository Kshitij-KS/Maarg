from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.schemas import DemoScenariosResponse
from app.api.server import app
from app.shared.demo_contract import (
    DESERT_MAP_ID,
    EXPECTED_LIVE_CATCH_FLAG,
    FLAGGED_FACILITY_ID,
    LIVE_CATCH_ID,
)
from app.shared.schemas import QueryResponse

client = TestClient(app)


def test_demo_scenarios_endpoint_returns_three_sacred_queries() -> None:
    response = client.get("/api/demo-scenarios")

    assert response.status_code == 200
    parsed = DemoScenariosResponse.model_validate(response.json())
    assert [scenario.id for scenario in parsed.scenarios] == [
        "live-catch",
        "confidence-interval",
        "desert-map",
    ]


def test_demo_scenarios_live_catch_uses_canonical_flagged_request() -> None:
    response = client.get("/api/demo-scenarios")

    assert response.status_code == 200
    parsed = DemoScenariosResponse.model_validate(response.json())
    live_catch = next(s for s in parsed.scenarios if s.id == LIVE_CATCH_ID)

    query_response = client.post(
        "/api/query",
        json=live_catch.request.model_dump(mode="json"),
    )

    assert query_response.status_code == 200
    result = QueryResponse.model_validate(query_response.json())
    assert result.critic_verdict == "partial"
    flagged = next(c for c in result.candidates if c.facility_id == FLAGGED_FACILITY_ID)
    assert any(EXPECTED_LIVE_CATCH_FLAG in claim.flags for claim in flagged.capabilities)


def test_demo_scenarios_desert_copy_uses_critical_pin() -> None:
    response = client.get("/api/demo-scenarios")

    assert response.status_code == 200
    parsed = DemoScenariosResponse.model_validate(response.json())
    desert = next(s for s in parsed.scenarios if s.id == DESERT_MAP_ID)
    assert "855107" in desert.request.text
