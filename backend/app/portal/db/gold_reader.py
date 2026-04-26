"""Read-only facade over Gold facility records for portal code."""

from __future__ import annotations

from app.api.adapters.gold_reader import facilities, facility_by_id
from app.shared.schemas import FacilityTrustRecord

__all__ = ["FacilityTrustRecord", "facilities", "facility_by_id"]
