# ruff: noqa: I001
"""Thin wrapper for normalized local extraction.

Real Agent Bricks and Silver table writes remain behind adapters until Databricks APIs are verified.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.trust.pipelines.extract_silver import extract_facility_to_silver_row  # noqa: E402


__all__ = ["extract_facility_to_silver_row"]
