"""Environment-driven settings for the v2 FastAPI service."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from pydantic import BaseModel, Field


class ApiSettings(BaseModel):
    hackathon_mode: Literal["mock", "real"] = "mock"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    mlflow_tracking_uri: str = "./mlruns"


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
    )
