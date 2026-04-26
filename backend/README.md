# Maarg Backend

FastAPI backend for the Truth Layer and Reasoning Layer demo.

## Local Development

Local development defaults to mock Gold fixtures:

```bash
cd backend
uvicorn app.api.server:app --reload --port 8000
```

Use `.env.example` as the environment template. Keep `HACKATHON_MODE=mock`
unless you have Databricks credentials and Gold tables ready.

## Databricks Real Mode

Set these variables in local `.env` or backend deployment secrets:

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

When `HACKATHON_MODE=real`, the catalog queries Databricks SQL Warehouse Gold
tables first. If credentials, the connector, warehouse, or table reads fail,
the backend logs a warning and falls back to `backend/fixtures/mock_gold_*.json`
so the hackathon demo still works.

## Map Data

The map page should use:

- `GET /api/map/facilities?limit=500`
- `GET /api/desert`
- `GET /api/desert/summary`

`/api/map/facilities` reads facility Gold rows directly and does not use the
search endpoint's `top_k` limit.
