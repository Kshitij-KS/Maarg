from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.schemas import HealthResponse
from app.api.server import app

client = TestClient(app)


def test_healthz() -> None:
    response = client.get("/healthz")

    assert response.status_code == 200
    assert HealthResponse.model_validate(response.json()).ok is True


def test_root_reports_health_for_render_smoke_check() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert HealthResponse.model_validate(response.json()).ok is True
