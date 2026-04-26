from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.server import app

client = TestClient(app)


def test_map_facilities_returns_more_than_query_default() -> None:
    response = client.get("/api/map/facilities?limit=25")

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) > 20


def test_map_facilities_supports_limit() -> None:
    response = client.get("/api/map/facilities?limit=5")

    assert response.status_code == 200
    assert len(response.json()) == 5


def test_map_facilities_filters_by_capability() -> None:
    response = client.get("/api/map/facilities?capability=dialysis&limit=50")

    assert response.status_code == 200
    for row in response.json():
        assert any(claim["capability"] == "dialysis" for claim in row["capabilities"])
