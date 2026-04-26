# ruff: noqa: I001
"""Thin wrapper for Silver-to-Gold trust assembly."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.trust.pipelines.trust_gold import build_facility_trust_record  # noqa: E402


__all__ = ["build_facility_trust_record"]
