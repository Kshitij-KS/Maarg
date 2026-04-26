"""API-owned Gold reader facade.

The canonical mock/real switch remains in `app.shared.catalog`; this adapter
keeps API routes decoupled from the catalog module shape.
"""

from __future__ import annotations

from app.shared.catalog import current_mode, load_facility_trust, load_pin_desert
from app.shared.schemas import FacilityTrustRecord, PinCodeDesert


def mode() -> str:
    return current_mode()


def facilities() -> list[FacilityTrustRecord]:
    return load_facility_trust()


def facility_by_id(facility_id: str) -> FacilityTrustRecord | None:
    return next((record for record in facilities() if record.facility_id == facility_id), None)


def desert_rows(
    *,
    capability: str | None = None,
    state: str | None = None,
    pin_code: str | None = None,
) -> list[PinCodeDesert]:
    rows = load_pin_desert()
    if capability is not None:
        rows = [row for row in rows if row.capability == capability]
    if state is not None:
        rows = [row for row in rows if row.state.lower() == state.lower()]
    if pin_code is not None:
        rows = [row for row in rows if row.pin_code == pin_code]
    return rows
