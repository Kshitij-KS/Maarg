"""Read-only facade over Gold facility records for portal code."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from app.api.adapters.gold_reader import (
    facilities as _api_facilities,
    facility_by_id as _api_facility_by_id,
)
from app.shared.catalog import MOCK_FACILITY_TRUST_PATH
from app.shared.schemas import FacilityTrustRecord

__all__ = ["FacilityTrustRecord", "facilities", "facility_by_id"]


def facilities() -> list[FacilityTrustRecord]:
    return _api_facilities()


def facility_by_id(facility_id: str) -> FacilityTrustRecord | None:
    record = _api_facility_by_id(facility_id)
    if record is not None:
        return record
    return _fixture_facility_by_id(facility_id)


def _fixture_facility_by_id(facility_id: str) -> FacilityTrustRecord | None:
    return next(
        (record for record in _fixture_facilities() if record.facility_id == facility_id),
        None,
    )


@lru_cache(maxsize=1)
def _fixture_facilities() -> tuple[FacilityTrustRecord, ...]:
    payload: Any = json.loads(MOCK_FACILITY_TRUST_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        return ()
    return tuple(FacilityTrustRecord.model_validate(row) for row in payload)
