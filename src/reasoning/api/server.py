"""Compatibility shim for the v2 FastAPI entrypoint.

Use `src.api.server:app` for all new v2 code.
"""

from __future__ import annotations

from src.api.server import app

__all__ = ["app"]
