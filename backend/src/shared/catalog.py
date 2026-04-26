import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_FACILITY_CSV_FILENAME = (
    "VF_Hackathon_Dataset_India_Large.xlsx - VF_Hackathon_Dataset_India_Larg.csv"
)
FACILITY_CSV_PATH = os.getenv(
    "FACILITY_CSV_PATH",
    str(REPO_ROOT / DEFAULT_FACILITY_CSV_FILENAME),
)

CATALOG = os.getenv("DATABRICKS_CATALOG", "main")
BRONZE_SCHEMA = os.getenv("DATABRICKS_BRONZE_SCHEMA", "bronze")
SILVER_SCHEMA = os.getenv("DATABRICKS_SILVER_SCHEMA", "silver")
GOLD_SCHEMA = os.getenv("DATABRICKS_GOLD_SCHEMA", "gold")

BRONZE_FACILITIES = f"{CATALOG}.{BRONZE_SCHEMA}.facilities"
SILVER_FACILITY_EXTRACTIONS = f"{CATALOG}.{SILVER_SCHEMA}.facility_extractions"
GOLD_FACILITY_TRUST_TABLE = f"{CATALOG}.{GOLD_SCHEMA}.facility_trust"
GOLD_PIN_CODE_DESERT_TABLE = f"{CATALOG}.{GOLD_SCHEMA}.pin_code_desert"

USE_MOCK_GOLD = os.getenv("HACKATHON_MODE", "mock").lower() == "mock"
MOCK_GOLD_FACILITY_TRUST = str(REPO_ROOT / "fixtures" / "mock_gold_facility_trust.json")
MOCK_GOLD_PIN_DESERT = str(REPO_ROOT / "fixtures" / "mock_gold_pin_desert.json")

GOLD_FACILITY_TRUST = MOCK_GOLD_FACILITY_TRUST if USE_MOCK_GOLD else GOLD_FACILITY_TRUST_TABLE
GOLD_PIN_CODE_DESERT = MOCK_GOLD_PIN_DESERT if USE_MOCK_GOLD else GOLD_PIN_CODE_DESERT_TABLE
