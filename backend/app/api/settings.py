"""Environment-driven settings for the v2 FastAPI service."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load .env from the project root (backend/) so env vars are available
# whether the server is started with `uvicorn` directly or via a process manager.
load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)


class ApiSettings(BaseModel):
    hackathon_mode: Literal["mock", "real"] = "mock"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    mlflow_tracking_uri: str = "./mlruns"
    databricks_server_hostname: str | None = None
    databricks_http_path: str | None = None
    databricks_token: str | None = None
    databricks_catalog: str = "maarg"
    databricks_schema: str = "truth_layer"
    databricks_facility_trust_table: str = "gold_facility_trust"
    databricks_pin_desert_table: str = "gold_pin_desert"

    @property
    def databricks_configured(self) -> bool:
        return bool(
            self.databricks_server_hostname
            and self.databricks_http_path
            and self.databricks_token
        )

    @property
    def databricks_facility_trust_table_full_name(self) -> str:
        return (
            f"{self.databricks_catalog}."
            f"{self.databricks_schema}."
            f"{self.databricks_facility_trust_table}"
        )

    @property
    def databricks_pin_desert_table_full_name(self) -> str:
        return (
            f"{self.databricks_catalog}."
            f"{self.databricks_schema}."
            f"{self.databricks_pin_desert_table}"
        )


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> ApiSettings:
    origins = _split_csv(os.getenv("API_CORS_ORIGINS"))
    vercel_url = os.getenv("VERCEL_URL")
    if vercel_url:
        origins.append(f"https://{vercel_url}")

    return ApiSettings(
        hackathon_mode=os.getenv("HACKATHON_MODE", "mock").lower(),  # type: ignore[arg-type]
        cors_origins=origins or ["http://localhost:3000", "http://127.0.0.1:3000"],
        mlflow_tracking_uri=os.getenv("MLFLOW_TRACKING_URI", "./mlruns"),
        databricks_server_hostname=(
            os.getenv("DATABRICKS_SERVER_HOSTNAME") or os.getenv("DATABRICKS_HOST")
        ),
        databricks_http_path=os.getenv("DATABRICKS_HTTP_PATH"),
        databricks_token=os.getenv("DATABRICKS_TOKEN"),
        databricks_catalog=os.getenv("DATABRICKS_CATALOG", "maarg"),
        databricks_schema=os.getenv("DATABRICKS_SCHEMA", "truth_layer"),
        databricks_facility_trust_table=os.getenv(
            "DATABRICKS_FACILITY_TRUST_TABLE", "gold_facility_trust"
        ),
        databricks_pin_desert_table=os.getenv(
            "DATABRICKS_PIN_DESERT_TABLE", "gold_pin_desert"
        ),
    )
