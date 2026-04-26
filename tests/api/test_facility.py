from __future__ import annotations

from fastapi.testclient import TestClient

from src.api.server import app
from src.shared.schemas import FacilityTrustRecord

client = TestClient(app)


def test_facility_endpoint_returns_record() -> None:
    response = client.get("/api/facility/F00042")

    assert response.status_code == 200
    parsed = FacilityTrustRecord.model_validate(response.json())
    assert parsed.facility_id == "F00042"
    assert any(claim.capability == "dialysis" for claim in parsed.capabilities)


def test_facility_endpoint_404_for_unknown_facility() -> None:
    response = client.get("/api/facility/DOES_NOT_EXIST")

    assert response.status_code == 404
