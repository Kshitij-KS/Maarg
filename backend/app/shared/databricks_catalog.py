from __future__ import annotations

import json
from collections.abc import Iterable
from typing import Any

from app.api.settings import get_settings
from app.shared.schemas import FacilityTrustRecord, PinCodeDesert


class DatabricksGoldCatalog:
    def __init__(self) -> None:
        self.settings = get_settings()

    def load_facility_trust(self) -> list[dict[str, Any]]:
        return self._query_table(self.settings.databricks_facility_trust_table_full_name)

    def load_pin_desert(self) -> list[dict[str, Any]]:
        return self._query_table(self.settings.databricks_pin_desert_table_full_name)

    def _query_table(self, table_name: str) -> list[dict[str, Any]]:
        if not self.settings.databricks_configured:
            raise RuntimeError(
                "Databricks real mode requires DATABRICKS_SERVER_HOSTNAME, "
                "DATABRICKS_HTTP_PATH, and DATABRICKS_TOKEN."
            )
        try:
            from databricks import sql
        except ImportError as exc:
            raise RuntimeError("databricks-sql-connector is not installed.") from exc
        if not hasattr(sql, "connect"):
            raise RuntimeError(
                "databricks-sql-connector is not installed or is shadowed by "
                "databricks-sdk. Install backend dependencies again so "
                "`from databricks import sql; sql.connect(...)` is available."
            )

        with sql.connect(
            server_hostname=self.settings.databricks_server_hostname,
            http_path=self.settings.databricks_http_path,
            access_token=self.settings.databricks_token,
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT * FROM {table_name}")
                columns = [column[0] for column in cursor.description]
                return [_normalize_row(columns, row) for row in cursor.fetchall()]


def validate_facility_rows(rows: Iterable[dict[str, Any]]) -> list[FacilityTrustRecord]:
    return [FacilityTrustRecord.model_validate(row) for row in rows]


def validate_desert_rows(rows: Iterable[dict[str, Any]]) -> list[PinCodeDesert]:
    return [PinCodeDesert.model_validate(row) for row in rows]


def _normalize_row(columns: list[str], row: Any) -> dict[str, Any]:
    if isinstance(row, dict):
        return {key: _normalize_value(value) for key, value in row.items()}
    if hasattr(row, "asDict"):
        return {key: _normalize_value(value) for key, value in row.asDict().items()}
    return {
        column: _normalize_value(value)
        for column, value in zip(columns, row, strict=False)
    }


def _normalize_value(value: Any) -> Any:
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith(("[", "{")):
            try:
                return json.loads(stripped)
            except json.JSONDecodeError:
                return value
        return value
    if isinstance(value, list):
        return [_normalize_value(item) for item in value]
    if isinstance(value, tuple):
        return [_normalize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_value(item) for key, item in value.items()}
    if hasattr(value, "asDict"):
        return _normalize_value(value.asDict())
    return value
