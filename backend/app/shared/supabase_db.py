"""
Optional Supabase (PostgREST) client for the Python API.

Set in .env (see .env.example):
  SUPABASE_URL=https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<service_role_secret>

Install: pip install "hacknation-reasoning[supabase]" from backend/

Uses the service role only on the server — never expose it to the browser.
Call get_supabase_client() from routes; returns None if not configured.
"""

from __future__ import annotations

import os
from typing import Any

_client: Any = None


def get_supabase_client() -> Any | None:
    """Return a cached Supabase client, or None if env/dependency missing."""
    global _client
    if _client is not None:
        return _client

    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        return None
    try:
        from supabase import create_client
    except ImportError:
        return None

    _client = create_client(url, key)
    return _client
