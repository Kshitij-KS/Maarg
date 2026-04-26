from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.server import app
from app.shared.schemas import PinCodeDesert

client = TestClient(app)


def test_desert_endpoint_returns_pin_rows() -> None:
    response = client.get("/api/desert", params={"pin_code": "852113"})

    assert response.status_code == 200
    rows = [PinCodeDesert.model_validate(row) for row in response.json()]
    assert rows
    assert {row.capability for row in rows} >= {"emergency_obstetric_care", "dialysis"}


def test_desert_endpoint_filters_by_capability_and_state() -> None:
    response = client.get(
        "/api/desert",
        params={"capability": "emergency_obstetric_care", "state": "Bihar"},
    )

    assert response.status_code == 200
    rows = [PinCodeDesert.model_validate(row) for row in response.json()]
    assert rows
    assert {row.capability for row in rows} == {"emergency_obstetric_care"}
    assert {row.state for row in rows} == {"Bihar"}
