"""FastAPI entrypoint for the v2 Reasoning Auditor API."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.adapters.gold_reader import mode
from app.api.routes import contract, demo, desert, facility, map, query, trace
from app.api.schemas import HealthResponse
from app.api.settings import get_settings
from app.portal.api.router import portal_router
from app.reasoning.tracing.mlflow_setup import set_trace_attributes, traced

settings = get_settings()

app = FastAPI(
    title="Hacknation Reasoning Auditor API",
    version="0.0.2",
    description="FastAPI service for Person B's v2 reasoning layer.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)

app.include_router(query.router)
app.include_router(facility.router)
app.include_router(desert.router)
app.include_router(map.router)
app.include_router(trace.router)
app.include_router(demo.router)
app.include_router(contract.router)
app.include_router(portal_router, prefix="/portal", tags=["Facility Portal"])


@app.get("/healthz", response_model=HealthResponse)
@traced("api.healthz")
def healthz() -> HealthResponse:
    current_mode = mode()
    set_trace_attributes({"mode": current_mode})
    return HealthResponse(ok=True, mode=current_mode)  # type: ignore[arg-type]
