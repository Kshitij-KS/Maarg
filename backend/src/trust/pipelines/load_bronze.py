from pathlib import Path

import pandas as pd

from src.shared.catalog import FACILITY_CSV_PATH


def load_facility_csv(path: str | Path = FACILITY_CSV_PATH) -> pd.DataFrame:
    """Load the operational CSV dataset for Bronze ingestion."""
    return pd.read_csv(path)
