# ruff: noqa: I001
"""Thin wrapper for CSV-to-Bronze ingestion.

Databricks table writes are intentionally not implemented until CLI/auth/API details are verified.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.trust.pipelines.load_bronze import load_facility_csv  # noqa: E402


if __name__ == "__main__":
    frame = load_facility_csv()
    print(f"Loaded {len(frame)} facility rows for Bronze ingestion.")
