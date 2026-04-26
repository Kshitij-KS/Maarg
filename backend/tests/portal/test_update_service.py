from __future__ import annotations

import json

import pytest

from app.portal.services.update_service import serialize_update_value, validate_update_value


def test_equipment_update_requires_proof() -> None:
    with pytest.raises(ValueError, match="requires location-tagged proof"):
        validate_update_value("equipment", ["anesthesia machine"], [])


def test_contact_update_can_be_serialized_without_proof() -> None:
    policy = validate_update_value("official_phone", "+91 9876543210", [])
    serialized = serialize_update_value("+91 9876543210")

    assert policy["category"] == "contact"
    assert json.loads(serialized) == "+91 9876543210"


def test_forbidden_gold_field_is_rejected() -> None:
    with pytest.raises(ValueError, match="system-computed"):
        validate_update_value("overall_trust_score", 1.0, [])
