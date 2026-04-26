# Databricks Runbook

This folder contains the assets for turning the raw hackathon CSV into deployed
Gold tables used by the FastAPI backend.

## 1. Install And Authenticate

Install the Databricks CLI, then authenticate an explicit profile:

```bash
databricks auth login --profile hackathon
databricks current-user me --profile hackathon
```

## 2. Create The Unity Catalog Volume

Before uploading the CSV, create the catalog, schema, and volume in Databricks
SQL:

```sql
CREATE CATALOG IF NOT EXISTS maarg;
CREATE SCHEMA IF NOT EXISTS maarg.truth_layer;
CREATE VOLUME IF NOT EXISTS maarg.truth_layer.raw_uploads;
```

If your workspace does not allow creating catalogs, ask your instructor/admin
for the approved catalog/schema names and pass them to the upload script with
`--catalog`, `--schema`, and `--volume`.

## 3. Upload The CSV

The raw CSV is intentionally gitignored. Upload it to a Unity Catalog Volume:

```bash
cd backend
python scripts/databricks_upload_csv.py "..\VF_Hackathon_Dataset_India_Large.xlsx - VF_Hackathon_Dataset_India_Larg.csv" --profile hackathon --catalog maarg --schema truth_layer --volume raw_uploads
```

Use `--dry-run` first if you want to inspect the exact CLI command.

## 4. Create Tables

After upload succeeds, run `databricks/sql/create_truth_tables.sql` in a
Databricks SQL editor or a SQL Warehouse. It creates:

- `maarg.truth_layer.bronze_facilities`
- `maarg.truth_layer.gold_facility_trust`
- `maarg.truth_layer.gold_pin_desert`

## 5. Build Gold Tables

Run `databricks/build_gold_tables.py` as a Databricks Python job or notebook in
the repo environment. It reads Bronze rows, maps them into the shared
`FacilityTrustRecord` contract, generates PIN/capability desert rows, and
overwrites both Gold Delta tables.

## 6. Connect The Backend

For deployment, set the backend env vars:

```env
HACKATHON_MODE=real
DATABRICKS_SERVER_HOSTNAME=adb-...azuredatabricks.net
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/...
DATABRICKS_TOKEN=...
DATABRICKS_CATALOG=maarg
DATABRICKS_SCHEMA=truth_layer
DATABRICKS_FACILITY_TRUST_TABLE=gold_facility_trust
DATABRICKS_PIN_DESERT_TABLE=gold_pin_desert
```

Keep the mock fixtures committed. They are the automatic fallback if Databricks
is unavailable during the demo.
