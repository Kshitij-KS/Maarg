"""Storage helpers for portal-owned tables.

Mock mode stores JSON files under `fixtures/portal`. The interface mirrors the
portal tables so the real Unity Catalog implementation can replace this module
without changing route logic.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

from src.portal.schemas.portal_schemas import (
    ApprovedUpdate,
    FacilityRegistration,
    PortalUser,
    ProofMedia,
    UpdateRequest,
)
from src.shared.catalog import FIXTURES_DIR

PORTAL_FIXTURES_DIR = FIXTURES_DIR / "portal"

T = TypeVar("T", bound=BaseModel)

TABLE_MODELS: dict[str, type[BaseModel]] = {
    "registrations": FacilityRegistration,
    "portal_users": PortalUser,
    "update_requests": UpdateRequest,
    "proof_media": ProofMedia,
    "approved_updates": ApprovedUpdate,
}


def _path(table: str) -> Path:
    if table not in TABLE_MODELS:
        raise ValueError(f"Unknown portal table: {table}")
    return PORTAL_FIXTURES_DIR / f"{table}.json"


def _ensure_table(table: str) -> Path:
    path = _path(table)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("[]\n", encoding="utf-8")
    return path


def _read_payload(table: str) -> list[dict[str, object]]:
    path = _ensure_table(table)
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"Portal table fixture must contain a JSON list: {path}")
    return payload


def _write_payload(table: str, rows: list[dict[str, object]]) -> None:
    path = _ensure_table(table)
    path.write_text(json.dumps(rows, indent=2, default=str) + "\n", encoding="utf-8")


def list_records(table: str, model: type[T]) -> list[T]:
    return [model.model_validate(row) for row in _read_payload(table)]


def append_record(table: str, record: T) -> T:
    rows = _read_payload(table)
    rows.append(record.model_dump(mode="json"))
    _write_payload(table, rows)
    return record


def replace_record(
    table: str,
    model: type[T],
    predicate: Callable[[T], bool],
    updater: Callable[[T], T],
) -> T | None:
    rows = _read_payload(table)
    updated: T | None = None
    next_rows: list[dict[str, object]] = []
    for row in rows:
        record = model.model_validate(row)
        if updated is None and predicate(record):
            record = updater(record)
            updated = record
        next_rows.append(record.model_dump(mode="json"))
    if updated is not None:
        _write_payload(table, next_rows)
    return updated


def registrations() -> list[FacilityRegistration]:
    return list_records("registrations", FacilityRegistration)


def portal_users() -> list[PortalUser]:
    return list_records("portal_users", PortalUser)


def update_requests() -> list[UpdateRequest]:
    return list_records("update_requests", UpdateRequest)


def proof_media() -> list[ProofMedia]:
    return list_records("proof_media", ProofMedia)


def approved_updates() -> list[ApprovedUpdate]:
    return list_records("approved_updates", ApprovedUpdate)


def registration_by_id(registration_id: str) -> FacilityRegistration | None:
    return next((row for row in registrations() if row.registration_id == registration_id), None)


def user_by_email(email: str) -> PortalUser | None:
    return next((row for row in portal_users() if row.email.lower() == email.lower()), None)


def user_by_id(user_id: str) -> PortalUser | None:
    return next((row for row in portal_users() if row.user_id == user_id), None)


def update_request_by_id(request_id: str) -> UpdateRequest | None:
    return next((row for row in update_requests() if row.request_id == request_id), None)


def proof_media_by_id(media_id: str) -> ProofMedia | None:
    return next((row for row in proof_media() if row.media_id == media_id), None)
