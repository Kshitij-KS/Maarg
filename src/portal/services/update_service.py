"""Policy and validation for facility-submitted update requests."""

from __future__ import annotations

import json
from typing import Any, TypedDict

from src.portal.schemas.portal_schemas import FieldCategory


class UpdateFieldPolicy(TypedDict):
    category: FieldCategory
    requires_proof: bool
    value_type: str
    source_field_name: str
    description: str


ALLOWED_UPDATE_FIELDS: dict[str, UpdateFieldPolicy] = {
    "phone_numbers": {
        "category": "contact",
        "requires_proof": False,
        "value_type": "list[str]",
        "source_field_name": "phone_numbers",
        "description": "List of contact phone numbers",
    },
    "official_phone": {
        "category": "contact",
        "requires_proof": False,
        "value_type": "str",
        "source_field_name": "official_phone",
        "description": "Official facility phone number",
    },
    "email": {
        "category": "contact",
        "requires_proof": False,
        "value_type": "str",
        "source_field_name": "email",
        "description": "Official email address",
    },
    "websites": {
        "category": "contact",
        "requires_proof": False,
        "value_type": "list[str]",
        "source_field_name": "websites",
        "description": "Facility websites",
    },
    "official_website": {
        "category": "contact",
        "requires_proof": False,
        "value_type": "str",
        "source_field_name": "official_website",
        "description": "Official facility website",
    },
    "description": {
        "category": "profile",
        "requires_proof": False,
        "value_type": "str",
        "source_field_name": "description",
        "description": "Plain-language facility profile",
    },
    "year_established": {
        "category": "profile",
        "requires_proof": False,
        "value_type": "int",
        "source_field_name": "year_established",
        "description": "Year the facility was established",
    },
    "address_line1": {
        "category": "address",
        "requires_proof": False,
        "value_type": "str",
        "source_field_name": "address_line1",
        "description": "Primary address line",
    },
    "address_line2": {
        "category": "address",
        "requires_proof": False,
        "value_type": "str",
        "source_field_name": "address_line2",
        "description": "Secondary address line",
    },
    "address_city": {
        "category": "address",
        "requires_proof": False,
        "value_type": "str",
        "source_field_name": "address_city",
        "description": "City",
    },
    "address_state_or_region": {
        "category": "address",
        "requires_proof": False,
        "value_type": "str",
        "source_field_name": "address_state_or_region",
        "description": "State or region",
    },
    "address_zip_or_postcode": {
        "category": "address",
        "requires_proof": False,
        "value_type": "str",
        "source_field_name": "address_zip_or_postcode",
        "description": "PIN code",
    },
    "number_doctors": {
        "category": "operational",
        "requires_proof": False,
        "value_type": "int",
        "source_field_name": "number_doctors",
        "description": "Number of doctors",
    },
    "capacity": {
        "category": "operational",
        "requires_proof": False,
        "value_type": "int",
        "source_field_name": "capacity",
        "description": "Bed capacity",
    },
    "specialties": {
        "category": "clinical",
        "requires_proof": True,
        "value_type": "list[str]",
        "source_field_name": "specialties",
        "description": "Clinical specialties",
    },
    "procedures": {
        "category": "clinical",
        "requires_proof": True,
        "value_type": "list[str]",
        "source_field_name": "procedures",
        "description": "Procedures offered",
    },
    "equipment": {
        "category": "equipment",
        "requires_proof": True,
        "value_type": "list[str]",
        "source_field_name": "equipment",
        "description": "Clinical equipment",
    },
    "capability": {
        "category": "capability",
        "requires_proof": True,
        "value_type": "list[str]",
        "source_field_name": "capability",
        "description": "Capability claim supported by equipment proof",
    },
}

FORBIDDEN_UPDATE_FIELDS = {
    "facility_id",
    "overall_trust_score",
    "capabilities",
    "extraction_run_ids",
    "last_updated",
    "latitude",
    "longitude",
    "lat",
    "lon",
    "facility_type_id",
    "operator_type_id",
    "affiliation_type_ids",
    "address_country",
    "address_country_code",
}


def field_policy(field_name: str) -> UpdateFieldPolicy:
    if field_name in FORBIDDEN_UPDATE_FIELDS:
        raise ValueError(f"`{field_name}` is system-computed or admin-controlled.")
    try:
        return ALLOWED_UPDATE_FIELDS[field_name]
    except KeyError as exc:
        raise ValueError(f"`{field_name}` is not an allowed update field.") from exc


def serialize_update_value(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True)


def validate_update_value(
    field_name: str,
    value: Any,
    proof_media_ids: list[str],
) -> UpdateFieldPolicy:
    policy = field_policy(field_name)
    if policy["requires_proof"] and not proof_media_ids:
        raise ValueError(f"`{field_name}` requires location-tagged proof media.")
    value_type = policy["value_type"]
    if value_type == "int" and not isinstance(value, int):
        raise ValueError(f"`{field_name}` must be an integer.")
    if value_type == "str" and not isinstance(value, str):
        raise ValueError(f"`{field_name}` must be text.")
    if value_type == "list[str]" and (
        not isinstance(value, list) or not all(isinstance(item, str) for item in value)
    ):
        raise ValueError(f"`{field_name}` must be a list of text values.")
    return policy
