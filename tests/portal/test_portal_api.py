from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.api.server import app
from src.portal.api.auth import admin_token
from src.portal.db import portal_tables
from src.portal.db.portal_tables import approved_updates

client = TestClient(app)


def _register_payload() -> dict[str, object]:
    return {
        "facility_name": "Madhepura District Hospital",
        "facility_type": "District Hospital",
        "official_phone": "+91 9876543210",
        "official_email": "facility@example.org",
        "official_website": "https://example.org",
        "address_line1": "Main Road",
        "address_city": "Madhepura",
        "address_state_or_region": "Bihar",
        "address_zip_or_postcode": "852113",
        "contact_person_name": "Demo Admin",
        "contact_person_role": "Administrator",
        "contact_person_phone": "+91 9876543210",
        "contact_person_email": "facility-admin@example.org",
        "proof_documents": ["dbfs:/portal/proof_docs/demo/certificate.pdf"],
        "declaration_confirmed": True,
    }


def test_registration_approval_login_dashboard_and_update_flow(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(portal_tables, "PORTAL_FIXTURES_DIR", tmp_path)

    register_response = client.post("/portal/register", json=_register_payload())
    assert register_response.status_code == 200
    registration_id = register_response.json()["registration_id"]
    matched_facility_id = register_response.json()["matched_facility_id"]

    admin_headers = {"authorization": f"Bearer {admin_token()}"}
    approval_response = client.patch(
        f"/portal/admin/registrations/{registration_id}",
        headers=admin_headers,
        json={
            "status": "approved",
            "matched_facility_id": matched_facility_id,
            "reviewer_notes": "Approved in test.",
            "temporary_password": "PortalDemo123!",
        },
    )
    assert approval_response.status_code == 200

    login_response = client.post(
        "/portal/login",
        json={"email": "facility-admin@example.org", "password": "PortalDemo123!"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    user_headers = {"authorization": f"Bearer {token}"}

    dashboard_response = client.get("/portal/facility/me", headers=user_headers)
    assert dashboard_response.status_code == 200
    assert dashboard_response.json()["facility_id"] == matched_facility_id

    proof_response = client.post(
        "/portal/proof/upload",
        headers=user_headers,
        data={
            "location_lat": "25.921",
            "location_lon": "86.792",
            "location_accuracy_m": "12",
            "location_captured_at": "2026-04-26T06:35:00Z",
        },
        files={"file": ("anesthesia.jpg", b"demo-image-bytes", "image/jpeg")},
    )
    assert proof_response.status_code == 200
    proof_media_id = proof_response.json()["media_id"]

    update_response = client.post(
        "/portal/updates",
        headers=user_headers,
        json={
            "field_name": "official_phone",
            "new_value": "+91 9999999999",
            "justification": "The public reception number changed.",
            "proof_media_ids": [],
        },
    )
    assert update_response.status_code == 200
    request_id = update_response.json()["request_id"]

    review_response = client.patch(
        f"/portal/admin/updates/{request_id}",
        headers=admin_headers,
        json={"status": "approved", "reviewer_notes": "Looks correct.", "proof_verified": False},
    )
    assert review_response.status_code == 200
    assert any(row.update_id == request_id for row in approved_updates())

    equipment_response = client.post(
        "/portal/updates",
        headers=user_headers,
        json={
            "field_name": "equipment",
            "new_value": ["anesthesia machine"],
            "justification": "New equipment was installed in the OT.",
            "proof_media_ids": [proof_media_id],
        },
    )
    assert equipment_response.status_code == 200
