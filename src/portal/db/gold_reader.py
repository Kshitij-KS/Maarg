"""Read-only facade over Gold facility records for portal code."""

from __future__ import annotations

from src.api.adapters.gold_reader import facilities, facility_by_id
from src.shared.schemas import FacilityTrustRecord

__all__ = ["FacilityTrustRecord", "facilities", "facility_by_id"]
