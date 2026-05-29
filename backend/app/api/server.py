"""FastAPI entrypoint for the v2 Reasoning Auditor API.

Optimized with:
- Startup cache warming for sub-millisecond first responses
- Graceful shutdown with cache cleanup
- Health endpoint with cache statistics
- Request timing middleware for performance monitoring
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.adapters.gold_reader import mode
from app.api.routes import contract, demo, desert, facility, map, query, trace
from app.api.schemas import HealthResponse
from app.api.settings import get_settings
from app.portal.api.router import portal_router
from app.reasoning.tracing.mlflow_setup import set_trace_attributes, traced
from app.shared.cache import get_cache_stats, warmup_cache
from app.shared.catalog import load_facility_trust, load_pin_desert, refresh_gold_cache

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events.
    
    Startup:
    - Warm up Gold data cache for instant first responses
    - Log initialization metrics
    
    Shutdown:
    - Clean up resources
    - Log final statistics
    """
    # Startup: Warm up caches
    logger.info("🚀 Maarg API starting up...")
    
    try:
        # Pre-load and cache facility data
        start_time = time.time()
        facilities = load_facility_trust()
        deserts = load_pin_desert()
        warmup_time = time.time() - start_time
        
        logger.info(
            "✅ Cache warmed: %d facilities, %d desert records in %.2fs",
            len(facilities),
            len(deserts),
            warmup_time
        )
        
        # Log cache stats
        cache_stats = get_cache_stats()
        logger.info("📊 Cache stats: %s", cache_stats)
        
    except Exception as e:
        logger.error("❌ Cache warmup failed: %s", e)
    
    yield  # Application runs here
    
    # Shutdown: Cleanup
    logger.info("👋 Maarg API shutting down...")
    final_stats = get_cache_stats()
    logger.info("📊 Final cache stats: %s", final_stats)


app = FastAPI(
    title="Hacknation Reasoning Auditor API",
    version="0.0.2",
    description="FastAPI service for Person B's v2 reasoning layer.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    """Add X-Process-Time header to all responses for performance monitoring."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))  # ms
    return response


app.include_router(query.router)
app.include_router(facility.router)
app.include_router(desert.router)
app.include_router(map.router)
app.include_router(trace.router)
app.include_router(demo.router)
app.include_router(contract.router)
app.include_router(portal_router, prefix="/portal", tags=["Facility Portal"])


@app.get("/", response_model=HealthResponse)
@traced("api.root")
def root() -> HealthResponse:
    return _health_response()


@app.get("/healthz", response_model=HealthResponse)
@traced("api.healthz")
def healthz() -> HealthResponse:
    return _health_response()


@app.get("/api/cache/stats", tags=["cache"])
def cache_stats():
    """Get detailed cache statistics.
    
    Returns hit rates, sizes, and configuration for monitoring.
    """
    return get_cache_stats()


@app.post("/api/cache/refresh", tags=["cache"])
def cache_refresh():
    """Manually refresh the Gold data cache.
    
    Call this after facility data updates to ensure fresh data.
    Returns count of facilities and desert records loaded.
    """
    return refresh_gold_cache()


def _health_response() -> HealthResponse:
    current_mode = mode()
    set_trace_attributes({"mode": current_mode})
    return HealthResponse(ok=True, mode=current_mode)  # type: ignore[arg-type]
